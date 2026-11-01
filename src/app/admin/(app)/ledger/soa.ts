import "server-only";
import { createClient } from "@/lib/supabase/server";
import { fetchAll } from "@/lib/fetch-all";
import type { Currency } from "@/lib/types";
import type { Period } from "./data";

/**
 * Statements of account for the ledger, read as the signed-in staff member (RLS decides which
 * customers they see). Debts are invoices and auction-deposit invoices that are issued (not drafts,
 * quotations or cancelled); credits are payments on them. TTs are listed for reference only: the
 * part of a TT applied to an invoice is already a payment, so adding both would count it twice.
 */

export type CustomerOption = { id: string; customer_no: number; name: string; company: string | null; assigned_to: string | null };

export async function loadCustomerOptions(): Promise<CustomerOption[]> {
  const supabase = await createClient();
  return fetchAll<CustomerOption>((from, to) => supabase.from("customers").select("id, customer_no, name, company, assigned_to").order("name").order("id").range(from, to));
}

type Inv = { id: string; invoice_no: string; doc_type: string; issue_date: string; due_date: string | null; currency: Currency; total: number; amount_paid: number; customer_id: string; created_at: string };
type Pay = { id: string; paid_on: string; amount: number; method: string | null; reference: string | null; invoice_id: string; created_at: string };

async function debts(customerIds: string[], to: string) {
  const supabase = await createClient();
  const invoices: Inv[] = [];
  for (let i = 0; i < customerIds.length; i += 200) {
    const ids = customerIds.slice(i, i + 200);
    invoices.push(
      ...(await fetchAll<Inv>((from, upto) =>
        supabase
          .from("invoices")
          .select("id, invoice_no, doc_type, issue_date, due_date, currency, total, amount_paid, customer_id, created_at")
          .in("customer_id", ids)
          .in("doc_type", ["invoice", "auction_deposit"])
          .not("status", "in", "(draft,cancelled)")
          .lte("issue_date", to)
          .order("id")
          .range(from, upto)
      ))
    );
  }
  const payments: Pay[] = [];
  const invIds = invoices.map((i) => i.id);
  for (let i = 0; i < invIds.length; i += 200) {
    const ids = invIds.slice(i, i + 200);
    payments.push(
      ...(await fetchAll<Pay>((from, upto) =>
        supabase.from("payments").select("id, paid_on, amount, method, reference, invoice_id, created_at").in("invoice_id", ids).lte("paid_on", to).order("id").range(from, upto)
      ))
    );
  }
  return { invoices, payments };
}

// -----------------------------------------------------------------------------------------------
// Customer statement
// -----------------------------------------------------------------------------------------------
export type SoaLine = { date: string; kind: "invoice" | "payment"; ref: string; refId: string; detail: string; debit: number; credit: number; balance: number };
export type SoaCurrency = { currency: Currency; opening: number; debit: number; credit: number; closing: number; lines: SoaLine[] };
export type CustomerSoa = {
  customer: { id: string; customer_no: number; name: string; company: string | null; email: string | null; phone: string | null; country: string | null; agent: string | null };
  ledgers: SoaCurrency[];
  tts: { id: number; date: string; currency: Currency; amount: number; remitter: string | null; bank: string | null; applied: number }[];
};

export async function loadCustomerSoa(customerId: string, p: Period): Promise<CustomerSoa | null> {
  const supabase = await createClient();
  const { data: c } = await supabase.from("customers").select("id, customer_no, name, company, email, phone, country, assigned_to").eq("id", customerId).maybeSingle();
  if (!c) return null;
  const [{ invoices, payments }, { data: agent }, { data: tts }] = await Promise.all([
    debts([c.id], p.to),
    c.assigned_to ? supabase.from("profiles").select("full_name, email").eq("id", c.assigned_to).maybeSingle() : Promise.resolve({ data: null }),
    supabase
      .from("remittances")
      .select("id, received_date, currency, remit_amount, allocated_amount, remitter, bank")
      .eq("customer_id", c.id)
      .gte("received_date", p.from)
      .lte("received_date", p.to)
      .order("received_date"),
  ]);
  const invById = new Map(invoices.map((i) => [i.id, i]));

  type Ev = { date: string; ord: number; ts: string; currency: Currency; line: Omit<SoaLine, "balance"> };
  const events: Ev[] = [
    ...invoices.map((i) => ({
      date: i.issue_date,
      ord: 0,
      ts: i.created_at,
      currency: i.currency,
      line: { date: i.issue_date, kind: "invoice" as const, ref: i.invoice_no, refId: i.id, detail: `${i.doc_type === "auction_deposit" ? "Auction deposit" : "Invoice"}${i.due_date ? ` · due ${i.due_date}` : ""}`, debit: Number(i.total), credit: 0 },
    })),
    ...payments.map((x) => {
      const i = invById.get(x.invoice_id)!;
      return {
        date: x.paid_on,
        ord: 1,
        ts: x.created_at,
        currency: i.currency,
        line: { date: x.paid_on, kind: "payment" as const, ref: i.invoice_no, refId: i.id, detail: [x.method || "Payment", x.reference].filter(Boolean).join(" · "), debit: 0, credit: Number(x.amount) },
      };
    }),
  ].sort((a, b) => a.date.localeCompare(b.date) || a.ord - b.ord || a.ts.localeCompare(b.ts));

  const byCur = new Map<Currency, SoaCurrency>();
  for (const e of events) {
    const l = byCur.get(e.currency) ?? { currency: e.currency, opening: 0, debit: 0, credit: 0, closing: 0, lines: [] };
    if (e.date < p.from) l.opening += e.line.debit - e.line.credit;
    else {
      l.debit += e.line.debit;
      l.credit += e.line.credit;
      l.lines.push({ ...e.line, balance: 0 });
    }
    byCur.set(e.currency, l);
  }
  for (const l of byCur.values()) {
    let bal = l.opening;
    for (const line of l.lines) line.balance = bal += line.debit - line.credit;
    l.closing = bal;
  }

  return {
    customer: {
      id: c.id,
      customer_no: c.customer_no,
      name: c.name,
      company: c.company,
      email: c.email,
      phone: c.phone,
      country: c.country,
      agent: agent ? ((agent.full_name || agent.email) as string) : null,
    },
    ledgers: [...byCur.values()].filter((l) => l.lines.length || Math.abs(l.opening) > 0.004),
    tts: (tts ?? []).map((t) => ({ id: t.id, date: t.received_date, currency: t.currency as Currency, amount: Number(t.remit_amount), remitter: t.remitter, bank: t.bank, applied: Number(t.allocated_amount) })),
  };
}

// -----------------------------------------------------------------------------------------------
// Sales agent statement: the agent's customers (customers.assigned_to)
// -----------------------------------------------------------------------------------------------
export type AgentCustomerRow = { id: string; customer_no: number; name: string; currency: Currency; invoiced: number; collected: number; balance: number; cars: number };
export type AgentSoa = {
  agent: { id: string; name: string; email: string; office: string | null };
  customers: number;
  rows: AgentCustomerRow[];
  totals: { currency: Currency; invoiced: number; collected: number; balance: number }[];
  carsSold: { invoiceId: string; invoiceNo: string; date: string; stockNo: string; vehicleId: string; customer: string }[];
  commissions: { vehicleId: string; stockNo: string; paidOn: string; amount: number; currency: Currency }[];
};

export async function loadAgentSoa(agentId: string, p: Period): Promise<AgentSoa | null> {
  const supabase = await createClient();
  const { data: a } = await supabase.from("profiles").select("id, full_name, email, office").eq("id", agentId).maybeSingle();
  if (!a) return null;
  const custs = await fetchAll<{ id: string; customer_no: number; name: string }>((from, to) =>
    supabase.from("customers").select("id, customer_no, name").eq("assigned_to", agentId).order("id").range(from, to)
  );
  const { invoices, payments } = await debts(
    custs.map((c) => c.id),
    p.to
  );
  const custById = new Map(custs.map((c) => [c.id, c]));
  const invById = new Map(invoices.map((i) => [i.id, i]));

  // Per customer and currency: invoiced and collected in the period; balance = everything owed up to the end date.
  const key = (cid: string, cur: string) => `${cid}|${cur}`;
  const rows = new Map<string, AgentCustomerRow>();
  const row = (cid: string, cur: Currency) => {
    const k = key(cid, cur);
    if (!rows.has(k)) {
      const c = custById.get(cid)!;
      rows.set(k, { id: cid, customer_no: c.customer_no, name: c.name, currency: cur, invoiced: 0, collected: 0, balance: 0, cars: 0 });
    }
    return rows.get(k)!;
  };
  for (const i of invoices) {
    const r = row(i.customer_id, i.currency);
    r.balance += Number(i.total);
    if (i.issue_date >= p.from) r.invoiced += Number(i.total);
  }
  for (const x of payments) {
    const i = invById.get(x.invoice_id)!;
    const r = row(i.customer_id, i.currency);
    r.balance -= Number(x.amount);
    if (x.paid_on >= p.from) r.collected += Number(x.amount);
  }

  // Cars on this agent's customers' invoices issued in the period.
  const periodInv = invoices.filter((i) => i.issue_date >= p.from && i.doc_type === "invoice");
  const carsSold: AgentSoa["carsSold"] = [];
  for (let i = 0; i < periodInv.length; i += 200) {
    const ids = periodInv.slice(i, i + 200).map((x) => x.id);
    const { data } = await supabase.from("invoice_items").select("invoice_id, vehicles(id, stock_no)").in("invoice_id", ids).not("vehicle_id", "is", null);
    for (const it of data ?? []) {
      const v = it.vehicles as unknown as { id: string; stock_no: string } | null;
      const inv = invById.get(it.invoice_id as string)!;
      if (!v) continue;
      carsSold.push({ invoiceId: inv.id, invoiceNo: inv.invoice_no, date: inv.issue_date, stockNo: v.stock_no, vehicleId: v.id, customer: custById.get(inv.customer_id)?.name ?? "" });
      row(inv.customer_id, inv.currency).cars++;
    }
  }

  const { data: comm } = await supabase
    .from("vehicles")
    .select("id, stock_no, commission_paid_at, commission_amount, commission_currency")
    .eq("commission_agent_id", agentId)
    .gte("commission_paid_at", p.from)
    .lte("commission_paid_at", p.to)
    .order("commission_paid_at");

  const list = [...rows.values()].filter((r) => r.invoiced || r.collected || Math.abs(r.balance) > 0.004).sort((x, y) => y.balance - x.balance);
  const totals = new Map<Currency, { currency: Currency; invoiced: number; collected: number; balance: number }>();
  for (const r of list) {
    const t = totals.get(r.currency) ?? { currency: r.currency, invoiced: 0, collected: 0, balance: 0 };
    t.invoiced += r.invoiced;
    t.collected += r.collected;
    t.balance += r.balance;
    totals.set(r.currency, t);
  }

  return {
    agent: { id: a.id, name: (a.full_name || a.email) as string, email: a.email as string, office: a.office as string | null },
    customers: custs.length,
    rows: list,
    totals: [...totals.values()],
    carsSold: carsSold.sort((x, y) => y.date.localeCompare(x.date)),
    commissions: (comm ?? []).map((v) => ({ vehicleId: v.id, stockNo: v.stock_no, paidOn: v.commission_paid_at as string, amount: Number(v.commission_amount), currency: v.commission_currency as Currency })),
  };
}
