"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { assertRole, getProfile } from "@/lib/auth";

/** `error` is either a dictionary key (translated by the form) or a raw message. */
export type FormState = { error?: string; ok?: boolean };

const FIELDS = [
  "name",
  "company",
  "country",
  "port",
  "email",
  "phone",
  "whatsapp",
  "address",
  "notes",
  "consignee_name",
  "consignee_address",
  "consignee_phone",
  "consignee_email",
  "notify_party",
] as const;

const digits = (s: string) => s.replace(/\D/g, "");

function read(formData: FormData) {
  const data: Record<string, string | null> = {};
  for (const f of FIELDS) {
    const v = String(formData.get(f) ?? "").trim();
    data[f] = v === "" ? null : v;
  }
  const assigned = String(formData.get("assigned_to") ?? "").trim();
  data.assigned_to = /^[0-9a-f-]{36}$/i.test(assigned) ? assigned : null;
  if (data.email) data.email = data.email.toLowerCase();
  if (data.consignee_email) data.consignee_email = data.consignee_email.toLowerCase();
  // A phone with no digits at all is treated as empty.
  if (data.phone && !digits(data.phone)) data.phone = null;
  return data;
}

/** Validates the contact rules and checks for duplicates before hitting the unique indexes. */
async function validate(data: Record<string, string | null>, selfId?: string): Promise<string | null> {
  if (!data.name) return "Name is required";
  if (!data.email && !data.phone) return "c_contact_required";

  const supabase = await createClient();
  if (data.email) {
    let q = supabase.from("customers").select("id").ilike("email", data.email.replace(/[%_]/g, "\\$&")).limit(1);
    if (selfId) q = q.neq("id", selfId);
    const { data: hit } = await q;
    if (hit?.length) return "c_email_taken";
  }
  if (data.phone) {
    // Compare on digits only, matching the database index.
    const want = digits(data.phone);
    const tail = want.slice(-7);
    let q = supabase.from("customers").select("id, phone").ilike("phone", `%${tail.split("").join("%")}%`).limit(50);
    if (selfId) q = q.neq("id", selfId);
    const { data: hits } = await q;
    if (hits?.some((h) => h.phone && digits(h.phone) === want)) return "c_phone_taken";
  }
  return null;
}

function mapDbError(error: { code?: string; message: string }) {
  if (error.code === "23505") {
    if (error.message.includes("customers_email_uniq")) return "c_email_taken";
    if (error.message.includes("customers_phone_uniq")) return "c_phone_taken";
  }
  if (error.code === "23514" && error.message.includes("customers_contact_required")) return "c_contact_required";
  return error.message;
}

export async function createCustomer(_prev: FormState, formData: FormData): Promise<FormState> {
  const profile = await getProfile();
  const data = read(formData);
  // Sales agents always own the customers they register.
  if (profile.role === "sales") data.assigned_to = profile.id;
  const invalid = await validate(data);
  if (invalid) return { error: invalid };

  const supabase = await createClient();
  const { data: row, error } = await supabase
    .from("customers")
    .insert({ ...data, created_by: profile.id })
    .select("id")
    .single();
  if (error) return { error: mapDbError(error) };
  revalidatePath("/admin/customers");
  const back = String(formData.get("return_to") ?? "");
  redirect(back.startsWith("/admin/invoices/new") ? `/admin/invoices/new?customer=${row.id}` : `/admin/customers/${row.id}`);
}

export async function updateCustomer(id: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const profile = await getProfile();
  const data = read(formData);
  if (profile.role === "sales") data.assigned_to = profile.id;
  const invalid = await validate(data, id);
  if (invalid) return { error: invalid };

  const supabase = await createClient();
  const { error } = await supabase.from("customers").update(data).eq("id", id);
  if (error) return { error: mapDbError(error) };
  revalidatePath("/admin/customers");
  revalidatePath(`/admin/customers/${id}`);
  // Back to the customer page after saving from the edit screen.
  redirect(`/admin/customers/${id}`);
}

export async function deleteCustomer(id: string) {
  await assertRole(["admin", "manager"]);
  const supabase = await createClient();
  const { error } = await supabase.from("customers").delete().eq("id", id);
  if (error) throw new Error(error.code === "23503" ? "This customer has invoices and cannot be deleted." : error.message);
  revalidatePath("/admin/customers");
  redirect("/admin/customers");
}
