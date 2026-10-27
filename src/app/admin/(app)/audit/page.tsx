import Link from "next/link";
import { History } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import { PageHeader, Empty, NumberedPagination } from "@/components/ui";

export const metadata = { title: "Audit trail" };

/** Tables recorded by the audit trigger (migration 0035) and where each record opens. */
const TABLES: Record<string, { label: string; href?: (id: string) => string }> = {
  invoices: { label: "Invoice", href: (id) => `/admin/invoices/${id}` },
  invoice_items: { label: "Invoice line" },
  payments: { label: "Payment" },
  remittances: { label: "TT", href: (id) => `/admin/remittances/${id}` },
  remittance_allocations: { label: "TT allocation" },
  reservations: { label: "Reservation", href: (id) => `/admin/reservations/${id}` },
  vehicles: { label: "Vehicle", href: (id) => `/admin/stock/${id}` },
  customers: { label: "Customer", href: (id) => `/admin/customers/${id}` },
  payment_slips: { label: "Payment slip" },
  company_expenses: { label: "Expense", href: () => `/admin/expenses` },
};
const ACTION_STYLE: Record<string, string> = { insert: "bg-emerald-50 text-emerald-700", update: "bg-sky-50 text-sky-700", delete: "bg-red-50 text-red-700" };
const ACTION_LABEL: Record<string, string> = { insert: "Created", update: "Changed", delete: "Deleted" };
const SIZE = 100;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

type Row = { id: number; table_name: string; row_id: string | null; action: string; changed_by: string | null; changed_at: string; old_data: Record<string, unknown> | null; new_data: Record<string, unknown> | null };

const show = (v: unknown) => {
  if (v === null || v === undefined || v === "") return "—";
  const s = typeof v === "object" ? JSON.stringify(v) : String(v);
  return s.length > 120 ? `${s.slice(0, 117)}…` : s;
};
/** A short label for a created/deleted record. */
const summary = (d: Record<string, unknown> | null) =>
  d ? ["invoice_no", "stock_no", "name", "description", "amount", "total", "remit_amount", "status"].filter((k) => d[k] != null && d[k] !== "").map((k) => `${k}: ${show(d[k])}`).slice(0, 4).join(" · ") : "";

/** Who created, changed or deleted money and stock records, and when (admins only). */
export default async function AuditPage({ searchParams }: { searchParams: Promise<{ table?: string; action?: string; user?: string; from?: string; to?: string; row?: string; page?: string }> }) {
  await requireRole(["admin"]);
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const supabase = await createClient();

  let q = supabase
    .from("audit_log")
    .select("*", { count: "exact" })
    .order("changed_at", { ascending: false })
    .range((page - 1) * SIZE, page * SIZE - 1);
  if (sp.table && TABLES[sp.table]) q = q.eq("table_name", sp.table);
  if (sp.action && ACTION_LABEL[sp.action]) q = q.eq("action", sp.action);
  if (sp.user && /^[0-9a-f-]{36}$/i.test(sp.user)) q = q.eq("changed_by", sp.user);
  if (sp.row && /^[\w-]{1,40}$/.test(sp.row)) q = q.eq("row_id", sp.row);
  if (DATE.test(sp.from ?? "")) q = q.gte("changed_at", sp.from!);
  if (DATE.test(sp.to ?? "")) q = q.lt("changed_at", new Date(new Date(sp.to!).getTime() + 86400000).toISOString());

  const [{ data, count }, { data: staff }] = await Promise.all([q, supabase.from("profiles").select("id, full_name, email").order("full_name")]);
  const rows = (data ?? []) as Row[];
  const who = new Map((staff ?? []).map((p) => [p.id as string, (p.full_name || p.email) as string]));
  const pages = Math.max(1, Math.ceil((count ?? 0) / SIZE));
  const href = (n: number) => {
    const u = new URLSearchParams(Object.entries(sp).filter(([k, v]) => k !== "page" && v) as [string, string][]);
    u.set("page", String(n));
    return `/admin/audit?${u}`;
  };

  return (
    <>
      <PageHeader icon={<History />} tone="slate" title="Audit trail" subtitle="Every create, change and delete on invoices, payments, TTs, reservations, vehicles, customers, payment slips and expenses — who did it and when. It can't be edited." />

      <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
        <form action="/admin/audit" className="flex flex-wrap items-end gap-2">
          <select name="table" defaultValue={sp.table ?? ""} aria-label="Record type" className="input w-auto">
            <option value="">All records</option>
            {Object.entries(TABLES).map(([k, v]) => (
              <option key={k} value={k}>
                {v.label}
              </option>
            ))}
          </select>
          <select name="action" defaultValue={sp.action ?? ""} aria-label="Action" className="input w-auto">
            <option value="">All actions</option>
            {Object.entries(ACTION_LABEL).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
          <select name="user" defaultValue={sp.user ?? ""} aria-label="Staff member" className="input w-auto">
            <option value="">Everyone</option>
            {(staff ?? []).map((p) => (
              <option key={p.id} value={p.id}>
                {p.full_name || p.email}
              </option>
            ))}
          </select>
          <input type="date" name="from" defaultValue={sp.from ?? ""} aria-label="From" className="input w-auto" />
          <input type="date" name="to" defaultValue={sp.to ?? ""} aria-label="To" className="input w-auto" />
          {sp.row && <input type="hidden" name="row" value={sp.row} />}
          <button className="btn-secondary">Show</button>
          {Object.values(sp).some(Boolean) && (
            <Link href="/admin/audit" className="btn-ghost">
              Clear
            </Link>
          )}
        </form>
        <NumberedPagination page={page} pages={pages} makeHref={href} />
      </div>

      <div className="card overflow-hidden">
        {rows.length === 0 ? (
          <Empty>No changes recorded for these filters yet. The trail starts from the day it was switched on.</Empty>
        ) : (
          <ul className="divide-y divide-slate-100">
            {rows.map((r) => {
              const t = TABLES[r.table_name] ?? { label: r.table_name };
              const link = r.row_id && t.href && r.action !== "delete" ? t.href(r.row_id) : null;
              const changes = r.action === "update" ? Object.keys(r.new_data ?? {}) : [];
              return (
                <li key={r.id} className="grid gap-2 px-4 py-3 text-sm sm:grid-cols-[11rem_minmax(0,1fr)]">
                  <div className="text-xs text-slate-500">
                    <div className="font-medium text-slate-700">{new Date(r.changed_at).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}</div>
                    <div>{r.changed_by ? who.get(r.changed_by) ?? "Customer / system" : "System"}</div>
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${ACTION_STYLE[r.action]}`}>{ACTION_LABEL[r.action]}</span>
                      <span className="font-semibold text-slate-800">{t.label}</span>
                      {link ? (
                        <Link href={link} className="font-mono text-xs text-brand-700 hover:underline">
                          {r.row_id}
                        </Link>
                      ) : (
                        <span className="font-mono text-xs text-slate-400">{r.row_id}</span>
                      )}
                      {r.row_id && (
                        <Link href={`/admin/audit?table=${r.table_name}&row=${encodeURIComponent(r.row_id)}`} className="text-xs text-slate-500 hover:underline">
                          history
                        </Link>
                      )}
                    </div>
                    {r.action !== "update" ? (
                      <div className="mt-1 truncate text-xs text-slate-600">{summary(r.action === "insert" ? r.new_data : r.old_data)}</div>
                    ) : (
                      <ul className="mt-1 space-y-0.5 text-xs">
                        {changes.slice(0, 12).map((k) => (
                          <li key={k} className="break-words">
                            <span className="font-semibold text-slate-700">{k}</span>: <span className="text-red-700 line-through decoration-red-300">{show(r.old_data?.[k])}</span> →{" "}
                            <span className="text-emerald-700">{show(r.new_data?.[k])}</span>
                          </li>
                        ))}
                        {changes.length > 12 && <li className="text-slate-400">+{changes.length - 12} more fields</li>}
                      </ul>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </>
  );
}
