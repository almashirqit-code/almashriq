"use server";

import { revalidatePath } from "next/cache";
import { assertRole } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { ROLES, type Role } from "@/lib/types";
import { validWhatsapp } from "./contact";

const WHATSAPP_REQUIRED = "A WhatsApp number with country code is required (e.g. +81 90 1234 5678).";

export type FormState = { error?: string; ok?: boolean };

export async function createUser(_prev: FormState, formData: FormData): Promise<FormState> {
  await assertRole(["admin"]);
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");
  const full_name = String(formData.get("full_name") || "").trim();
  const role = String(formData.get("role") || "sales") as Role;
  const office = String(formData.get("office") || "").trim() || null;
  const shift = String(formData.get("shift") || "").trim() || null;
  const phone = String(formData.get("phone") || "").trim().slice(0, 40) || null;
  const whatsapp = String(formData.get("whatsapp") || "").trim().slice(0, 40);
  if (!email || password.length < 8) return { error: "Email and a password of at least 8 characters are required." };
  if (!validWhatsapp(whatsapp)) return { error: WHATSAPP_REQUIRED };
  if (!ROLES.includes(role)) return { error: "Invalid role." };

  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name },
    // Marks this as a staff account so the signup trigger creates a profile (migration 0025).
    // app_metadata can only be set with the service-role key, never by a public sign-up.
    app_metadata: { staff: true },
  });
  if (error) return { error: error.message };

  // The signup trigger creates the profile as 'sales'; apply the chosen role.
  const { error: pErr } = await admin.from("profiles").update({ role, full_name: full_name || null, office, shift, phone, whatsapp }).eq("id", data.user.id);
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

/** Work phone / WhatsApp: customers can check a number on the website's "Verify an agent" page. */
export async function setStaffContact(userId: string, phone: string, whatsapp: string) {
  await assertRole(["admin"]);
  if (!validWhatsapp(whatsapp)) throw new Error(WHATSAPP_REQUIRED);
  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ phone: phone.trim().slice(0, 40) || null, whatsapp: whatsapp.trim().slice(0, 40) })
    .eq("id", userId);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/users");
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
