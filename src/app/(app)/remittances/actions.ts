"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { assertRole } from "@/lib/auth";
import { round } from "@/lib/format";
import { CURRENCIES, type Currency } from "@/lib/types";

export type RemittancePayload = {
  id?: number;
  customer_id: string;
  office: string;
  shift: string | null;
  currency: Currency;
  remitter: string;
  bank: string;
  bank_address: string;
  bank_phone: string | null;
  exchange_rate: number;
  instructed_amount: number;
  remit_amount: number;
  remit_date: string;
  received_date: string;
  remarks: string | null;
};

function refresh(id?: number) {
  revalidatePath("/remittances");
  if (id) revalidatePath(`/remittances/${id}`);
}

export async function saveRemittance(p: RemittancePayload): Promise<{ id?: number; error?: string }> {
  const profile = await assertRole(["admin", "manager"]);
  const required: [unknown, string][] = [
    [p.customer_id, "Customer"],
    [p.office, "Office"],
    [p.currency, "Currency"],
    [p.remitter?.trim(), "Remitter"],
    [p.bank?.trim(), "Bank"],
    [p.bank_address?.trim(), "Bank address"],
    [p.remit_date, "Remit date"],
    [p.received_date, "Received date"],
  ];
  const missing = required.filter(([v]) => !v).map(([, n]) => n);
  if (missing.length) return { error: `Required: ${missing.join(", ")}` };
  if (!CURRENCIES.includes(p.currency)) return { error: "Invalid currency" };
  const rate = Number(p.exchange_rate);
  const instructed = Number(p.instructed_amount);
  const remit = Number(p.remit_amount);
  if (!(rate > 0) || !(instructed > 0) || !(remit > 0)) return { error: "Exchange rate and amounts must be greater than 0." };
  if (remit > instructed) return { error: "rem_err_amounts" };

  const row = {
    customer_id: p.customer_id,
    office: p.office,
    shift: p.shift || null,
    currency: p.currency,
    remitter: p.remitter.trim(),
    bank: p.bank.trim(),
    bank_address: p.bank_address.trim(),
    bank_phone: p.bank_phone?.trim() || null,
    exchange_rate: rate,
    instructed_amount: round(instructed, p.currency),
    remit_amount: round(remit, p.currency),
    remit_date: p.remit_date,
    received_date: p.received_date,
    remarks: p.remarks?.trim() || null,
  };

  const supabase = await createClient();
  if (p.id) {
    const { error } = await supabase.from("remittances").update(row).eq("id", p.id);
    if (error) return { error: error.message };
    refresh(p.id);
    return { id: p.id };
  }
  const { data, error } = await supabase
    .from("remittances")
    .insert({ ...row, created_by: profile.id })
    .select("id")
    .single();
  if (error) return { error: error.message };
  refresh();
  return { id: data.id as number };
}

export async function deleteRemittance(id: number) {
  await assertRole(["admin"]);
  const supabase = await createClient();
  const { data: docs } = await supabase.from("remittance_documents").select("path").eq("remittance_id", id);
  // Allocations cascade, which also removes the invoice payments they created.
  const { error } = await supabase.from("remittances").delete().eq("id", id);
  if (error) throw new Error(error.message);
  if (docs?.length) await supabase.storage.from("remittance-docs").remove(docs.map((d) => d.path));
  refresh();
  revalidatePath("/invoices");
  redirect("/remittances");
}

export async function deleteDocument(docId: string, remittanceId: number) {
  await assertRole(["admin", "manager"]);
  const supabase = await createClient();
  const { data: doc } = await supabase.from("remittance_documents").select("path").eq("id", docId).single();
  const { error } = await supabase.from("remittance_documents").delete().eq("id", docId);
  if (error) throw new Error(error.message);
  if (doc) await supabase.storage.from("remittance-docs").remove([doc.path]);
  refresh(remittanceId);
}

export async function refreshRemittance(id: number) {
  refresh(id);
}

/**
 * Allocates a remittance to vehicles. When a vehicle is on an issued invoice,
 * a matching payment (converted to the invoice currency) is recorded on it.
 */
export async function allocateRemittance(
  remittanceId: number,
  rows: { vehicle_id: string; amount: number }[]
): Promise<{ error?: string; ok?: boolean }> {
  const profile = await assertRole(["admin", "manager"]);
  const supabase = await createClient();

  const { data: rem } = await supabase
    .from("remittances")
    .select("id, currency, exchange_rate, remaining_amount")
    .eq("id", remittanceId)
    .single();
  if (!rem) return { error: "Remittance not found." };

  const clean = rows
    .map((r) => ({ vehicle_id: r.vehicle_id, amount: round(Number(r.amount) || 0, rem.currency as Currency) }))
    .filter((r) => r.vehicle_id && r.amount > 0);
  if (!clean.length) return { error: "rem_pick_stock" };
  const total = clean.reduce((s, r) => s + r.amount, 0);
  if (total > Number(rem.remaining_amount) + 0.005) return { error: "rem_over_allocated" };

  for (const r of clean) {
    const { data: alloc, error } = await supabase
      .from("remittance_allocations")
      .insert({ remittance_id: remittanceId, vehicle_id: r.vehicle_id, amount: r.amount, created_by: profile.id })
      .select("id")
      .single();
    if (error) return { error: error.code === "23514" || /exceeds/i.test(error.message) ? "rem_over_allocated" : error.message };

    // Find the vehicle's live invoice that can take payments.
    const { data: items } = await supabase
      .from("invoice_items")
      .select("invoice_id, invoices!inner(id, invoice_no, currency, exchange_rate, status)")
      .eq("vehicle_id", r.vehicle_id)
      .in("invoices.status", ["issued", "partially_paid", "paid"])
      .limit(1);
    const inv = items?.[0]?.invoices as unknown as
      | { id: string; invoice_no: string; currency: Currency; exchange_rate: number; status: string }
      | undefined;
    if (inv) {
      const invRate = inv.currency === "JPY" ? 1 : Number(inv.exchange_rate) || 1;
      const remRate = rem.currency === "JPY" ? 1 : Number(rem.exchange_rate) || 1;
      const amount = round((r.amount * remRate) / invRate, inv.currency);
      if (amount > 0) {
        const { error: payErr } = await supabase.from("payments").insert({
          invoice_id: inv.id,
          amount,
          paid_on: new Date().toISOString().slice(0, 10),
          method: "TT",
          reference: `Remittance #${remittanceId}`,
          allocation_id: alloc.id,
          created_by: profile.id,
        });
        if (payErr) return { error: payErr.message };
        revalidatePath(`/invoices/${inv.id}`);
      }
    }
  }

  refresh(remittanceId);
  revalidatePath("/invoices");
  return { ok: true };
}

export async function removeAllocation(allocationId: string, remittanceId: number) {
  await assertRole(["admin", "manager"]);
  const supabase = await createClient();
  const { error } = await supabase.from("remittance_allocations").delete().eq("id", allocationId);
  if (error) throw new Error(error.message);
  refresh(remittanceId);
  revalidatePath("/invoices");
}
