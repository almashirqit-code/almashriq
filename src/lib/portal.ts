import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Currency, Customer, Invoice, Settings } from "./types";
import type { InvoiceItemWithVehicle } from "@/components/invoice-document";

/**
 * Customer portal data. Every call runs as the signed-in customer through the portal_* functions
 * (migration 0027), which only return that customer's own rows and customer-safe columns.
 * Per-user data: never cached across requests (React cache() only dedupes within one render).
 */

export type PortalMe = {
  status: "pending" | "active" | "rejected";
  full_name: string | null;
  email: string;
  customer: { customer_no: number; name: string; company: string | null; country: string | null; port: string | null } | null;
  agent: { name: string; email: string } | null;
};

export const getPortalMe = cache(async (): Promise<PortalMe | null> => {
  const supabase = await createClient();
  const { data } = await supabase.rpc("portal_me");
  return (data ?? null) as PortalMe | null;
});

/** For the account data pages: only active (linked) accounts; others go back to the account home. */
export async function requireActivePortal(): Promise<PortalMe> {
  const me = await getPortalMe();
  if (!me || me.status !== "active") redirect("/account");
  return me;
}

export type PortalInvoiceRow = {
  id: string;
  invoice_no: string;
  doc_type: "invoice" | "quotation" | "auction_deposit";
  issue_date: string;
  due_date: string | null;
  valid_until: string | null;
  currency: Currency;
  total: number;
  amount_paid: number;
  status: "issued" | "partially_paid" | "paid" | "cancelled";
  incoterm: string | null;
  port_of_discharge: string | null;
  units: number;
};

export type PortalTT = {
  id: number;
  remit_date: string | null;
  received_date: string | null;
  currency: Currency;
  remitter: string | null;
  bank: string | null;
  instructed_amount: number | null;
  remit_amount: number | null;
  bank_charges: number | null;
  allocated_amount: number | null;
  remaining_amount: number | null;
  status: string;
  allocations: { stock_no: string; make: string; model: string; amount: number }[];
};

export type PortalReservation = {
  id: string;
  reservation_no: number;
  status: string;
  price_term: string | null;
  shipment_type: string | null;
  port_of_loading: string | null;
  port_of_discharge: string | null;
  currency: Currency;
  sold_price: number | null;
  freight: number | null;
  insurance: number | null;
  reserved_until: string | null;
  created_at: string;
  stock_no: string | null;
  make: string | null;
  model: string | null;
  year: number | null;
  cover: string | null;
};

export type PortalVehicle = {
  id: string;
  stock_no: string;
  make: string;
  model: string;
  grade: string | null;
  year: number | null;
  chassis_no: string | null;
  color: string | null;
  engine_cc: number | null;
  status: string;
  shipping_status: "not_booked" | "booked" | "shipped" | "delivered" | null;
  cover: string | null;
  ship_company: string | null;
  vessel_name: string | null;
  voyage_no: string | null;
  etd: string | null;
  eta: string | null;
  port_of_loading: string | null;
  place_of_delivery: string | null;
  bl_no: string | null;
  bl_date: string | null;
  track_url: string | null;
  shipment_type: string | null;
  container_no: string | null;
  courier_company: string | null;
  courier_tracking: string | null;
  courier_date: string | null;
  doc_count: number;
};

export type PortalDocument = {
  id: string;
  vehicle_id: string;
  stock_no: string;
  kind: string;
  file_name: string;
  mime_type: string | null;
  size_bytes: number | null;
  created_at: string;
};

export type StatementRow = {
  currency: Currency;
  entry_date: string;
  kind: "invoice" | "payment";
  ref: string;
  detail: string;
  debit: number;
  credit: number;
  balance: number;
};

async function rows<T>(fn: string): Promise<T[]> {
  const supabase = await createClient();
  const { data } = await supabase.rpc(fn);
  return (data ?? []) as T[];
}

export const getPortalInvoices = cache(() => rows<PortalInvoiceRow>("portal_invoices"));
export const getPortalTTs = cache(() => rows<PortalTT>("portal_remittances"));
export const getPortalReservations = cache(() => rows<PortalReservation>("portal_reservations"));
export const getPortalVehicles = cache(() => rows<PortalVehicle>("portal_vehicles"));
export const getPortalDocuments = cache(() => rows<PortalDocument>("portal_documents"));
export const getPortalStatement = cache(() => rows<StatementRow>("portal_statement"));

export type PortalInquiry = { inquiry_no: number; created_at: string; stock_no: string | null; message: string | null; status: string; agent: string | null };
/** The signed-in login's own inquiries (pending accounts too). */
export const getPortalInquiries = cache(() => rows<PortalInquiry>("portal_inquiries"));

export const INQUIRY_STATUS: Record<string, { label: string; cls: string }> = {
  new: { label: "Sent", cls: "bg-amber-100 text-amber-900" },
  contacted: { label: "Agent replied", cls: "bg-sky-100 text-sky-900" },
  quoted: { label: "Quoted", cls: "bg-violet-100 text-violet-900" },
  won: { label: "Done", cls: "bg-emerald-100 text-emerald-900" },
  lost: { label: "Closed", cls: "bg-slate-200 text-slate-700" },
  spam: { label: "Closed", cls: "bg-slate-200 text-slate-700" },
};

/** One of the customer's invoices, shaped for InvoiceDocument (null if it isn't theirs, or is a draft). */
export const getPortalInvoiceDoc = cache(async (id: string) => {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const supabase = await createClient();
  const { data } = await supabase.rpc("portal_invoice", { p_id: id });
  if (!data) return null;
  return data as { invoice: Invoice; items: InvoiceItemWithVehicle[]; customer: Customer | null };
});

/**
 * Letterhead, bank details and terms printed on invoices. Customers have no access to the settings
 * table, so the server reads only these columns with the service key (the same text is on every invoice).
 */
export const getInvoiceLetterhead = cache(async (): Promise<Settings | null> => {
  const { data } = await createAdminClient()
    .from("settings")
    .select("company_name, company_name_ja, logo_url, stamp_url, phone, fax, mobile, address, email, website, bank_details, intermediary_bank, invoice_terms")
    .single();
  return (data ?? null) as Settings | null;
});

/** Closing balance per currency (last running balance of each currency's ledger). */
export function closingBalances(statement: StatementRow[]) {
  const out = new Map<Currency, number>();
  for (const r of statement) out.set(r.currency, Number(r.balance));
  return out;
}

/** The statement split into one ledger per currency. */
export function ledgers(statement: StatementRow[]) {
  const out = new Map<Currency, StatementRow[]>();
  for (const r of statement) out.set(r.currency, [...(out.get(r.currency) ?? []), r]);
  return out;
}

export const DOC_TYPE_LABEL: Record<PortalInvoiceRow["doc_type"], string> = {
  invoice: "Invoice",
  quotation: "Quotation",
  auction_deposit: "Auction deposit",
};

export const INVOICE_STATUS: Record<PortalInvoiceRow["status"], { label: string; cls: string }> = {
  issued: { label: "Unpaid", cls: "bg-amber-100 text-amber-900" },
  partially_paid: { label: "Partly paid", cls: "bg-sky-100 text-sky-900" },
  paid: { label: "Paid", cls: "bg-emerald-100 text-emerald-900" },
  cancelled: { label: "Cancelled", cls: "bg-slate-200 text-slate-700" },
};

export const SHIPPING_STATUS: Record<NonNullable<PortalVehicle["shipping_status"]>, { label: string; cls: string }> = {
  not_booked: { label: "Preparing", cls: "bg-slate-200 text-slate-800" },
  booked: { label: "Booked on a ship", cls: "bg-sky-100 text-sky-900" },
  shipped: { label: "On the way", cls: "bg-amber-100 text-amber-900" },
  delivered: { label: "Arrived", cls: "bg-emerald-100 text-emerald-900" },
};

export const DOC_KIND_LABEL: Record<string, string> = {
  bl: "Bill of lading",
  amend_bl: "Amended B/L",
  surrender: "Surrendered B/L",
  draft_bl: "Draft B/L",
  waybill: "Sea waybill",
  export_cert: "Export certificate (JP)",
  export_cert_en: "Export certificate (EN)",
  inspection_cert: "Inspection certificate",
  auction_sheet: "Auction sheet",
  courier_bl: "Courier — B/L",
  dhl_docs: "DHL documents",
};

export const fmtDate = (d: string | null | undefined) =>
  d ? new Date(d.length === 10 ? `${d}T00:00:00` : d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—";
