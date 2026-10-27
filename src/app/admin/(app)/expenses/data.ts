import "server-only";
import { createClient } from "@/lib/supabase/server";
import { EXPENSE_CATEGORIES, type Expense } from "@/lib/expenses";

export type ExpenseFilters = { from: string; to: string; category: string; q: string };
export type ExpenseRow = Expense & { vehicles: { id: string; stock_no: string } | null };

const DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Date range defaults to this month; category must be a known one. */
export function readFilters(sp: { from?: string; to?: string; category?: string; q?: string }): ExpenseFilters {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  return {
    from: DATE.test(sp.from ?? "") ? sp.from! : monthStart,
    to: DATE.test(sp.to ?? "") ? sp.to! : now.toISOString().slice(0, 10),
    category: EXPENSE_CATEGORIES.some((c) => c.value === sp.category) ? sp.category! : "",
    q: (sp.q ?? "").trim().replace(/[%,()]/g, " ").slice(0, 80),
  };
}

/** Expenses in the range (RLS: admin all, manager their office). */
export async function loadExpenses(f: ExpenseFilters, limit = 2000): Promise<ExpenseRow[]> {
  const supabase = await createClient();
  let q = supabase
    .from("company_expenses")
    .select("*, vehicles(id, stock_no)")
    .gte("expense_date", f.from)
    .lte("expense_date", f.to)
    .order("expense_date", { ascending: false })
    .order("id", { ascending: false })
    .limit(limit);
  if (f.category) q = q.eq("category", f.category);
  if (f.q) q = q.or(`description.ilike.%${f.q}%,paid_to.ilike.%${f.q}%,reference.ilike.%${f.q}%`);
  const { data } = await q;
  return (data ?? []) as unknown as ExpenseRow[];
}

export const filterQuery = (f: ExpenseFilters) => {
  const u = new URLSearchParams({ from: f.from, to: f.to });
  if (f.category) u.set("category", f.category);
  if (f.q) u.set("q", f.q);
  return u.toString();
};
