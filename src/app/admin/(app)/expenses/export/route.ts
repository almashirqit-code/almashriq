import { NextResponse, type NextRequest } from "next/server";
import { getProfile } from "@/lib/auth";
import { csvResponse } from "@/lib/csv";
import { expenseCategoryLabel } from "@/lib/expenses";
import { readFilters, loadExpenses } from "../data";

/** Expenses in the chosen period as CSV (same filters and access as the page). */
export async function GET(req: NextRequest) {
  const profile = await getProfile();
  if (profile.role !== "admin" && profile.role !== "manager") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const sp = Object.fromEntries(req.nextUrl.searchParams);
  const f = readFilters(sp);
  const rows = await loadExpenses(f, 50000);
  return csvResponse(
    `expenses-${f.from}-to-${f.to}.csv`,
    ["id", "date", "category", "description", "paid_to", "payment_method", "reference", "car", "office", "currency", "amount", "rate_to_jpy", "amount_jpy"],
    rows.map((r) => [r.id, r.expense_date, expenseCategoryLabel(r.category), r.description, r.paid_to, r.payment_method, r.reference, r.vehicles?.stock_no, r.office, r.currency, r.amount, r.fx_rate, r.amount_jpy])
  );
}
