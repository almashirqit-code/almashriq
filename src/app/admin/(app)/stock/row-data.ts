import "server-only";
import { createClient } from "@/lib/supabase/server";
import { costJpy as totalCostJpy, expensesJpy } from "@/lib/branches";
import type { Currency, InvoiceStatus, ShipmentType, VehicleStatus } from "@/lib/types";

export type PaymentStatus = "available" | "reserved" | "invoiced" | "partial" | "paid";

export type RowExtra = {
  customer: { id: string; name: string; country: string | null } | null;
  term: string | null;
  sold: { amount: number; currency: Currency } | null;
  balance: { amount: number; currency: Currency; pct: number } | null;
  profitJpy: number | null;
  invoice: { id: string; invoice_no: string; status: InvoiceStatus } | null;
  reservationId: string | null;
  remittances: { id: number; amount: number; currency: Currency }[];
  shipping: { etd: string | null; eta: string | null; container_no: string | null; shipment_type: ShipmentType | null; booking_no: string | null } | null;
  docs: { bl?: string; auction_sheet?: string; release?: string };
  payment: PaymentStatus;
};

type Cost = {
  id: string;
  status: VehicleStatus;
  ownership: string;
  purchase_price: number | null;
  purchase_tax: number | null;
  expenses: number | null;
  cost_fx_rate: number | null;
  supplier_price: number | null;
  supplier_currency: Currency | null;
};

/** Loads everything the stock rows show beyond the vehicle itself, in one round of queries. */
export async function loadRowExtras(vehicles: Cost[], rates: Record<Currency, number>): Promise<Map<string, RowExtra>> {
  const ids = vehicles.map((v) => v.id);
  const out = new Map<string, RowExtra>();
  if (!ids.length) return out;
  const supabase = await createClient();

  const [items, reservations, allocs, ships, docs] = await Promise.all([
    supabase
      .from("invoice_items")
      .select("vehicle_id, amount, invoices!inner(id, invoice_no, status, currency, exchange_rate, total, amount_paid, incoterm, customers(id, name, country))")
      .in("vehicle_id", ids)
      .neq("invoices.status", "cancelled"),
    supabase
      .from("reservations")
      .select("id, vehicle_id, status, sold_price, currency, exchange_rate, price_term, profit_jpy, customers(id, name, country)")
      .in("vehicle_id", ids)
      .in("status", ["active", "invoiced"]),
    supabase.from("remittance_allocations").select("vehicle_id, amount, remittance_id, remittances(currency, exchange_rate)").in("vehicle_id", ids),
    supabase.from("vehicle_shipments").select("vehicle_id, etd, eta, container_no, shipment_type, booking_no").in("vehicle_id", ids),
    supabase.from("vehicle_documents").select("id, vehicle_id, kind").in("vehicle_id", ids).in("kind", ["bl", "auction_sheet", "waybill", "surrender"]),
  ]);

  type Cust = { id: string; name: string; country: string | null } | null;
  type Inv = { id: string; invoice_no: string; status: InvoiceStatus; currency: Currency; exchange_rate: number; total: number; amount_paid: number; incoterm: string | null; customers: Cust };
  const invBy = new Map<string, { amount: number; inv: Inv }>();
  for (const r of (items.data ?? []) as unknown as { vehicle_id: string; amount: number; invoices: Inv }[]) {
    const prev = invBy.get(r.vehicle_id);
    // Prefer the most advanced invoice if a car somehow sits on two.
    const rank = (s: InvoiceStatus) => ["draft", "issued", "partially_paid", "paid"].indexOf(s);
    if (!prev || rank(r.invoices.status) > rank(prev.inv.status)) invBy.set(r.vehicle_id, { amount: Number(r.amount), inv: r.invoices });
  }
  type Res = { id: string; vehicle_id: string; status: string; sold_price: number; currency: Currency; exchange_rate: number; price_term: string; profit_jpy: number; customers: Cust };
  const resBy = new Map<string, Res>();
  for (const r of (reservations.data ?? []) as unknown as Res[]) {
    if (!resBy.has(r.vehicle_id) || r.status === "active") resBy.set(r.vehicle_id, r);
  }
  type Al = { vehicle_id: string; amount: number; remittance_id: number; remittances: { currency: Currency; exchange_rate: number } | null };
  const alBy = new Map<string, Al[]>();
  for (const a of (allocs.data ?? []) as unknown as Al[]) alBy.set(a.vehicle_id, [...(alBy.get(a.vehicle_id) ?? []), a]);
  type Sh = NonNullable<RowExtra["shipping"]> & { vehicle_id: string };
  const shipBy = new Map<string, RowExtra["shipping"]>(((ships.data ?? []) as unknown as Sh[]).map((s) => [s.vehicle_id, s]));
  const docBy = new Map<string, RowExtra["docs"]>();
  for (const d of (docs.data ?? []) as { id: string; vehicle_id: string; kind: string }[]) {
    const m = docBy.get(d.vehicle_id) ?? {};
    if (d.kind === "bl" && !m.bl) m.bl = d.id;
    if (d.kind === "auction_sheet" && !m.auction_sheet) m.auction_sheet = d.id;
    if ((d.kind === "surrender" || d.kind === "waybill") && !m.release) m.release = d.id;
    docBy.set(d.vehicle_id, m);
  }

  for (const v of vehicles) {
    const inv = invBy.get(v.id);
    const res = resBy.get(v.id);
    const al = alBy.get(v.id) ?? [];
    const costJpy =
      v.ownership === "third_party"
        ? Number(v.supplier_price || 0) * (v.supplier_currency && v.supplier_currency !== "JPY" ? Number(rates[v.supplier_currency] || 0) : 1) + expensesJpy(v)
        : totalCostJpy(v);
    const allocatedJpy = al.reduce((s, a) => s + Number(a.amount) * (a.remittances?.currency === "JPY" ? 1 : Number(a.remittances?.exchange_rate || 1)), 0);

    let sold: RowExtra["sold"] = null;
    let balance: RowExtra["balance"] = null;
    let profitJpy: number | null = null;
    if (res) {
      sold = { amount: Number(res.sold_price), currency: res.currency };
      profitJpy = Number(res.profit_jpy);
    } else if (inv) {
      sold = { amount: inv.amount, currency: inv.inv.currency };
      profitJpy = Math.round(inv.amount * (inv.inv.currency === "JPY" ? 1 : Number(inv.inv.exchange_rate || 1)) - costJpy);
    }
    if (inv && inv.inv.status !== "draft") {
      const total = Number(inv.inv.total);
      const due = Math.max(0, total - Number(inv.inv.amount_paid));
      balance = { amount: due, currency: inv.inv.currency, pct: total ? (due / total) * 100 : 0 };
    } else if (sold) {
      const rate = sold.currency === "JPY" ? 1 : Number(res?.exchange_rate ?? inv?.inv.exchange_rate ?? 1);
      const due = Math.max(0, sold.amount - allocatedJpy / rate);
      balance = { amount: due, currency: sold.currency, pct: sold.amount ? (due / sold.amount) * 100 : 0 };
    }

    const invStatus = inv?.inv.status;
    const payment: PaymentStatus =
      invStatus === "paid"
        ? "paid"
        : invStatus === "partially_paid"
          ? "partial"
          : invStatus === "issued"
            ? "invoiced"
            : v.status === "reserved" || res || invStatus === "draft"
              ? "reserved"
              : "available";

    out.set(v.id, {
      customer: inv?.inv.customers ?? res?.customers ?? null,
      term: inv?.inv.incoterm ?? res?.price_term ?? null,
      sold,
      balance,
      profitJpy,
      invoice: inv ? { id: inv.inv.id, invoice_no: inv.inv.invoice_no, status: inv.inv.status } : null,
      reservationId: res?.status === "active" ? res.id : null,
      remittances: [...al.reduce((m, a) => {
        const cur = m.get(a.remittance_id);
        m.set(a.remittance_id, { id: a.remittance_id, amount: (cur?.amount ?? 0) + Number(a.amount), currency: a.remittances?.currency ?? "USD" });
        return m;
      }, new Map<number, { id: number; amount: number; currency: Currency }>()).values()],
      shipping: shipBy.get(v.id) ?? null,
      docs: docBy.get(v.id) ?? {},
      payment,
    });
  }
  return out;
}
