import Link from "next/link";
import { BookOpen, Download, BadgeCheck, Printer, FileSpreadsheet } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { money, num } from "@/lib/format";
import type { Currency } from "@/lib/types";
import { PageHeader, Stat, Empty } from "@/components/ui";
import { PrintButton } from "@/components/buttons";
import { getDisplayCurrency } from "@/lib/display-currency";
import { loadStaff } from "../customers/staff";
import { loadCustomerOptions, loadCustomerSoa, loadAgentSoa } from "./soa";
import { readPeriod, loadEntries, totals, loadProfit, loadReceivables, ENTRY_LABEL, AGE_BUCKETS, type EntryKind, type Period } from "./data";

export const metadata = { title: "Ledger" };

const TABS = [
  { key: "entries", label: "All entries" },
  { key: "profit", label: "Profit" },
  { key: "receivables", label: "Receivables" },
  { key: "customer", label: "Customer SOA" },
  { key: "agent", label: "Agent SOA" },
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
/** Totals are kept in JPY and shown in the currency picked in the header. */
async function money2() {
  const d = await getDisplayCurrency();
  return { ...d, signed: (n: number) => <span className={n < 0 ? "text-red-600" : "text-emerald-700"}>{d.fmt(n)}</span> };
}

/** Business ledger: every money movement the ERP records, profit per car, and what customers owe. */
export default async function LedgerPage({ searchParams }: { searchParams: Promise<{ from?: string; to?: string; tab?: string; kind?: string; c?: string; a?: string }> }) {
  await requireRole(["admin", "manager"]);
  const display = await getDisplayCurrency();
  const sp = await searchParams;
  const p = readPeriod(sp);
  const tab: Tab = TABS.some((t) => t.key === sp.tab) ? (sp.tab as Tab) : "entries";
  const kind = (Object.keys(ENTRY_LABEL) as EntryKind[]).includes(sp.kind as EntryKind) ? (sp.kind as EntryKind) : null;
  const q = (extra: Record<string, string>) => new URLSearchParams({ from: p.from, to: p.to, ...extra }).toString();
  const UUID = /^[0-9a-f-]{36}$/i;
  const customerId = tab === "customer" && UUID.test(sp.c ?? "") ? sp.c! : null;
  const agentId = tab === "agent" && UUID.test(sp.a ?? "") ? sp.a! : null;
  const keep: Record<string, string> = customerId ? { c: customerId } : agentId ? { a: agentId } : {};

  return (
    <>
      <PageHeader
        icon={<BookOpen />}
        tone="emerald"
        title="Ledger"
        subtitle={`Sales, payments, TTs, car purchases and expenses in one place. Each document is converted at its own rate${display.note ? `; ${display.note}` : "."}`}
        actions={
          (tab === "customer" && !customerId) || (tab === "agent" && !agentId) ? undefined : (
            <div className="no-print flex flex-wrap gap-2">
              <a href={`/admin/ledger/export?${q({ tab, format: "xlsx", ...keep, ...(tab === "entries" && kind ? { kind } : {}) })}`} className="btn-secondary">
                <FileSpreadsheet className="h-4 w-4" /> Excel
              </a>
              {(tab === "entries" || tab === "customer") && (
                <a href={`/admin/ledger/export?${q({ tab, ...keep, ...(tab === "entries" && kind ? { kind } : {}) })}`} className="btn-ghost">
                  <Download className="h-4 w-4" /> CSV
                </a>
              )}
              {(customerId || agentId) && (
                <PrintButton>
                  <Printer className="h-4 w-4" /> Print
                </PrintButton>
              )}
            </div>
          )
        }
      />

      <div className="no-print mb-4 flex flex-wrap items-end justify-between gap-3">
        <nav className="flex flex-wrap gap-1.5" aria-label="Ledger views">
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
        {tab !== "receivables" && <PeriodForm p={p} tab={tab} keep={keep} />}
      </div>

      {tab === "entries" && <Entries p={p} kind={kind} q={q} />}
      {tab === "profit" && <Profit p={p} />}
      {tab === "receivables" && <Receivables />}
      {tab === "customer" && <CustomerSoaView p={p} customerId={customerId} />}
      {tab === "agent" && <AgentSoaView p={p} agentId={agentId} />}
    </>
  );
}

function PeriodForm({ p, tab, keep }: { p: Period; tab: Tab; keep: Record<string, string> }) {
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
        <Link key={x.label} href={`/admin/ledger?${new URLSearchParams({ tab, from: x.from, to: x.to, ...keep })}`} className={`btn-ghost py-1.5 text-xs ${p.from === x.from && p.to === x.to ? "bg-slate-100" : ""}`}>
          {x.label}
        </Link>
      ))}
      <form action="/admin/ledger" className="flex items-end gap-2">
        <input type="hidden" name="tab" value={tab} />
        {Object.entries(keep).map(([k, v]) => (
          <input key={k} type="hidden" name={k} value={v} />
        ))}
        <input type="date" name="from" defaultValue={p.from} aria-label="From" className="input w-auto py-1.5" />
        <input type="date" name="to" defaultValue={p.to} aria-label="To" className="input w-auto py-1.5" />
        <button className="btn-secondary py-1.5">Show</button>
      </form>
    </div>
  );
}

async function Entries({ p, kind, q }: { p: Period; kind: EntryKind | null; q: (x: Record<string, string>) => string }) {
  const { fmt: yen, cur, note } = await money2();
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
        {note ? `${note} ` : ""}Payments include TT amounts applied to invoices, so &quot;Payment received&quot; and &quot;TT received&quot; overlap — don&apos;t add them together. Tap a box to show only that kind.
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
                  <th className="text-right">{cur}</th>
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
  const { fmt: yen, signed, note } = await money2();
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
        {note ? `${note} ` : ""}Cost = buying price + tax + the car&apos;s own expenses (third-party cars: supplier price + expenses), plus expense-book costs booked to that car such as commission. Overheads are expenses not linked to a car.
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

/** Pick a customer or agent; keeps the period. */
function Picker({ p, tab, name, value, options, placeholder }: { p: Period; tab: Tab; name: "c" | "a"; value: string | null; options: { id: string; label: string }[]; placeholder: string }) {
  return (
    <form action="/admin/ledger" className="no-print card mb-4 flex flex-wrap items-end gap-2 p-3">
      <input type="hidden" name="tab" value={tab} />
      <input type="hidden" name="from" value={p.from} />
      <input type="hidden" name="to" value={p.to} />
      <label className="min-w-[16rem] flex-1">
        <span className="label">{placeholder}</span>
        <select name={name} defaultValue={value ?? ""} className="input" required>
          <option value="" disabled>
            Choose…
          </option>
          {options.map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
        </select>
      </label>
      <button className="btn-primary">Show statement</button>
    </form>
  );
}

const sum = (n: number, cur: Currency) => (Math.abs(n) < 0.005 ? "—" : money(n, cur));

async function CustomerSoaView({ p, customerId }: { p: Period; customerId: string | null }) {
  const customers = await loadCustomerOptions();
  const picker = (
    <Picker
      p={p}
      tab="customer"
      name="c"
      value={customerId}
      placeholder="Customer"
      options={customers.map((c) => ({ id: c.id, label: `#${c.customer_no} ${c.name}${c.company ? ` (${c.company})` : ""}` }))}
    />
  );
  if (!customerId) return picker;
  const soa = await loadCustomerSoa(customerId, p);
  if (!soa) return <>{picker}<Empty>Customer not found.</Empty></>;
  const c = soa.customer;
  return (
    <>
      {picker}
      <section className="card p-5 print:shadow-none">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Statement of account</div>
            <h2 className="text-xl font-bold text-slate-900">
              <Link href={`/admin/customers/${c.id}`} className="hover:underline">
                #{c.customer_no} {c.name}
              </Link>
            </h2>
            <div className="text-sm text-slate-500">{[c.company, c.country, c.email, c.phone].filter(Boolean).join(" · ")}</div>
            {c.agent && <div className="text-sm text-slate-500">Agent: {c.agent}</div>}
          </div>
          <div className="text-right text-sm text-slate-600">
            <div>
              Period: <b>{p.from}</b> to <b>{p.to}</b>
            </div>
          </div>
        </div>
        {soa.ledgers.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-500">No invoices or payments for this customer up to {p.to}.</p>
        ) : (
          soa.ledgers.map((l) => (
            <div key={l.currency} className="mt-5">
              <div className="mb-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {[
                  ["Opening balance", l.opening],
                  ["Invoiced", l.debit],
                  ["Paid", l.credit],
                  ["Closing balance", l.closing],
                ].map(([k, v]) => (
                  <div key={k as string} className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200">
                    <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      {k as string} ({l.currency})
                    </div>
                    <div className={`text-lg font-bold tabular-nums ${k === "Closing balance" && (v as number) > 0.004 ? "text-red-600" : "text-slate-900"}`}>{money(v as number, l.currency)}</div>
                  </div>
                ))}
              </div>
              <div className="overflow-x-auto">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Document</th>
                      <th>Detail</th>
                      <th className="text-right">Debit</th>
                      <th className="text-right">Credit</th>
                      <th className="text-right">Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="bg-slate-50">
                      <td className="text-xs text-slate-500">{p.from}</td>
                      <td colSpan={4} className="text-sm font-semibold text-slate-600">
                        Opening balance
                      </td>
                      <td className="text-right font-semibold tabular-nums">{money(l.opening, l.currency)}</td>
                    </tr>
                    {l.lines.map((x, i) => (
                      <tr key={i}>
                        <td className="whitespace-nowrap text-xs text-slate-500">{x.date}</td>
                        <td className="whitespace-nowrap font-mono text-xs">
                          <Link href={`/admin/invoices/${x.refId}`} className="text-brand-700 hover:underline">
                            {x.ref}
                          </Link>
                        </td>
                        <td className="text-sm text-slate-600">{x.detail}</td>
                        <td className="whitespace-nowrap text-right tabular-nums">{sum(x.debit, l.currency)}</td>
                        <td className="whitespace-nowrap text-right tabular-nums text-emerald-700">{sum(x.credit, l.currency)}</td>
                        <td className="whitespace-nowrap text-right font-semibold tabular-nums">{money(x.balance, l.currency)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-50 font-semibold">
                      <td colSpan={3} className="text-right">
                        Totals / closing balance
                      </td>
                      <td className="text-right tabular-nums">{money(l.debit, l.currency)}</td>
                      <td className="text-right tabular-nums">{money(l.credit, l.currency)}</td>
                      <td className="text-right tabular-nums">{money(l.closing, l.currency)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          ))
        )}
        {soa.tts.length > 0 && (
          <div className="mt-6">
            <h3 className="mb-2 text-sm font-semibold text-slate-700">TTs received in this period (for reference — applied amounts are already in the payments above)</h3>
            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th>Received</th>
                    <th>TT</th>
                    <th>Remitter / bank</th>
                    <th className="text-right">Amount</th>
                    <th className="text-right">Applied</th>
                  </tr>
                </thead>
                <tbody>
                  {soa.tts.map((t) => (
                    <tr key={t.id}>
                      <td className="text-xs text-slate-500">{t.date}</td>
                      <td>
                        <Link href={`/admin/remittances/${t.id}`} className="font-mono text-xs text-brand-700 hover:underline">
                          TT #{t.id}
                        </Link>
                      </td>
                      <td className="text-sm text-slate-600">{[t.remitter, t.bank].filter(Boolean).join(" · ")}</td>
                      <td className="text-right tabular-nums">{money(t.amount, t.currency)}</td>
                      <td className="text-right tabular-nums">{money(t.applied, t.currency)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>
    </>
  );
}

async function AgentSoaView({ p, agentId }: { p: Period; agentId: string | null }) {
  const staff = await loadStaff();
  const picker = <Picker p={p} tab="agent" name="a" value={agentId} placeholder="Sales agent" options={staff.map((s) => ({ id: s.id, label: s.name }))} />;
  if (!agentId) return picker;
  const soa = await loadAgentSoa(agentId, p);
  if (!soa) return <>{picker}<Empty>Agent not found.</Empty></>;
  return (
    <>
      {picker}
      <section className="card p-5">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Sales agent statement</div>
            <h2 className="text-xl font-bold text-slate-900">{soa.agent.name}</h2>
            <div className="text-sm text-slate-500">
              {[soa.agent.email, soa.agent.office].filter(Boolean).join(" · ")} · {num(soa.customers)} customers assigned
            </div>
          </div>
          <div className="text-right text-sm text-slate-600">
            Period: <b>{p.from}</b> to <b>{p.to}</b>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Cars sold</div>
            <div className="text-lg font-bold">{num(soa.carsSold.length)}</div>
          </div>
          {soa.totals.map((t) => (
            <div key={t.currency} className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200 sm:col-span-1">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{t.currency}: invoiced / collected / owed</div>
              <div className="text-sm font-semibold tabular-nums">
                {money(t.invoiced, t.currency)} / <span className="text-emerald-700">{money(t.collected, t.currency)}</span> / <span className={t.balance > 0.004 ? "text-red-600" : ""}>{money(t.balance, t.currency)}</span>
              </div>
            </div>
          ))}
        </div>

        <h3 className="mb-2 mt-6 text-sm font-semibold text-slate-700">Customers</h3>
        {soa.rows.length === 0 ? (
          <p className="text-sm text-slate-500">No invoices or payments for this agent&apos;s customers up to {p.to}.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Customer</th>
                  <th className="text-right">Cars</th>
                  <th className="text-right">Invoiced in period</th>
                  <th className="text-right">Collected in period</th>
                  <th className="text-right">Owed at {p.to}</th>
                  <th className="no-print" />
                </tr>
              </thead>
              <tbody>
                {soa.rows.map((r) => (
                  <tr key={`${r.id}-${r.currency}`}>
                    <td>
                      <Link href={`/admin/customers/${r.id}`} className="font-medium hover:underline">
                        #{r.customer_no} {r.name}
                      </Link>
                    </td>
                    <td className="text-right tabular-nums">{r.cars || "—"}</td>
                    <td className="text-right tabular-nums">{sum(r.invoiced, r.currency)}</td>
                    <td className="text-right tabular-nums text-emerald-700">{sum(r.collected, r.currency)}</td>
                    <td className={`text-right font-semibold tabular-nums ${r.balance > 0.004 ? "text-red-600" : ""}`}>{sum(r.balance, r.currency)}</td>
                    <td className="no-print text-right">
                      <Link href={`/admin/ledger?${new URLSearchParams({ tab: "customer", c: r.id, from: p.from, to: p.to })}`} className="text-xs font-semibold text-brand-700 hover:underline">
                        Statement →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-2">
          <div>
            <h3 className="mb-2 text-sm font-semibold text-slate-700">Cars sold in the period ({num(soa.carsSold.length)})</h3>
            {soa.carsSold.length === 0 ? (
              <p className="text-sm text-slate-500">None.</p>
            ) : (
              <ul className="divide-y divide-slate-100 text-sm">
                {soa.carsSold.map((c, i) => (
                  <li key={i} className="flex justify-between gap-3 py-1.5">
                    <Link href={`/admin/stock/${c.vehicleId}`} className="font-mono text-xs text-brand-700 hover:underline">
                      {c.stockNo}
                    </Link>
                    <span className="truncate text-slate-600">{c.customer}</span>
                    <Link href={`/admin/invoices/${c.invoiceId}`} className="whitespace-nowrap text-xs text-slate-500 hover:underline">
                      {c.invoiceNo} · {c.date}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div>
            <h3 className="mb-2 text-sm font-semibold text-slate-700">Commission paid in the period</h3>
            {soa.commissions.length === 0 ? (
              <p className="text-sm text-slate-500">None.</p>
            ) : (
              <ul className="divide-y divide-slate-100 text-sm">
                {soa.commissions.map((c) => (
                  <li key={c.vehicleId} className="flex justify-between gap-3 py-1.5">
                    <Link href={`/admin/stock/${c.vehicleId}`} className="font-mono text-xs text-brand-700 hover:underline">
                      {c.stockNo}
                    </Link>
                    <span className="text-xs text-slate-500">{c.paidOn}</span>
                    <span className="font-semibold tabular-nums">{money(c.amount, c.currency)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
        <p className="mt-4 text-xs text-slate-500">An agent&apos;s customers are the customers assigned to them. &quot;Owed&quot; is what those customers still owe on issued invoices up to the end date.</p>
      </section>
    </>
  );
}
