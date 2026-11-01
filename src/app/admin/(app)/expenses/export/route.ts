import { NextResponse, type NextRequest } from "next/server";
import { getProfile } from "@/lib/auth";
import { csvResponse } from "@/lib/csv";
import { xlsxResponse } from "@/lib/xlsx";
import { expenseCategoryLabel } from "@/lib/expenses";
import { readFilters, loadExpenses } from "../data";

/** Expenses in the chosen period as CSV (same filters and access as the page). */
export async function GET(req: NextRequest) {
  const profile = await getProfile();
  if (profile.role !== "admin" && profile.role !== "manager") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const sp = Object.fromEntries(req.nextUrl.searchParams);
  const f = readFilters(sp);
  const rows = await loadExpenses(f, 50000);
  const header = ["id", "date", "category", "description", "paid_to", "payment_method", "reference", "car", "office", "currency", "amount", "rate_to_jpy", "amount_jpy"];
  const data = rows.map((r) => [r.id, r.expense_date, expenseCategoryLabel(r.category), r.description, r.paid_to, r.payment_method, r.reference, r.vehicles?.stock_no, r.office, r.currency, Number(r.amount), Number(r.fx_rate), Number(r.amount_jpy)]);
  if (sp.format === "xlsx") {
    const byCat = new Map<string, number>();
    for (const r of rows) byCat.set(expenseCategoryLabel(r.category), (byCat.get(expenseCategoryLabel(r.category)) ?? 0) + Number(r.amount_jpy));
    return xlsxResponse(`expenses-${f.from}-to-${f.to}.xlsx`, [
      { name: "Expenses", header: ["ID", "Date", "Category", "Description", "Paid to", "Paid by", "Reference", "Car", "Office", "Currency", "Amount", "Rate to JPY", "JPY"], rows: data },
      { name: "By category", header: ["Category", "JPY"], rows: [...byCat.entries()].sort((a, b) => b[1] - a[1]) },
    ]);
  }
  return csvResponse(`expenses-${f.from}-to-${f.to}.csv`, header, data);
}
