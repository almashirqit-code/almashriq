"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { assertRole, getProfile } from "@/lib/auth";
import { round } from "@/lib/format";
import { CURRENCIES, DOC_LIST_PATH, DOC_TYPES, INCOTERMS, SHIPMENT_TYPES, hasFreight, hasInsurance, type Currency, type DocType, type ExtVehicle, type Invoice, type InvoiceItem, type ShipmentType } from "@/lib/types";

export type InvoicePayload = {
  id?: string;
  /** invoice (default), quotation or auction_deposit. Fixed once the document exists. */
  doc_type?: DocType;
  customer_id: string;
  issue_date: string;
  due_date: string | null;
  /** Quotations only. */
  valid_until?: string | null;
  currency: Currency;
  exchange_rate: number;
  incoterm: string | null;
  port_of_loading: string | null;
  port_of_discharge: string | null;
  consignee_name: string | null;
  consignee_address: string | null;
  consignee_phone: string | null;
  notify_party: string | null;
  notes: string | null;
  discount: number;
  freight: number;
  insurance: number;
  shipment_type: ShipmentType | null;
  tax_rate: number;
  items: { vehicle_id: string | null; description: string; quantity: number; unit_price: number; ext_vehicle?: ExtVehicle | null }[];
  show_consignee?: boolean;
  issue: boolean;
  /** When created from a reservation, that reservation is marked invoiced. */
  reservation_id?: string | null;
};

export async function saveInvoice(p: InvoicePayload): Promise<{ id?: string; error?: string }> {
  const profile = await getProfile();
  const supabase = await createClient();

  if (!p.customer_id) return { error: "Select a customer." };
  if (!CURRENCIES.includes(p.currency)) return { error: "Invalid currency." };
  let docType: DocType = DOC_TYPES.includes(p.doc_type as DocType) ? (p.doc_type as DocType) : "invoice";
  if (p.id) {
    // The type of an existing document never changes.
    const { data: cur } = await supabase.from("invoices").select("doc_type").eq("id", p.id).single();
    if (cur) docType = cur.doc_type as DocType;
  }
  const items = p.items
    .map((it) => ({
      vehicle_id: it.vehicle_id || null,
      ext_vehicle: !it.vehicle_id && it.ext_vehicle && (it.ext_vehicle.make || it.ext_vehicle.model) ? cleanExt(it.ext_vehicle) : null,
      description: String(it.description || "").trim(),
      quantity: Number(it.quantity) || 0,
      unit_price: Number(it.unit_price) || 0,
    }))
    .filter((it) => it.description && it.quantity > 0);
  if (items.length === 0) return { error: "Add at least one item." };

  const lines = items.map((it, i) => ({ ...it, amount: round(it.quantity * it.unit_price, p.currency), sort_order: i }));
  const subtotal = round(lines.reduce((s, l) => s + l.amount, 0), p.currency);
  const discount = round(Math.max(0, Number(p.discount) || 0), p.currency);
  const incoterm = INCOTERMS.includes(p.incoterm ?? "") ? (p.incoterm as string) : "FOB";
  // FOB: no freight. C&F: freight. CIF: freight + insurance.
  const shipmentType = SHIPMENT_TYPES.includes(p.shipment_type as ShipmentType) ? p.shipment_type : null;
  // RoRo: freight is included in each car's price (no separate freight line on the invoice).
  const freight = hasFreight(incoterm) && shipmentType !== "roro" ? round(Math.max(0, Number(p.freight) || 0), p.currency) : 0;
  const insurance = hasInsurance(incoterm) ? round(Math.max(0, Number(p.insurance) || 0), p.currency) : 0;
  // Export sales: no tax on invoices, quotations or deposits.
  const taxRate = 0;
  const tax = round(((subtotal - discount) * taxRate) / 100, p.currency);
  const total = round(subtotal - discount + freight + insurance + tax, p.currency);

  // A vehicle can only be on one live invoice (quotations and auction deposits don't reserve or sell it).
  const vehicleIds = lines.map((l) => l.vehicle_id).filter(Boolean) as string[];
  if (new Set(vehicleIds).size !== vehicleIds.length) return { error: "The same vehicle is listed twice." };
  if (vehicleIds.length && docType === "invoice") {
    let q = supabase
      .from("invoice_items")
      .select("vehicle_id, invoices!inner(id, invoice_no, status, doc_type)")
      .in("vehicle_id", vehicleIds)
      .neq("invoices.status", "cancelled")
      .eq("invoices.doc_type", "invoice");
    if (p.id) q = q.neq("invoice_id", p.id);
    const { data: clash } = await q;
    if (clash?.length) {
      const nos = clash.map((c) => (c.invoices as unknown as { invoice_no: string }).invoice_no);
      return { error: `Vehicle already on invoice ${[...new Set(nos)].join(", ")}` };
    }
  }

  // Container-only ports (e.g. NS Kyushu): RoRo is not allowed.
  if (shipmentType === "roro" && vehicleIds.length) {
    const { data: vs } = await supabase
      .from("vehicles")
      .select("stock_no, auction_houses(ports(name, shipment_modes)), yards(ports(name, shipment_modes))")
      .in("id", vehicleIds);
    type P = { name: string; shipment_modes: string[] } | null;
    for (const v of vs ?? []) {
      const r = v as unknown as { stock_no: string; auction_houses: { ports: P } | null; yards: { ports: P } | null };
      const port = r.auction_houses?.ports ?? r.yards?.ports ?? null;
      if (port && !port.shipment_modes.includes("roro")) {
        return { error: `${r.stock_no} is at ${port.name} — container shipment only. RoRo isn't available.` };
      }
    }
  }

  const header = {
    customer_id: p.customer_id,
    issue_date: p.issue_date || new Date().toISOString().slice(0, 10),
    due_date: docType === "quotation" ? null : p.due_date || null,
    valid_until: docType === "quotation" ? p.valid_until || null : null,
    currency: p.currency,
    exchange_rate: Number(p.exchange_rate) || 1,
    incoterm,
    freight,
    insurance,
    shipment_type: shipmentType,
    port_of_loading: p.port_of_loading || null,
    port_of_discharge: p.port_of_discharge || null,
    consignee_name: p.consignee_name?.trim() || null,
    consignee_address: p.consignee_address?.trim() || null,
    consignee_phone: p.consignee_phone?.trim() || null,
    notify_party: p.notify_party?.trim() || null,
    show_consignee: !!p.show_consignee,
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
    if (existing.status !== "draft") return { error: "Only drafts can be edited." };
    const { error } = await supabase.from("invoices").update(header).eq("id", id);
    if (error) return { error: error.message };
    const { error: delErr } = await supabase.from("invoice_items").delete().eq("invoice_id", id);
    if (delErr) return { error: delErr.message };
  } else {
    const { data: no, error: noErr } = await supabase.rpc("next_document_number", { p_kind: docType });
    if (noErr) return { error: noErr.message };
    const { data: row, error } = await supabase
      .from("invoices")
      .insert({ ...header, doc_type: docType, invoice_no: no as string, status: "draft", created_by: profile.id })
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

  if (p.reservation_id) {
    await supabase
      .from("reservations")
      .update({ status: "invoiced", invoice_id: id })
      .eq("id", p.reservation_id)
      .eq("status", "active");
    revalidatePath("/admin/reservations");
    revalidatePath(`/admin/reservations/${p.reservation_id}`);
  }

  revalidatePath(DOC_LIST_PATH[docType]);
  revalidatePath("/admin/stock");
  revalidateTag("public-site"); // invoice status flips the public SOLD/RESERVED tag
  revalidatePath("/admin");
  return { id };
}

/**
 * Quotation → invoice: copies the customer, terms and items into a new draft invoice
 * (its own AM-… number) and opens it for review. A quotation converts once.
 */
export async function convertQuotation(id: string): Promise<{ id?: string; error?: string }> {
  await getProfile();
  const supabase = await createClient();
  const [{ data: q }, { data: items }, { data: done }] = await Promise.all([
    supabase.from("invoices").select("*").eq("id", id).single(),
    supabase.from("invoice_items").select("*").eq("invoice_id", id).order("sort_order"),
    supabase.from("invoices").select("id, invoice_no").eq("converted_from", id).neq("status", "cancelled").limit(1),
  ]);
  const quote = q as Invoice | null;
  if (!quote || quote.doc_type !== "quotation") return { error: "Quotation not found." };
  if (quote.status === "cancelled") return { error: "This quotation is cancelled." };
  if (done?.length) return { error: `Already converted to invoice ${done[0].invoice_no}.` };

  const res = await saveInvoice({
    doc_type: "invoice",
    customer_id: quote.customer_id,
    issue_date: new Date().toISOString().slice(0, 10),
    due_date: new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 10),
    currency: quote.currency,
    exchange_rate: Number(quote.exchange_rate),
    incoterm: quote.incoterm,
    port_of_loading: quote.port_of_loading,
    port_of_discharge: quote.port_of_discharge,
    consignee_name: quote.consignee_name,
    consignee_address: quote.consignee_address,
    consignee_phone: quote.consignee_phone,
    notify_party: quote.notify_party,
    show_consignee: !!quote.show_consignee,
    notes: quote.notes,
    discount: Number(quote.discount),
    freight: Number(quote.freight ?? 0),
    insurance: Number(quote.insurance ?? 0),
    shipment_type: quote.shipment_type ?? null,
    tax_rate: Number(quote.tax_rate),
    items: ((items ?? []) as InvoiceItem[]).map((l) => ({
      vehicle_id: l.vehicle_id,
      description: l.description,
      quantity: Number(l.quantity),
      unit_price: Number(l.unit_price),
      ext_vehicle: l.ext_vehicle ?? null,
    })),
    issue: false,
  });
  if (res.error || !res.id) return { error: res.error ?? "Could not create the invoice." };
  await supabase.from("invoices").update({ converted_from: id }).eq("id", res.id);
  revalidatePath(`/admin/invoices/${id}`);
  revalidatePath(DOC_LIST_PATH.quotation);
  return { id: res.id };
}

function cleanExt(e: ExtVehicle): ExtVehicle {
  const out: Record<string, string> = {};
  for (const k of ["make", "model", "grade", "year", "chassis_no", "engine_cc", "color"] as const) {
    const v = String(e[k] ?? "").trim().slice(0, 80);
    if (v) out[k] = v;
  }
  return { make: out.make ?? "", model: out.model ?? "", ...out } as ExtVehicle;
}

/** "Convert to invoice" button: creates the draft invoice and opens it for review. */
export async function convertQuotationAndOpen(id: string) {
  const res = await convertQuotation(id);
  if (res.error || !res.id) throw new Error(res.error ?? "Could not convert the quotation.");
  redirect(`/admin/invoices/${res.id}/edit`);
}

export async function issueInvoice(id: string) {
  await getProfile();
  const supabase = await createClient();
  const { error } = await supabase.from("invoices").update({ status: "issued" }).eq("id", id).eq("status", "draft");
  if (error) throw new Error(error.message);
  revalidatePath(`/admin/invoices/${id}`);
  revalidatePath("/admin/invoices");
  revalidatePath("/admin/stock");
  revalidateTag("public-site"); // invoice status flips the public SOLD/RESERVED tag
}

export async function cancelInvoice(id: string) {
  await assertRole(["admin", "manager"]);
  const supabase = await createClient();
  const { error } = await supabase.from("invoices").update({ status: "cancelled" }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath(`/admin/invoices/${id}`);
  revalidatePath("/admin/invoices");
  revalidatePath("/admin/stock");
  revalidateTag("public-site"); // invoice status flips the public SOLD/RESERVED tag
}

export async function deleteInvoice(id: string) {
  await assertRole(["admin", "manager"]);
  const supabase = await createClient();
  const { data: inv } = await supabase.from("invoices").select("status, doc_type").eq("id", id).single();
  if (inv && !["draft", "cancelled"].includes(inv.status)) {
    throw new Error("Only draft or cancelled documents can be deleted. Cancel it first.");
  }
  // Delete items first so vehicle status triggers run.
  await supabase.from("invoice_items").delete().eq("invoice_id", id);
  const { error } = await supabase.from("invoices").delete().eq("id", id);
  if (error) throw new Error(error.message);
  const list = DOC_LIST_PATH[(inv?.doc_type as DocType) ?? "invoice"] ?? "/admin/invoices";
  revalidatePath(list);
  revalidatePath("/admin/stock");
  revalidateTag("public-site"); // invoice status flips the public SOLD/RESERVED tag
  redirect(list);
}

export async function addPayment(
  invoiceId: string,
  _prev: { error?: string; ok?: boolean },
  formData: FormData
): Promise<{ error?: string; ok?: boolean }> {
  const profile = await getProfile();
  const amount = Number(formData.get("amount"));
  if (!amount || amount <= 0) return { error: "Enter an amount." };
  const supabase = await createClient();
  const { data: inv } = await supabase.from("invoices").select("status, doc_type").eq("id", invoiceId).single();
  if (inv?.doc_type === "quotation") return { error: "A quotation cannot take payments. Convert it to an invoice first." };
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
  revalidatePath(`/admin/invoices/${invoiceId}`);
  revalidatePath("/admin/invoices");
  return { ok: true };
}

export async function deletePayment(paymentId: string, invoiceId: string) {
  await assertRole(["admin", "manager"]);
  const supabase = await createClient();
  const { error } = await supabase.from("payments").delete().eq("id", paymentId);
  if (error) throw new Error(error.message);
  revalidatePath(`/admin/invoices/${invoiceId}`);
  revalidatePath("/admin/invoices");
}
