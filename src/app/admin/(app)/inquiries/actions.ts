"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { assertRole, getProfile } from "@/lib/auth";

import { INQUIRY_STATUSES, type InquiryStatus } from "./status";

function refresh(id?: string) {
  revalidatePath("/admin/inquiries");
  if (id) revalidatePath(`/admin/inquiries/${id}`);
  revalidatePath("/admin", "layout");
}

export async function updateInquiry(
  id: string,
  patch: { status?: InquiryStatus; assigned_to?: string | null; notes?: string | null }
): Promise<{ error?: string; ok?: boolean }> {
  const me = await getProfile();
  const row: Record<string, unknown> = {};
  if (patch.status && INQUIRY_STATUSES.includes(patch.status)) row.status = patch.status;
  if ("notes" in patch) row.notes = patch.notes?.trim() || null;
  if ("assigned_to" in patch) {
    if (me.role === "sales") return { error: "Only managers can assign inquiries." };
    row.assigned_to = patch.assigned_to || null;
    // Assigning a brand-new inquiry moves it on from "new" only when staff actually contact the customer.
  }
  const supabase = await createClient();
  const { error } = await supabase.from("inquiries").update(row).eq("id", id);
  if (error) return { error: error.message };
  refresh(id);
  return { ok: true };
}

/** Creates (or links) the customer for an inquiry and opens it. */
export async function inquiryToCustomer(id: string) {
  const me = await getProfile();
  const supabase = await createClient();
  const { data: q } = await supabase.from("inquiries").select("*").eq("id", id).single();
  if (!q) throw new Error("Inquiry not found");
  if (q.customer_id) redirect(`/admin/customers/${q.customer_id}`);

  const owner = me.role === "sales" ? me.id : (q.assigned_to as string | null) ?? me.id;
  const { data: created, error } = await supabase
    .from("customers")
    .insert({
      name: q.name,
      email: q.email,
      phone: q.phone,
      whatsapp: q.phone,
      country: q.country,
      port: q.port,
      notes: q.message ? `From website inquiry #${q.inquiry_no}: ${q.message}`.slice(0, 2000) : null,
      created_by: me.id,
      assigned_to: owner,
    })
    .select("id")
    .single();
  if (error) {
    if (error.code === "23505") throw new Error("A customer with this email or phone already exists. Search for them in Customers and link them manually.");
    throw new Error(error.message);
  }
  await supabase.from("inquiries").update({ customer_id: created.id, status: q.status === "new" ? "contacted" : q.status }).eq("id", id);
  refresh(id);
  revalidatePath("/admin/customers");
  redirect(`/admin/customers/${created.id}`);
}

export async function deleteInquiry(id: string) {
  await assertRole(["admin", "manager"]);
  const supabase = await createClient();
  const { error } = await supabase.from("inquiries").delete().eq("id", id);
  if (error) throw new Error(error.message);
  refresh();
  redirect("/admin/inquiries");
}
