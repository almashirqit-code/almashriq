import Link from "next/link";
import { UserPlus, Mail, Phone, MessageCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import { num } from "@/lib/format";
import { PageHeader, Badge, Empty, Stat } from "@/components/ui";
import { loadStaff } from "../customers/staff";
import { SignupControls } from "./signup-controls";

export const metadata = { title: "Portal sign-ups" };

type Row = {
  user_id: string;
  customer_id: string | null;
  status: "pending" | "active" | "rejected";
  email: string;
  full_name: string | null;
  company: string | null;
  phone: string | null;
  whatsapp: string | null;
  country: string | null;
  port: string | null;
  approved_at: string | null;
  created_at: string;
};
type Cust = { id: string; customer_no: number; name: string; email: string | null; company: string | null };

const STATUS_STYLE: Record<Row["status"], string> = {
  pending: "bg-amber-50 text-amber-800 ring-amber-200",
  active: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  rejected: "bg-slate-100 text-slate-600 ring-slate-200",
};
const FILTERS = ["pending", "active", "rejected", "all"] as const;
const when = (d: string) => new Date(d).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" });

/** Customers who signed up on the website: link each to a customer record and assign their agent. */
export default async function PortalSignupsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  await requireRole(["admin", "manager"]);
  const sp = await searchParams;
  const status = (FILTERS as readonly string[]).includes(sp.status ?? "") ? (sp.status as (typeof FILTERS)[number]) : "pending";
  const supabase = await createClient();

  let query = supabase.from("portal_accounts").select("*").order("created_at", { ascending: false }).limit(200);
  if (status !== "all") query = query.eq("status", status);
  const [{ data }, { count: pendingCount }, staff] = await Promise.all([
    query,
    supabase.from("portal_accounts").select("user_id", { count: "exact", head: true }).eq("status", "pending"),
    loadStaff(),
  ]);
  const rows = (data ?? []) as Row[];

  // Existing customers with the same email (suggested link) and the ones already linked.
  const emails = [...new Set(rows.filter((r) => r.status === "pending").map((r) => r.email.toLowerCase()))];
  const linkedIds = [...new Set(rows.map((r) => r.customer_id).filter(Boolean))] as string[];
  const [{ data: matched }, { data: linked }] = await Promise.all([
    emails.length
      ? supabase.from("customers").select("id, customer_no, name, email, company").in("email", emails).limit(100)
      : Promise.resolve({ data: [] as Cust[] }),
    linkedIds.length ? supabase.from("customers").select("id, customer_no, name, email, company").in("id", linkedIds) : Promise.resolve({ data: [] as Cust[] }),
  ]);
  const byEmail = new Map<string, Cust[]>();
  for (const c of (matched ?? []) as Cust[]) {
    const k = (c.email ?? "").toLowerCase();
    byEmail.set(k, [...(byEmail.get(k) ?? []), c]);
  }
  const linkedById = new Map(((linked ?? []) as Cust[]).map((c) => [c.id, c]));
  const staffOptions = staff.map((s) => ({ id: s.id, label: s.name }));
  const custLabel = (c: Cust) => `#${c.customer_no} ${c.name}${c.company ? ` (${c.company})` : ""}`;

  return (
    <>
      <PageHeader icon={<UserPlus />} tone="fuchsia" title="Portal sign-ups" subtitle="Customers who created an account on the website. Link each one to a customer record and assign their agent." />
      <div className="mb-5 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
        <Stat tone="amber" label="Waiting for approval" value={num(pendingCount ?? 0)} />
        <Stat tone="violet" label="Showing" value={num(rows.length)} />
      </div>

      <div className="card overflow-hidden">
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 p-3">
          {FILTERS.map((f) => (
            <Link
              key={f}
              href={`/admin/portal-signups?status=${f}`}
              className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ring-1 ${f === status ? "bg-slate-900 text-white ring-slate-900" : "text-slate-600 ring-slate-200 hover:bg-slate-50"}`}
            >
              {f}
            </Link>
          ))}
        </div>
        {rows.length === 0 ? (
          <Empty>{status === "pending" ? "No sign-ups waiting. New ones appear here as soon as a customer confirms their email." : "Nothing here."}</Empty>
        ) : (
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Contact</th>
                  <th>Signed up</th>
                  <th>Status</th>
                  <th>Link &amp; assign</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const linkedCust = r.customer_id ? linkedById.get(r.customer_id) : undefined;
                  return (
                    <tr key={r.user_id} className={r.status === "pending" ? "bg-amber-50/30" : ""}>
                      <td className="max-w-[16rem]">
                        <div className="font-semibold text-slate-800">{r.full_name || "—"}</div>
                        {r.company && <div className="text-xs text-slate-500">{r.company}</div>}
                        <div className="text-xs text-slate-500">{[r.country, r.port].filter(Boolean).join(" · ")}</div>
                      </td>
                      <td className="text-xs text-slate-600">
                        <div className="inline-flex items-center gap-1">
                          <Mail className="h-3 w-3" /> {r.email}
                        </div>
                        {r.phone && (
                          <div className="flex items-center gap-1">
                            <Phone className="h-3 w-3" /> {r.phone}
                          </div>
                        )}
                        {r.whatsapp && (
                          <div className="flex items-center gap-1">
                            <MessageCircle className="h-3 w-3" /> {r.whatsapp}
                          </div>
                        )}
                      </td>
                      <td className="whitespace-nowrap text-xs text-slate-500">{when(r.created_at)}</td>
                      <td>
                        <Badge className={STATUS_STYLE[r.status]}>{r.status}</Badge>
                      </td>
                      <td className="min-w-[22rem]">
                        {r.status === "pending" ? (
                          <SignupControls
                            userId={r.user_id}
                            matches={(byEmail.get(r.email.toLowerCase()) ?? []).map((c) => ({ id: c.id, label: custLabel(c) }))}
                            staff={staffOptions}
                          />
                        ) : linkedCust ? (
                          <div className="text-sm">
                            <Link href={`/admin/customers/${linkedCust.id}`} className="font-semibold text-brand-700 hover:underline">
                              {custLabel(linkedCust)}
                            </Link>
                            {r.approved_at && <div className="text-xs text-slate-500">Approved {when(r.approved_at)}</div>}
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">{r.approved_at ? `Rejected ${when(r.approved_at)}` : "—"}</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
