import { NextResponse, type NextRequest } from "next/server";
import { getProfile } from "@/lib/auth";
import { csvResponse } from "@/lib/csv";
import { readPeriod, loadEntries, ENTRY_LABEL, type EntryKind } from "../data";
import { loadCustomerSoa } from "../soa";

/** Ledger entries for the period as CSV (optionally one kind), same access as the page. */
export async function GET(req: NextRequest) {
  const profile = await getProfile();
  if (profile.role !== "admin" && profile.role !== "manager") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const sp = Object.fromEntries(req.nextUrl.searchParams);
  const p = readPeriod(sp);
  if (sp.tab === "customer" && /^[0-9a-f-]{36}$/i.test(sp.c ?? "")) {
    const soa = await loadCustomerSoa(sp.c!, p);
    if (!soa) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const rows: unknown[][] = [];
    for (const l of soa.ledgers) {
      rows.push([p.from, "Opening balance", "", "", "", "", l.currency, l.opening]);
      for (const x of l.lines) rows.push([x.date, x.kind === "invoice" ? "Invoice" : "Payment", x.ref, x.detail, x.debit || "", x.credit || "", l.currency, x.balance]);
      rows.push([p.to, "Closing balance", "", "", l.debit, l.credit, l.currency, l.closing]);
    }
    return csvResponse(`statement-${soa.customer.customer_no}-${p.from}-to-${p.to}.csv`, ["date", "type", "document", "detail", "debit", "credit", "currency", "balance"], rows);
  }
  const kind = sp.kind && sp.kind in ENTRY_LABEL ? (sp.kind as EntryKind) : null;
  const rows = (await loadEntries(p)).filter((e) => !kind || e.kind === kind);
  return csvResponse(
    `ledger-${p.from}-to-${p.to}${kind ? `-${kind}` : ""}.csv`,
    ["date", "type", "ref", "party", "detail", "currency", "amount", "amount_jpy"],
    rows.map((e) => [e.date, ENTRY_LABEL[e.kind], e.ref, e.party, e.detail, e.currency, e.amount, e.jpy])
  );
}
