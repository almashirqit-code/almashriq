import { NextResponse, type NextRequest } from "next/server";
import { getProfile } from "@/lib/auth";
import { csvResponse } from "@/lib/csv";
import { xlsxResponse, type Cell, type Sheet } from "@/lib/xlsx";
import { getDisplayCurrency } from "@/lib/display-currency";
import { readPeriod, loadEntries, loadProfit, loadReceivables, ENTRY_LABEL, AGE_BUCKETS, type EntryKind } from "../data";
import { loadCustomerSoa, loadAgentSoa } from "../soa";

const UUID = /^[0-9a-f-]{36}$/i;
const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Ledger downloads, same access as the page. ?format=xlsx gives Excel (every tab); CSV stays for
 * entries and customer statements. Excel files carry JPY and, when another currency is picked in
 * the header, that currency too.
 */
export async function GET(req: NextRequest) {
  const profile = await getProfile();
  if (profile.role !== "admin" && profile.role !== "manager") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const sp = Object.fromEntries(req.nextUrl.searchParams);
  const p = readPeriod(sp);
  const xlsx = sp.format === "xlsx";
  const tab = sp.tab ?? "entries";
  const d = await getDisplayCurrency();
  const extra = d.cur !== "JPY";
  const inCur = (jpy: number): Cell[] => (extra ? [round2(d.fromJpy(jpy))] : []);
  const curHead = (label: string) => (extra ? [`${label} (${d.cur})`] : []);
  const stamp = `${p.from}-to-${p.to}`;

  if (tab === "customer" && UUID.test(sp.c ?? "")) {
    const soa = await loadCustomerSoa(sp.c!, p);
    if (!soa) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const rows: Cell[][] = [];
    for (const l of soa.ledgers) {
      rows.push([p.from, "Opening balance", "", "", null, null, l.currency, l.opening]);
      for (const x of l.lines) rows.push([x.date, x.kind === "invoice" ? "Invoice" : "Payment", x.ref, x.detail, x.debit || null, x.credit || null, l.currency, x.balance]);
      rows.push([p.to, "Closing balance", "", "", l.debit, l.credit, l.currency, l.closing]);
    }
    const header = ["Date", "Type", "Document", "Detail", "Debit", "Credit", "Currency", "Balance"];
    const file = `statement-${soa.customer.customer_no}-${stamp}`;
    if (!xlsx) return csvResponse(`${file}.csv`, header.map((h) => h.toLowerCase()), rows);
    return xlsxResponse(`${file}.xlsx`, [
      { name: `Statement ${soa.customer.customer_no}`, header, rows },
      { name: "TTs received", header: ["Received", "TT", "Remitter", "Bank", "Currency", "Amount", "Applied"], rows: soa.tts.map((t) => [t.date, `TT #${t.id}`, t.remitter, t.bank, t.currency, t.amount, t.applied]) },
    ]);
  }

  if (tab === "agent" && UUID.test(sp.a ?? "") && xlsx) {
    const soa = await loadAgentSoa(sp.a!, p);
    if (!soa) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return xlsxResponse(`agent-${soa.agent.name}-${stamp}.xlsx`, [
      {
        name: "Customers",
        header: ["Customer no.", "Customer", "Currency", "Cars", "Invoiced in period", "Collected in period", `Owed at ${p.to}`],
        rows: soa.rows.map((r) => [r.customer_no, r.name, r.currency, r.cars, r.invoiced, r.collected, r.balance]),
      },
      { name: "Cars sold", header: ["Date", "Stock no.", "Customer", "Invoice"], rows: soa.carsSold.map((c) => [c.date, c.stockNo, c.customer, c.invoiceNo]) },
      { name: "Commission paid", header: ["Paid on", "Stock no.", "Currency", "Amount"], rows: soa.commissions.map((c) => [c.paidOn, c.stockNo, c.currency, c.amount]) },
    ]);
  }

  if (tab === "profit" && xlsx) {
    const r = await loadProfit(p);
    const sheets: Sheet[] = [
      {
        name: "Profit per car",
        header: ["Invoice date", "Stock no.", "Car", "Invoice", "Customer", "Sale (JPY)", "Cost (JPY)", "Booked costs (JPY)", "Profit (JPY)", ...curHead("Profit")],
        rows: r.cars.map((c) => [c.date, c.stockNo, c.title, c.invoiceNo, c.customer, c.saleJpy, c.costJpy, c.extraJpy, c.profitJpy, ...inCur(c.profitJpy)]),
      },
      {
        name: "Summary",
        header: ["Item", "JPY", ...(extra ? [d.cur] : [])],
        rows: [
          ["Car sales", r.revenue, ...inCur(r.revenue)],
          ["Cost of those cars", r.cost, ...inCur(r.cost)],
          ["Gross profit", r.gross, ...inCur(r.gross)],
          ["Overheads (expense book)", r.overheads, ...inCur(r.overheads)],
          ["Net profit", r.net, ...inCur(r.net)],
        ],
      },
    ];
    return xlsxResponse(`profit-${stamp}.xlsx`, sheets);
  }

  if (tab === "receivables" && xlsx) {
    const { list, byCurrency } = await loadReceivables();
    return xlsxResponse(`receivables-${new Date().toISOString().slice(0, 10)}.xlsx`, [
      {
        name: "Unpaid invoices",
        header: ["Invoice", "Customer", "Issued", "Due", "Currency", "Balance", "Days late"],
        rows: list.map((r) => [r.invoiceNo, r.customer, r.issueDate, r.dueDate, r.currency, r.balance, r.daysLate]),
      },
      {
        name: "By age",
        header: ["Currency", ...AGE_BUCKETS, "Total owed"],
        rows: [...byCurrency.entries()].map(([cur, row]) => [cur, ...row, row.reduce((s, v) => s + v, 0)]),
      },
    ]);
  }

  const kind = sp.kind && sp.kind in ENTRY_LABEL ? (sp.kind as EntryKind) : null;
  const rows = (await loadEntries(p)).filter((e) => !kind || e.kind === kind);
  const file = `ledger-${stamp}${kind ? `-${kind}` : ""}`;
  if (!xlsx)
    return csvResponse(
      `${file}.csv`,
      ["date", "type", "ref", "party", "detail", "currency", "amount", "amount_jpy"],
      rows.map((e) => [e.date, ENTRY_LABEL[e.kind], e.ref, e.party, e.detail, e.currency, e.amount, e.jpy])
    );
  return xlsxResponse(`${file}.xlsx`, [
    {
      name: "Ledger",
      header: ["Date", "Type", "Ref.", "Party", "Detail", "Currency", "Amount", "JPY", ...(extra ? [d.cur] : [])],
      rows: rows.map((e) => [e.date, ENTRY_LABEL[e.kind], e.ref, e.party, e.detail, e.currency, e.amount, e.jpy, ...inCur(e.jpy)]),
    },
  ]);
}
