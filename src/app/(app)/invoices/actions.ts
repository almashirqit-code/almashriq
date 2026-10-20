"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { assertRole, getProfile } from "@/lib/auth";
import { round } from "@/lib/format";
import { CURRENCIES, type Currency } from "@/lib/types";

export type InvoicePayload = {
  id?: string;
  customer_id: string;
  issue_date: string;
  due_date: string | null;
  currency: Currency;
  exchange_rate: number;
  incoterm: string | null;
  port_of_loading: string | null;
  port_of_discharge: string | null;
  notes: string | null;
  discount: number;
  tax_rate: number;
  items: { vehicle_id: string | null; description: string; quantity: number; unit_price: number }[];
  issue: boolean;
};

export async function saveInvoice(p: InvoicePayload): Promise<{ id?: string; error?: string }> {
  const profile = await getProfile();
  const supabase = await createClient();

  if (!p.customer_id) return { error: "Select a customer." };
  if (!CURRENCIES.includes(p.currency)) return { error: "Invalid currency." };
  const items = p.items
    .map((it) => ({
      vehicle_id: it.vehicle_id || null,
      description: String(it.description || "").trim(),
      quantity: Number(it.quantity) || 0,
      unit_price: Number(it.unit_price) || 0,
    }))
    .filter((it) => it.description && it.quantity > 0);
  if (items.length === 0) return { error: "Add at least one item." };

  const lines = items.map((it, i) => ({ ...it, amount: round(it.quantity * it.unit_price, p.currency), sort_order: i }));
  const subtotal = round(lines.reduce((s, l) => s + l.amount, 0), p.currency);
  const discount = round(Math.max(0, Number(p.discount) || 0), p.currency);
  const taxRate = Math.max(0, Number(p.tax_rate) || 0);
  const tax = round(((subtotal - discount) * taxRate) / 100, p.currency);
  const total = round(subtotal - discount + tax, p.currency);

  // A vehicle can only be on one live invoice.
  const vehicleIds = lines.map((l) => l.vehicle_id).filter(Boolean) as string[];
  if (new Set(vehicleIds).size !== vehicleIds.length) return { error: "The same vehicle is listed twice." };
  if (vehicleIds.length) {
    let q = supabase
      .from("invoice_items")
      .select("vehicle_id, invoices!inner(id, invoice_no, status)")
      .in("vehicle_id", vehicleIds)
      .neq("invoices.status", "cancelled");
    if (p.id) q = q.neq("invoice_id", p.id);
    const { data: clash } = await q;
    if (clash?.length) {
      const nos = clash.map((c) => (c.invoices as unknown as { invoice_no: string }).invoice_no);
      return { error: `Vehicle already on invoice ${[...new Set(nos)].join(", ")}` };
    }
  }

  const header = {
    customer_id: p.customer_id,
    issue_date: p.issue_date || new Date().toISOString().slice(0, 10),
    due_date: p.due_date || null,
    currency: p.currency,
    exchange_rate: Number(p.exchange_rate) || 1,
    incoterm: p.incoterm || null,
    port_of_loading: p.port_of_loading || null,
    port_of_discharge: p.port_of_discharge || null,
    notes: p.notes || null,
    subtotal,
    discount,
    tax_rate: taxRate,
    tax,
    total,
  };

  let id = p.id;
  if (id) {
    const { data: existing } = await supabase.from("invoices").select("status").eq("id", id).single();
    if (!existing) return { error: "Invoice not found." };
    if (existing.status !== "draft") return { error: "Only draft invoices can be edited." };
    const { error } = await supabase.from("invoices").update(header).eq("id", id);
    if (error) return { error: error.message };
    const { error: delErr } = await supabase.from("invoice_items").delete().eq("invoice_id", id);
    if (delErr) return { error: delErr.message };
  } else {
    const { data: no, error: noErr } = await supabase.rpc("next_invoice_number");
    if (noErr) return { error: noErr.message };
    const { data: row, error } = await supabase
      .from("invoices")
      .insert({ ...header, invoice_no: no as string, status: "draft", created_by: profile.id })
      .select("id")
      .single();
    if (error) return { error: error.message };
    id = row.id as string;
  }

  const { error: itemsErr } = await supabase.from("invoice_items").insert(lines.map((l) => ({ ...l, invoice_id: id })));
  if (itemsErr) return { error: itemsErr.message };

  if (p.issue) {
    const { error } = await supabase.from("invoices").update({ status: "issued" }).eq("id", id);
    if (error) return { error: error.message };
  }

  revalidatePath("/invoices");
  revalidatePath("/stock");
  revalidatePath("/");
  return { id };
}

export async function issueInvoice(id: string) {
  await getProfile();
  const supabase = await createClient();
  const { error } = await supabase.from("invoices").update({ status: "issued" }).eq("id", id).eq("status", "draft");
  if (error) throw new Error(error.message);
  revalidatePath(`/invoices/${id}`);
  revalidatePath("/invoices");
  revalidatePath("/stock");
}

export async function cancelInvoice(id: string) {
  await assertRole(["admin", "manager"]);
  const supabase = await createClient();
  const { error } = await supabase.from("invoices").update({ status: "cancelled" }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath(`/invoices/${id}`);
  revalidatePath("/invoices");
  revalidatePath("/stock");
}

export async function deleteInvoice(id: string) {
  await assertRole(["admin", "manager"]);
  const supabase = await createClient();
  const { data: inv } = await supabase.from("invoices").select("status").eq("id", id).single();
  if (inv && !["draft", "cancelled"].includes(inv.status)) {
    throw new Error("Only draft or cancelled invoices can be deleted. Cancel it first.");
  }
  // Delete items first so vehicle status triggers run.
  await supabase.from("invoice_items").delete().eq("invoice_id", id);
  const { error } = await supabase.from("invoices").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/invoices");
  revalidatePath("/stock");
  redirect("/invoices");
}

export async function addPayment(invoiceId: string, _prev: { error?: string; ok?: boolean }, formData: FormData) {
  const profile = await getProfile();
  const amount = Number(formData.get("amount"));
  if (!amount || amount <= 0) return { error: "Enter an amount." };
  const supabase = await createClient();
  const { data: inv } = await supabase.from("invoices").select("status").eq("id", invoiceId).single();
  if (!inv || inv.status === "draft" || inv.status === "cancelled") return { error: "Issue the invoice before recording payments." };
  const { error } = await supabase.from("payments").insert({
    invoice_id: invoiceId,
    amount,
    paid_on: String(formData.get("paid_on") || new Date().toISOString().slice(0, 10)),
    method: String(formData.get("method") || "") || null,
    reference: String(formData.get("reference") || "") || null,
    created_by: profile.id,
  });
  if (error) return { error: error.message };
  revalidatePath(`/invoices/${invoiceId}`);
  revalidatePath("/invoices");
  return { ok: true };
}

export async function deletePayment(paymentId: string, invoiceId: string) {
  await assertRole(["admin", "manager"]);
  const supabase = await createClient();
  const { error } = await supabase.from("payments").delete().eq("id", paymentId);
  if (error) throw new Error(error.message);
  revalidatePath(`/invoices/${invoiceId}`);
  revalidatePath("/invoices");
}
