"use server";

import { revalidatePath } from "next/cache";
import { assertRole } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { ROLES, type Role } from "@/lib/types";

export type FormState = { error?: string; ok?: boolean };

export async function createUser(_prev: FormState, formData: FormData): Promise<FormState> {
  await assertRole(["admin"]);
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");
  const full_name = String(formData.get("full_name") || "").trim();
  const role = String(formData.get("role") || "sales") as Role;
  const office = String(formData.get("office") || "").trim() || null;
  const shift = String(formData.get("shift") || "").trim() || null;
  if (!email || password.length < 8) return { error: "Email and a password of at least 8 characters are required." };
  if (!ROLES.includes(role)) return { error: "Invalid role." };

  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name },
  });
  if (error) return { error: error.message };

  // The signup trigger creates the profile as 'sales'; apply the chosen role.
  const { error: pErr } = await admin.from("profiles").update({ role, full_name: full_name || null, office, shift }).eq("id", data.user.id);
  if (pErr) return { error: pErr.message };

  revalidatePath("/admin/users");
  return { ok: true };
}

export async function setRole(userId: string, role: Role) {
  const me = await assertRole(["admin"]);
  if (!ROLES.includes(role)) throw new Error("Invalid role");
  if (userId === me.id && role !== "admin") throw new Error("You cannot remove your own admin role.");
  const admin = createAdminClient();
  const { error } = await admin.from("profiles").update({ role }).eq("id", userId);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/users");
}

/** Office and shift decide which customers, reservations and TTs a manager or sales agent works with. */
export async function setOfficeShift(userId: string, office: string | null, shift: string | null) {
  await assertRole(["admin"]);
  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ office: office?.trim() || null, shift: shift?.trim() || null })
    .eq("id", userId);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/users");
  revalidatePath("/admin", "layout");
}

export async function setActive(userId: string, active: boolean) {
  const me = await assertRole(["admin"]);
  if (userId === me.id) throw new Error("You cannot disable your own account.");
  const admin = createAdminClient();
  const { error } = await admin.from("profiles").update({ active }).eq("id", userId);
  if (error) throw new Error(error.message);
  // Block sign-in at the auth level too.
  await admin.auth.admin.updateUserById(userId, { ban_duration: active ? "none" : "876000h" });
  revalidatePath("/admin/users");
}

export async function resetPassword(userId: string, password: string) {
  await assertRole(["admin"]);
  if (password.length < 8) throw new Error("Password must be at least 8 characters.");
  const admin = createAdminClient();
  const { error } = await admin.auth.admin.updateUserById(userId, { password });
  if (error) throw new Error(error.message);
}
