import Link from "next/link";
import { Receipt, Download, Pencil, FileText } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import { money, num } from "@/lib/format";
import { EXPENSE_CATEGORIES, expenseCategoryLabel, type Expense } from "@/lib/expenses";
import { PageHeader, Stat, Empty } from "@/components/ui";
import { loadRates } from "../reservations/data";
import { readFilters, loadExpenses, filterQuery } from "./data";
import { ExpenseForm } from "./expense-form";
import { DeleteExpenseButton } from "./delete-button";

export const metadata = { title: "Expenses" };

/** Expense book: company costs by date and category, with receipts. Admins and managers only. */
export default async function ExpensesPage({ searchParams }: { searchParams: Promise<{ from?: string; to?: string; category?: string; q?: string; edit?: string }> }) {
  const profile = await requireRole(["admin", "manager"]);
  const sp = await searchParams;
  const f = readFilters(sp);
  const supabase = await createClient();
  const editId = Number(sp.edit) || null;

  const [rows, { rates }, { data: settings }, { data: editing }] = await Promise.all([
    loadExpenses(f),
    loadRates(),
    supabase.from("settings").select("offices").single(),
    editId ? supabase.from("company_expenses").select("*, vehicles(stock_no)").eq("id", editId).maybeSingle() : Promise.resolve({ data: null }),
  ]);
  const total = rows.reduce((s, r) => s + Number(r.amount_jpy), 0);
  const byCat = new Map<string, number>();
  for (const r of rows) byCat.set(r.category, (byCat.get(r.category) ?? 0) + Number(r.amount_jpy));
  const cats = [...byCat.entries()].sort((a, b) => b[1] - a[1]);
  const top = cats[0]?.[1] ?? 1;
  const fixedOffice = profile.role === "manager" ? profile.office : null;
  const editRow = editing as (Expense & { vehicles: { stock_no: string } | null }) | null;

  return (
    <>
      <PageHeader
        icon={<Receipt />}
        tone="fuchsia"
        title="Expenses"
        subtitle="Company costs — rent, salaries, shipping, fees and more. Each one is in the ledger and the audit trail."
        actions={
          <a href={`/admin/expenses/export?${filterQuery(f)}`} className="btn-secondary">
            <Download className="h-4 w-4" /> CSV
          </a>
        }
      />

      <div className="mb-5 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
        <Stat tone="fuchsia" label="Total in period (JPY)" value={money(total, "JPY")} />
        <Stat tone="violet" label="Entries" value={num(rows.length)} />
        <Stat tone="amber" label="Biggest category" value={cats[0] ? expenseCategoryLabel(cats[0][0]) : "—"} hint={cats[0] ? money(cats[0][1], "JPY") : undefined} />
      </div>

      <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="min-w-0 space-y-5">
          <form action="/admin/expenses" className="card flex flex-wrap items-end gap-2 p-3">
            <label className="text-xs">
              <span className="label">From</span>
              <input type="date" name="from" defaultValue={f.from} className="input w-auto" />
            </label>
            <label className="text-xs">
              <span className="label">To</span>
              <input type="date" name="to" defaultValue={f.to} className="input w-auto" />
            </label>
            <label className="text-xs">
              <span className="label">Category</span>
              <select name="category" defaultValue={f.category} className="input w-auto">
                <option value="">All</option>
                {EXPENSE_CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs">
              <span className="label">Search</span>
              <input name="q" defaultValue={f.q} placeholder="Description, paid to, ref." className="input w-48" />
            </label>
            <button className="btn-secondary">Show</button>
          </form>

          {cats.length > 0 && (
            <div className="card p-4">
              <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">By category</div>
              <ul className="space-y-1.5">
                {cats.map(([c, v]) => (
                  <li key={c} className="grid grid-cols-[9rem_minmax(0,1fr)_7rem] items-center gap-2 text-sm">
                    <Link href={`/admin/expenses?${filterQuery({ ...f, category: c })}`} className="truncate hover:underline">
                      {expenseCategoryLabel(c)}
                    </Link>
                    <span className="h-2 rounded-full bg-fuchsia-500/80" style={{ width: `${Math.max(2, (v / top) * 100)}%` }} />
                    <span className="text-right tabular-nums">{money(v, "JPY")}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="card overflow-hidden">
            {rows.length === 0 ? (
              <Empty>No expenses in this period.</Empty>
            ) : (
              <div className="overflow-x-auto">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Expense</th>
                      <th className="text-right">Amount</th>
                      <th className="text-right">JPY</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr key={r.id}>
                        <td className="whitespace-nowrap text-xs text-slate-500">{r.expense_date}</td>
                        <td className="max-w-[22rem]">
                          <div className="font-medium text-slate-800">{r.description}</div>
                          <div className="flex flex-wrap gap-x-2 text-xs text-slate-500">
                            <span>{expenseCategoryLabel(r.category)}</span>
                            {r.paid_to && <span>· {r.paid_to}</span>}
                            {r.reference && <span>· {r.reference}</span>}
                            {r.office && <span>· {r.office}</span>}
                            {r.vehicles && (
                              <Link href={`/admin/stock/${r.vehicles.id}`} className="font-semibold text-brand-700 hover:underline">
                                · {r.vehicles.stock_no}
                              </Link>
                            )}
                          </div>
                        </td>
                        <td className="whitespace-nowrap text-right tabular-nums">{money(Number(r.amount), r.currency)}</td>
                        <td className="whitespace-nowrap text-right font-semibold tabular-nums">{money(Number(r.amount_jpy), "JPY")}</td>
                        <td className="whitespace-nowrap text-right">
                          {r.receipt_path && (
                            <a href={`/api/expense-receipt/${r.id}`} target="_blank" rel="noreferrer" className="btn-ghost p-1.5" title="Receipt" aria-label={`Receipt for expense #${r.id}`}>
                              <FileText className="h-4 w-4" />
                            </a>
                          )}
                          <Link href={`/admin/expenses?${filterQuery(f)}&edit=${r.id}`} className="btn-ghost p-1.5" title="Edit" aria-label={`Edit expense #${r.id}`}>
                            <Pencil className="h-4 w-4" />
                          </Link>
                          <DeleteExpenseButton id={r.id} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-50 font-semibold">
                      <td colSpan={3} className="text-right">
                        Total
                      </td>
                      <td className="text-right tabular-nums">{money(total, "JPY")}</td>
                      <td />
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        </div>
        <div className="xl:sticky xl:top-20">
          <ExpenseForm editing={editRow} stockNo={editRow?.vehicles?.stock_no ?? null} rates={rates} offices={(settings?.offices ?? []) as string[]} fixedOffice={fixedOffice} />
        </div>
      </div>
    </>
  );
}
