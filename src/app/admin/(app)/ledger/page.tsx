import Link from "next/link";
import { BookOpen, Download, BadgeCheck } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { money, num } from "@/lib/format";
import type { Currency } from "@/lib/types";
import { PageHeader, Stat, Empty } from "@/components/ui";
import { readPeriod, loadEntries, totals, loadProfit, loadReceivables, ENTRY_LABEL, AGE_BUCKETS, type EntryKind, type Period } from "./data";

export const metadata = { title: "Ledger" };

const TABS = [
  { key: "entries", label: "All entries" },
  { key: "profit", label: "Profit" },
  { key: "receivables", label: "Receivables" },
] as const;
type Tab = (typeof TABS)[number]["key"];

const KIND_STYLE: Record<EntryKind, string> = {
  sale: "bg-sky-50 text-sky-700",
  payment: "bg-emerald-50 text-emerald-700",
  tt: "bg-teal-50 text-teal-700",
  purchase: "bg-amber-50 text-amber-800",
  car_expense: "bg-orange-50 text-orange-800",
  expense: "bg-fuchsia-50 text-fuchsia-700",
};
const yen = (n: number) => money(n, "JPY");
const signed = (n: number) => <span className={n < 0 ? "text-red-600" : "text-emerald-700"}>{yen(n)}</span>;

/** Business ledger: every money movement the ERP records, profit per car, and what customers owe. */
export default async function LedgerPage({ searchParams }: { searchParams: Promise<{ from?: string; to?: string; tab?: string; kind?: string }> }) {
  await requireRole(["admin", "manager"]);
  const sp = await searchParams;
  const p = readPeriod(sp);
  const tab: Tab = TABS.some((t) => t.key === sp.tab) ? (sp.tab as Tab) : "entries";
  const kind = (Object.keys(ENTRY_LABEL) as EntryKind[]).includes(sp.kind as EntryKind) ? (sp.kind as EntryKind) : null;
  const q = (extra: Record<string, string>) => new URLSearchParams({ from: p.from, to: p.to, ...extra }).toString();

  return (
    <>
      <PageHeader
        icon={<BookOpen />}
        tone="emerald"
        title="Ledger"
        subtitle="Sales, payments, TTs, car purchases and expenses in one place. Amounts in JPY use each document's own rate."
        actions={
          tab === "entries" ? (
            <a href={`/admin/ledger/export?${q(kind ? { kind } : {})}`} className="btn-secondary">
              <Download className="h-4 w-4" /> CSV
            </a>
          ) : undefined
        }
      />

      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <nav className="flex gap-1.5" aria-label="Ledger views">
          {TABS.map((t) => (
            <Link
              key={t.key}
              href={`/admin/ledger?${q({ tab: t.key })}`}
              aria-current={tab === t.key ? "page" : undefined}
              className={`rounded-xl px-3.5 py-2 text-sm font-semibold ring-1 ${tab === t.key ? "bg-slate-900 text-white ring-slate-900" : "bg-white text-slate-600 ring-slate-200 hover:bg-slate-50"}`}
            >
              {t.label}
            </Link>
          ))}
        </nav>
        {tab !== "receivables" && <PeriodForm p={p} tab={tab} />}
      </div>

      {tab === "entries" && <Entries p={p} kind={kind} q={q} />}
      {tab === "profit" && <Profit p={p} />}
      {tab === "receivables" && <Receivables />}
    </>
  );
}

function PeriodForm({ p, tab }: { p: Period; tab: Tab }) {
  const now = new Date();
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  const presets = [
    { label: "This month", from: iso(new Date(now.getFullYear(), now.getMonth(), 1)), to: iso(now) },
    { label: "Last month", from: iso(new Date(now.getFullYear(), now.getMonth() - 1, 1)), to: iso(new Date(now.getFullYear(), now.getMonth(), 0)) },
    { label: "This year", from: `${now.getFullYear()}-01-01`, to: iso(now) },
  ];
  return (
    <div className="flex flex-wrap items-end gap-2">
      {presets.map((x) => (
        <Link key={x.label} href={`/admin/ledger?${new URLSearchParams({ tab, from: x.from, to: x.to })}`} className={`btn-ghost py-1.5 text-xs ${p.from === x.from && p.to === x.to ? "bg-slate-100" : ""}`}>
          {x.label}
        </Link>
      ))}
      <form action="/admin/ledger" className="flex items-end gap-2">
        <input type="hidden" name="tab" value={tab} />
        <input type="date" name="from" defaultValue={p.from} aria-label="From" className="input w-auto py-1.5" />
        <input type="date" name="to" defaultValue={p.to} aria-label="To" className="input w-auto py-1.5" />
        <button className="btn-secondary py-1.5">Show</button>
      </form>
    </div>
  );
}

async function Entries({ p, kind, q }: { p: Period; kind: EntryKind | null; q: (x: Record<string, string>) => string }) {
  const all = await loadEntries(p);
  const t = totals(all);
  const rows = kind ? all.filter((e) => e.kind === kind) : all;
  const card = (k: EntryKind, tone: "sky" | "emerald" | "cyan" | "amber" | "fuchsia" | "violet") => (
    <Link href={`/admin/ledger?${q(kind === k ? {} : { kind: k })}`} className={`block rounded-2xl ${kind === k ? "ring-2 ring-slate-900" : ""}`}>
      <Stat tone={tone} label={ENTRY_LABEL[k]} value={yen(t[k])} />
    </Link>
  );
  return (
    <>
      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        {card("sale", "sky")}
        {card("payment", "emerald")}
        {card("tt", "cyan")}
        {card("purchase", "amber")}
        {card("car_expense", "violet")}
        {card("expense", "fuchsia")}
      </div>
      <p className="mb-3 text-xs text-slate-500">
        Payments include TT amounts applied to invoices, so &quot;Payment received&quot; and &quot;TT received&quot; overlap — don&apos;t add them together. Tap a box to show only that kind.
      </p>
      <div className="card overflow-hidden">
        {rows.length === 0 ? (
          <Empty>Nothing recorded in this period.</Empty>
        ) : (
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Ref.</th>
                  <th>Party / detail</th>
                  <th className="text-right">Amount</th>
                  <th className="text-right">JPY</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((e, i) => (
                  <tr key={`${e.kind}-${e.ref}-${i}`}>
                    <td className="whitespace-nowrap text-xs text-slate-500">{e.date}</td>
                    <td>
                      <span className={`whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold ${KIND_STYLE[e.kind]}`}>{ENTRY_LABEL[e.kind]}</span>
                    </td>
                    <td className="whitespace-nowrap font-mono text-xs">
                      {e.href ? (
                        <Link href={e.href} className="text-brand-700 hover:underline">
                          {e.ref}
                        </Link>
                      ) : (
                        e.ref
                      )}
                    </td>
                    <td className="max-w-[22rem]">
                      <div className="truncate text-slate-800">{e.party || "—"}</div>
                      <div className="truncate text-xs text-slate-500">{e.detail}</div>
                    </td>
                    <td className="whitespace-nowrap text-right tabular-nums">{money(e.amount, e.currency)}</td>
                    <td className="whitespace-nowrap text-right font-semibold tabular-nums">{yen(e.jpy)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}

async function Profit({ p }: { p: Period }) {
  const r = await loadProfit(p);
  return (
    <>
      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
        <Stat tone="sky" label="Car sales" value={yen(r.revenue)} hint={`${num(r.cars.length)} cars invoiced`} />
        <Stat tone="amber" label="Cost of those cars" value={yen(r.cost)} />
        <Stat tone="emerald" label="Gross profit" value={signed(r.gross)} hint={r.revenue ? `${Math.round((r.gross / r.revenue) * 100)}% margin` : undefined} />
        <Stat tone="fuchsia" label="Overheads (expense book)" value={yen(r.overheads)} />
        <Stat tone="violet" label="Net profit" value={signed(r.net)} />
      </div>
      <p className="mb-3 text-xs text-slate-500">
        Cost = buying price + tax + the car&apos;s own expenses (third-party cars: supplier price + expenses), plus expense-book costs booked to that car such as commission. Overheads are expenses not linked to a car.
      </p>
      <div className="card overflow-hidden">
        {r.cars.length === 0 ? (
          <Empty>No cars invoiced in this period.</Empty>
        ) : (
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Car</th>
                  <th>Invoice</th>
                  <th className="text-right">Sale</th>
                  <th className="text-right">Cost</th>
                  <th className="text-right">Booked costs</th>
                  <th className="text-right">Profit</th>
                </tr>
              </thead>
              <tbody>
                {r.cars.map((c) => (
                  <tr key={`${c.invoiceId}-${c.vehicleId}`}>
                    <td>
                      <Link href={`/admin/stock/${c.vehicleId}`} className="font-semibold text-brand-700 hover:underline">
                        {c.stockNo}
                      </Link>
                      <div className="text-xs text-slate-500">{c.title}</div>
                      {c.commissionPaid && (
                        <span className="mt-0.5 inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                          <BadgeCheck className="h-3 w-3" /> Commission paid
                        </span>
                      )}
                    </td>
                    <td className="text-xs">
                      <Link href={`/admin/invoices/${c.invoiceId}`} className="font-mono text-brand-700 hover:underline">
                        {c.invoiceNo}
                      </Link>
                      <div className="text-slate-500">
                        {c.date} · {c.customer}
                      </div>
                    </td>
                    <td className="whitespace-nowrap text-right tabular-nums">{yen(c.saleJpy)}</td>
                    <td className="whitespace-nowrap text-right tabular-nums">{yen(c.costJpy)}</td>
                    <td className="whitespace-nowrap text-right tabular-nums">{c.extraJpy ? yen(c.extraJpy) : "—"}</td>
                    <td className="whitespace-nowrap text-right font-semibold tabular-nums">{signed(c.profitJpy)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}

async function Receivables() {
  const { list, byCurrency } = await loadReceivables();
  return (
    <>
      <div className="card mb-5 overflow-x-auto">
        <table className="table">
          <thead>
            <tr>
              <th>Currency</th>
              {AGE_BUCKETS.map((b) => (
                <th key={b} className="text-right">
                  {b}
                </th>
              ))}
              <th className="text-right">Total owed</th>
            </tr>
          </thead>
          <tbody>
            {[...byCurrency.entries()].map(([cur, row]) => (
              <tr key={cur}>
                <td className="font-semibold">{cur}</td>
                {row.map((v, i) => (
                  <td key={i} className={`whitespace-nowrap text-right tabular-nums ${i >= 3 && v > 0 ? "font-semibold text-red-600" : ""}`}>
                    {v ? money(v, cur as Currency) : "—"}
                  </td>
                ))}
                <td className="whitespace-nowrap text-right font-bold tabular-nums">{money(row.reduce((s, v) => s + v, 0), cur as Currency)}</td>
              </tr>
            ))}
            {byCurrency.size === 0 && (
              <tr>
                <td colSpan={7} className="text-center text-slate-500">
                  Nothing owed. Every invoice is paid.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {list.length > 0 && (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Invoice</th>
                  <th>Customer</th>
                  <th>Issued</th>
                  <th>Due</th>
                  <th className="text-right">Balance</th>
                  <th className="text-right">Days late</th>
                </tr>
              </thead>
              <tbody>
                {list.map((r) => (
                  <tr key={r.id}>
                    <td className="font-mono text-xs">
                      <Link href={`/admin/invoices/${r.id}`} className="text-brand-700 hover:underline">
                        {r.invoiceNo}
                      </Link>
                    </td>
                    <td>{r.customerId ? <Link href={`/admin/customers/${r.customerId}`} className="hover:underline">{r.customer}</Link> : r.customer}</td>
                    <td className="whitespace-nowrap text-xs text-slate-500">{r.issueDate}</td>
                    <td className="whitespace-nowrap text-xs text-slate-500">{r.dueDate ?? "—"}</td>
                    <td className="whitespace-nowrap text-right font-semibold tabular-nums">{money(r.balance, r.currency)}</td>
                    <td className={`whitespace-nowrap text-right tabular-nums ${r.daysLate > 60 ? "font-semibold text-red-600" : r.daysLate > 0 ? "text-amber-700" : "text-slate-500"}`}>
                      {r.daysLate || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}
