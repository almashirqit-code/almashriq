import Link from "next/link";
import { RowsSelect } from "@/components/rows-select";
import { rowsParam } from "@/lib/rows";
import { Inbox, Mail, Phone, Car } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/auth";
import { num } from "@/lib/format";
import { PageHeader, Badge, Empty, Stat, NumberedPagination } from "@/components/ui";
import { loadStaff } from "../customers/staff";
import { AssignSelect } from "./inquiry-controls";
import { INQ_LABEL, INQ_STYLE } from "./status";
import { INQUIRY_STATUSES } from "./status";

export const metadata = { title: "Inquiries" };

type Row = {
  id: string;
  inquiry_no: number;
  name: string;
  email: string | null;
  phone: string | null;
  country: string | null;
  port: string | null;
  message: string | null;
  stock_no: string | null;
  vehicle_id: string | null;
  status: string;
  assigned_to: string | null;
  customer_id: string | null;
  created_at: string;
};

export default async function InquiriesPage({ searchParams }: { searchParams: Promise<{ status?: string; who?: string; q?: string; page?: string; rows?: string }> }) {
  const sp = await searchParams;
  const me = await getProfile();
  const supabase = await createClient();
  const page = Math.max(1, Number(sp.page) || 1);
  const status = sp.status ?? "open";
  const q = (sp.q ?? "").trim().replace(/[%,()]/g, " ");

  const SIZE = rowsParam(sp.rows);
  let query = supabase.from("inquiries").select("*", { count: "exact" }).order("created_at", { ascending: false }).range((page - 1) * SIZE, page * SIZE - 1);
  if (status === "open") query = query.in("status", ["new", "contacted", "quoted"]);
  else if ((INQUIRY_STATUSES as readonly string[]).includes(status)) query = query.eq("status", status);
  if (sp.who === "me") query = query.eq("assigned_to", me.id);
  else if (sp.who === "none") query = query.is("assigned_to", null);
  if (q) query = query.or(`name.ilike.%${q}%,email.ilike.%${q}%,phone.ilike.%${q}%,country.ilike.%${q}%,stock_no.ilike.%${q}%`);

  const [{ data, count }, staff, { count: newCount }, { count: unassigned }] = await Promise.all([
    query,
    me.role === "sales" ? Promise.resolve([]) : loadStaff(),
    supabase.from("inquiries").select("id", { count: "exact", head: true }).eq("status", "new"),
    supabase.from("inquiries").select("id", { count: "exact", head: true }).is("assigned_to", null).in("status", ["new", "contacted", "quoted"]),
  ]);
  const rows = (data ?? []) as Row[];
  const pages = Math.max(1, Math.ceil((count ?? 0) / SIZE));
  const staffName = new Map(staff.map((s) => [s.id, s.name]));
  const href = (over: Record<string, string>) => {
    const u = new URLSearchParams({ status, ...(sp.who ? { who: sp.who } : {}), ...(sp.q ? { q: sp.q } : {}), ...(sp.rows ? { rows: sp.rows } : {}), ...over });
    return `/admin/inquiries?${u}`;
  };

  return (
    <>
      <PageHeader icon={<Inbox />} tone="fuchsia" title="Inquiries" subtitle="Requests from the website — assign each one to a sales agent" />
      <div className="mb-5 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
        <Stat tone="brand" label="New" value={num(newCount ?? 0)} />
        {me.role !== "sales" && <Stat tone="amber" label="Open & unassigned" value={num(unassigned ?? 0)} />}
        <Stat tone="violet" label="Showing" value={num(count ?? 0)} />
      </div>

      <div className="card overflow-hidden">
        <form action="/admin/inquiries" className="flex flex-wrap items-center gap-2 border-b border-slate-100 p-3">
          <RowsSelect value={SIZE} />
          <input name="q" defaultValue={sp.q ?? ""} placeholder="Name, email, phone, country, stock no…" className="input w-64" />
          <select name="status" defaultValue={status} className="input w-auto">
            <option value="open">Open (new, contacted, quoted)</option>
            <option value="all">All</option>
            {INQUIRY_STATUSES.map((s) => (
              <option key={s} value={s}>
                {INQ_LABEL[s]}
              </option>
            ))}
          </select>
          <select name="who" defaultValue={sp.who ?? ""} className="input w-auto">
            <option value="">{me.role === "sales" ? "Mine" : "Everyone"}</option>
            <option value="me">Assigned to me</option>
            {me.role !== "sales" && <option value="none">Unassigned</option>}
          </select>
          <button className="btn-secondary">Filter</button>
          <div className="ml-auto">
            <NumberedPagination page={page} pages={pages} makeHref={(p) => href({ page: String(p) })} />
          </div>
        </form>
        {rows.length === 0 ? (
          <Empty>No inquiries here.</Empty>
        ) : (
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>From</th>
                  <th>Car</th>
                  <th>Message</th>
                  <th>Assigned</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className={r.status === "new" ? "bg-rose-50/30" : ""}>
                    <td className="whitespace-nowrap">
                      <Link href={`/admin/inquiries/${r.id}`} className="font-bold text-brand-700 hover:underline">
                        #{r.inquiry_no}
                      </Link>
                      <div className="text-xs text-slate-500">{new Date(r.created_at).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}</div>
                    </td>
                    <td className="max-w-[15rem]">
                      <Link href={`/admin/inquiries/${r.id}`} className="font-semibold text-slate-800 hover:text-brand-700">
                        {r.name}
                      </Link>
                      <div className="truncate text-xs text-slate-500">{[r.country, r.port].filter(Boolean).join(" · ")}</div>
                      <div className="flex flex-wrap gap-x-3 text-xs text-slate-500">
                        {r.email && (
                          <span className="inline-flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {r.email}
                          </span>
                        )}
                        {r.phone && (
                          <span className="inline-flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {r.phone}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="whitespace-nowrap">
                      {r.stock_no ? (
                        <span className="inline-flex items-center gap-1 text-sm font-semibold text-slate-700">
                          <Car className="h-3.5 w-3.5 text-rose-500" />
                          {r.vehicle_id ? (
                            <Link href={`/admin/stock/${r.vehicle_id}`} className="hover:text-brand-700">
                              {r.stock_no}
                            </Link>
                          ) : (
                            r.stock_no
                          )}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">General</span>
                      )}
                    </td>
                    <td className="max-w-[22rem]">
                      <p className="line-clamp-2 text-sm text-slate-600">{r.message ?? "—"}</p>
                    </td>
                    <td>
                      {me.role === "sales" ? (
                        <span className="text-xs text-slate-500">You</span>
                      ) : (
                        <AssignSelect id={r.id} value={r.assigned_to} staff={staff} />
                      )}
                      {r.assigned_to && !staffName.has(r.assigned_to) && me.role !== "sales" && <div className="text-[11px] text-slate-400">other office</div>}
                    </td>
                    <td>
                      <Badge className={INQ_STYLE[r.status]}>{INQ_LABEL[r.status]}</Badge>
                    </td>
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
