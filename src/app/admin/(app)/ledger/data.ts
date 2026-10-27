import "server-only";
import { createClient } from "@/lib/supabase/server";
import { expenseCategoryLabel } from "@/lib/expenses";
import type { Currency } from "@/lib/types";
import { loadRates, vehicleCostJpy } from "../reservations/data";

/**
 * Business ledger, built from what the ERP already records (no double entry): invoices, payments,
 * TTs, car purchases and the expense book. Read as the signed-in user, so RLS decides what a manager
 * sees. Amounts are converted to JPY with each document's own rate.
 */

export type Period = { from: string; to: string };
const DATE = /^\d{4}-\d{2}-\d{2}$/;

export function readPeriod(sp: { from?: string; to?: string }): Period {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  return { from: DATE.test(sp.from ?? "") ? sp.from! : monthStart, to: DATE.test(sp.to ?? "") ? sp.to! : now.toISOString().slice(0, 10) };
}

export type EntryKind = "sale" | "payment" | "tt" | "purchase" | "car_expense" | "expense";
export const ENTRY_LABEL: Record<EntryKind, string> = {
  sale: "Sale (invoice)",
  payment: "Payment received",
  tt: "TT received",
  purchase: "Car purchase",
  car_expense: "Car expenses",
  expense: "Expense",
};

export type Entry = { date: string; kind: EntryKind; ref: string; party: string; detail: string; currency: Currency; amount: number; jpy: number; href: string | null };

const LIMIT = 20000;
const jpy = (amount: number, rate: number | null | undefined) => Math.round(Number(amount || 0) * (Number(rate) || 1));
type Named = { name: string } | null;

export async function loadEntries(p: Period): Promise<Entry[]> {
  const supabase = await createClient();
  const [inv, pay, tts, cars, exp] = await Promise.all([
    supabase
      .from("invoices")
      .select("id, invoice_no, doc_type, issue_date, currency, total, exchange_rate, customers(name)")
      .in("doc_type", ["invoice", "auction_deposit"])
      .not("status", "in", "(draft,cancelled)")
      .gte("issue_date", p.from)
      .lte("issue_date", p.to)
      .limit(LIMIT),
    supabase
      .from("payments")
      .select("id, paid_on, amount, method, reference, invoices!inner(id, invoice_no, currency, exchange_rate, customers(name))")
      .gte("paid_on", p.from)
      .lte("paid_on", p.to)
      .limit(LIMIT),
    supabase
      .from("remittances")
      .select("id, received_date, currency, remit_amount, bank_charges, exchange_rate, remitter, bank, customers(name)")
      .gte("received_date", p.from)
      .lte("received_date", p.to)
      .limit(LIMIT),
    supabase
      .from("vehicles")
      .select("id, stock_no, make, model, purchase_date, purchase_price, purchase_tax, expenses, cost_fx_rate, cost_currency, supplier_name")
      .eq("ownership", "own")
      .gte("purchase_date", p.from)
      .lte("purchase_date", p.to)
      .limit(LIMIT),
    supabase
      .from("company_expenses")
      .select("id, expense_date, category, description, paid_to, currency, amount, amount_jpy, vehicles(stock_no)")
      .gte("expense_date", p.from)
      .lte("expense_date", p.to)
      .limit(LIMIT),
  ]);

  const out: Entry[] = [];
  for (const i of inv.data ?? []) {
    out.push({
      date: i.issue_date,
      kind: "sale",
      ref: i.invoice_no,
      party: (i.customers as unknown as Named)?.name ?? "",
      detail: i.doc_type === "auction_deposit" ? "Auction deposit" : "Invoice",
      currency: i.currency as Currency,
      amount: Number(i.total),
      jpy: jpy(i.total, i.exchange_rate),
      href: `/admin/invoices/${i.id}`,
    });
  }
  for (const x of pay.data ?? []) {
    const i = x.invoices as unknown as { id: string; invoice_no: string; currency: Currency; exchange_rate: number; customers: Named };
    out.push({
      date: x.paid_on,
      kind: "payment",
      ref: i.invoice_no,
      party: i.customers?.name ?? "",
      detail: [x.method, x.reference].filter(Boolean).join(" · ") || "Payment",
      currency: i.currency,
      amount: Number(x.amount),
      jpy: jpy(x.amount, i.exchange_rate),
      href: `/admin/invoices/${i.id}`,
    });
  }
  for (const r of tts.data ?? []) {
    out.push({
      date: r.received_date,
      kind: "tt",
      ref: `TT #${r.id}`,
      party: (r.customers as unknown as Named)?.name ?? r.remitter ?? "",
      detail: [r.bank, Number(r.bank_charges) ? `bank charges ${r.bank_charges}` : ""].filter(Boolean).join(" · "),
      currency: r.currency as Currency,
      amount: Number(r.remit_amount),
      jpy: jpy(r.remit_amount, r.exchange_rate),
      href: `/admin/remittances/${r.id}`,
    });
  }
  for (const v of cars.data ?? []) {
    const cur = (v.cost_currency ?? "JPY") as Currency;
    const buy = Number(v.purchase_price || 0) + Number(v.purchase_tax || 0);
    if (buy > 0)
      out.push({ date: v.purchase_date, kind: "purchase", ref: v.stock_no, party: v.supplier_name ?? "", detail: `${v.make} ${v.model} (incl. tax)`, currency: cur, amount: buy, jpy: jpy(buy, v.cost_fx_rate), href: `/admin/stock/${v.id}` });
    if (Number(v.expenses) > 0)
      out.push({ date: v.purchase_date, kind: "car_expense", ref: v.stock_no, party: "", detail: `${v.make} ${v.model} — transport, repairs, fees`, currency: cur, amount: Number(v.expenses), jpy: jpy(v.expenses, v.cost_fx_rate), href: `/admin/stock/${v.id}` });
  }
  for (const e of exp.data ?? []) {
    const car = (e.vehicles as unknown as { stock_no: string } | null)?.stock_no;
    out.push({
      date: e.expense_date,
      kind: "expense",
      ref: `EXP #${e.id}`,
      party: e.paid_to ?? "",
      detail: `${expenseCategoryLabel(e.category)} — ${e.description}${car ? ` (${car})` : ""}`,
      currency: e.currency as Currency,
      amount: Number(e.amount),
      jpy: Number(e.amount_jpy),
      href: `/admin/expenses?from=${e.expense_date}&to=${e.expense_date}`,
    });
  }
  return out.sort((a, b) => (a.date === b.date ? a.kind.localeCompare(b.kind) : b.date.localeCompare(a.date)));
}

export function totals(entries: Entry[]) {
  const t: Record<EntryKind, number> = { sale: 0, payment: 0, tt: 0, purchase: 0, car_expense: 0, expense: 0 };
  for (const e of entries) t[e.kind] += e.jpy;
  return t;
}

// -----------------------------------------------------------------------------------------------
// Profit: cars invoiced in the period (sale − buying cost − costs booked to that car), then overheads.
// -----------------------------------------------------------------------------------------------
export type CarProfit = { vehicleId: string; stockNo: string; title: string; invoiceNo: string; invoiceId: string; date: string; customer: string; saleJpy: number; costJpy: number; extraJpy: number; profitJpy: number; commissionPaid: boolean };

export async function loadProfit(p: Period) {
  const supabase = await createClient();
  const [{ rates }, items, overheadRows] = await Promise.all([
    loadRates(),
    supabase
      .from("invoice_items")
      .select(
        "amount, vehicle_id, invoices!inner(id, invoice_no, issue_date, exchange_rate, status, doc_type, customers(name)), " +
          "vehicles(id, stock_no, make, model, year, ownership, purchase_price, purchase_tax, expenses, cost_fx_rate, supplier_price, supplier_currency, commission_paid_at)"
      )
      .not("vehicle_id", "is", null)
      .eq("invoices.doc_type", "invoice")
      .in("invoices.status", ["issued", "partially_paid", "paid"])
      .gte("invoices.issue_date", p.from)
      .lte("invoices.issue_date", p.to)
      .limit(LIMIT),
    supabase.from("company_expenses").select("amount_jpy, vehicle_id").gte("expense_date", p.from).lte("expense_date", p.to).limit(LIMIT),
  ]);

  type Item = {
    amount: number;
    vehicle_id: string;
    invoices: { id: string; invoice_no: string; issue_date: string; exchange_rate: number; customers: Named };
    vehicles: {
      id: string; stock_no: string; make: string; model: string; year: number | null; ownership: string;
      purchase_price: number | null; purchase_tax: number | null; expenses: number | null; cost_fx_rate: number | null;
      supplier_price: number | null; supplier_currency: Currency | null; commission_paid_at: string | null;
    } | null;
  };
  const rows = (items.data ?? []) as unknown as Item[];

  // Expense-book costs booked to these cars (any date: e.g. commission paid after the sale).
  const ids = [...new Set(rows.map((r) => r.vehicle_id))];
  const extra = new Map<string, number>();
  for (let i = 0; i < ids.length; i += 300) {
    const { data } = await supabase.from("company_expenses").select("vehicle_id, amount_jpy").in("vehicle_id", ids.slice(i, i + 300));
    for (const e of data ?? []) extra.set(e.vehicle_id as string, (extra.get(e.vehicle_id as string) ?? 0) + Number(e.amount_jpy));
  }

  const cars: CarProfit[] = rows
    .filter((r) => r.vehicles)
    .map((r) => {
      const v = r.vehicles!;
      const saleJpy = jpy(r.amount, r.invoices.exchange_rate);
      const costJpy = vehicleCostJpy({ ...v, ownership: v.ownership as "own" | "third_party" }, rates).total;
      const extraJpy = extra.get(v.id) ?? 0;
      return {
        vehicleId: v.id,
        stockNo: v.stock_no,
        title: [v.year, v.make, v.model].filter(Boolean).join(" "),
        invoiceNo: r.invoices.invoice_no,
        invoiceId: r.invoices.id,
        date: r.invoices.issue_date,
        customer: r.invoices.customers?.name ?? "",
        saleJpy,
        costJpy,
        extraJpy,
        profitJpy: saleJpy - costJpy - extraJpy,
        commissionPaid: !!v.commission_paid_at,
      };
    })
    .sort((a, b) => b.date.localeCompare(a.date));

  const overheads = (overheadRows.data ?? []).filter((e) => !e.vehicle_id).reduce((s, e) => s + Number(e.amount_jpy), 0);
  const revenue = cars.reduce((s, c) => s + c.saleJpy, 0);
  const cost = cars.reduce((s, c) => s + c.costJpy + c.extraJpy, 0);
  return { cars, revenue, cost, gross: revenue - cost, overheads, net: revenue - cost - overheads };
}

// -----------------------------------------------------------------------------------------------
// Receivables: unpaid invoice balances (all dates), by age past the due date (or issue date).
// -----------------------------------------------------------------------------------------------
export const AGE_BUCKETS = ["Not due", "1–30 days", "31–60 days", "61–90 days", "Over 90 days"] as const;
export type Receivable = { id: string; invoiceNo: string; customer: string; customerId: string | null; issueDate: string; dueDate: string | null; currency: Currency; balance: number; daysLate: number; bucket: number };

export async function loadReceivables() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("invoices")
    .select("id, invoice_no, issue_date, due_date, currency, total, amount_paid, customer_id, customers(name)")
    .in("doc_type", ["invoice", "auction_deposit"])
    .in("status", ["issued", "partially_paid"])
    .order("issue_date")
    .limit(LIMIT);
  const today = new Date(new Date().toISOString().slice(0, 10)).getTime();
  const list: Receivable[] = (data ?? [])
    .map((i) => {
      const due = i.due_date ?? i.issue_date;
      const daysLate = Math.floor((today - new Date(due).getTime()) / 86400000);
      const bucket = daysLate <= 0 ? 0 : daysLate <= 30 ? 1 : daysLate <= 60 ? 2 : daysLate <= 90 ? 3 : 4;
      return {
        id: i.id,
        invoiceNo: i.invoice_no,
        customer: (i.customers as unknown as Named)?.name ?? "",
        customerId: i.customer_id,
        issueDate: i.issue_date,
        dueDate: i.due_date,
        currency: i.currency as Currency,
        balance: Math.max(0, Number(i.total) - Number(i.amount_paid)),
        daysLate: Math.max(0, daysLate),
        bucket,
      };
    })
    .filter((r) => r.balance > 0)
    .sort((a, b) => b.daysLate - a.daysLate);

  // Per currency: total per age bucket.
  const byCurrency = new Map<Currency, number[]>();
  for (const r of list) {
    const row = byCurrency.get(r.currency) ?? [0, 0, 0, 0, 0];
    row[r.bucket] += r.balance;
    byCurrency.set(r.currency, row);
  }
  return { list, byCurrency };
}
