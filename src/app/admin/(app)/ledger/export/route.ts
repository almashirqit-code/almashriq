import { NextResponse, type NextRequest } from "next/server";
import { getProfile } from "@/lib/auth";
import { csvResponse } from "@/lib/csv";
import { readPeriod, loadEntries, ENTRY_LABEL, type EntryKind } from "../data";

/** Ledger entries for the period as CSV (optionally one kind), same access as the page. */
export async function GET(req: NextRequest) {
  const profile = await getProfile();
  if (profile.role !== "admin" && profile.role !== "manager") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const sp = Object.fromEntries(req.nextUrl.searchParams);
  const p = readPeriod(sp);
  const kind = sp.kind && sp.kind in ENTRY_LABEL ? (sp.kind as EntryKind) : null;
  const rows = (await loadEntries(p)).filter((e) => !kind || e.kind === kind);
  return csvResponse(
    `ledger-${p.from}-to-${p.to}${kind ? `-${kind}` : ""}.csv`,
    ["date", "type", "ref", "party", "detail", "currency", "amount", "amount_jpy"],
    rows.map((e) => [e.date, ENTRY_LABEL[e.kind], e.ref, e.party, e.detail, e.currency, e.amount, e.jpy])
  );
}
