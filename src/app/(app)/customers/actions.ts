"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { assertRole, getProfile } from "@/lib/auth";

export type FormState = { error?: string; ok?: boolean };

const FIELDS = ["name", "company", "country", "port", "email", "phone", "whatsapp", "address", "notes"] as const;

function read(formData: FormData) {
  const data: Record<string, string | null> = {};
  for (const f of FIELDS) {
    const v = String(formData.get(f) ?? "").trim();
    data[f] = v === "" ? null : v;
  }
  return data;
}

export async function createCustomer(_prev: FormState, formData: FormData): Promise<FormState> {
  const profile = await getProfile();
  const data = read(formData);
  if (!data.name) return { error: "Name is required" };
  const supabase = await createClient();
  const { data: row, error } = await supabase
    .from("customers")
    .insert({ ...data, created_by: profile.id })
    .select("id")
    .single();
  if (error) return { error: error.message };
  revalidatePath("/customers");
  const back = String(formData.get("return_to") ?? "");
  redirect(back.startsWith("/invoices/new") ? `/invoices/new?customer=${row.id}` : `/customers/${row.id}`);
}

export async function updateCustomer(id: string, _prev: FormState, formData: FormData): Promise<FormState> {
  await getProfile();
  const data = read(formData);
  if (!data.name) return { error: "Name is required" };
  const supabase = await createClient();
  const { error } = await supabase.from("customers").update(data).eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/customers");
  revalidatePath(`/customers/${id}`);
  return { ok: true };
}

export async function deleteCustomer(id: string) {
  await assertRole(["admin", "manager"]);
  const supabase = await createClient();
  const { error } = await supabase.from("customers").delete().eq("id", id);
  if (error) throw new Error(error.code === "23503" ? "This customer has invoices and cannot be deleted." : error.message);
  revalidatePath("/customers");
  redirect("/customers");
}
