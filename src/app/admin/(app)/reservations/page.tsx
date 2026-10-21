import Link from "next/link";
import { BookmarkCheck, TrendingUp, Clock, CheckCircle2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getProfile, can } from "@/lib/auth";
import { getT } from "@/lib/i18n/server";
import { date, money, num, vehicleTitle } from "@/lib/format";
import { RESERVATION_STATUSES, type Reservation } from "@/lib/types";
import type { DictKey } from "@/lib/i18n/dictionaries";
import { PageHeader, Badge, Empty, Stat, NumberedPagination } from "@/components/ui";
import { RES_STATUS_BADGE } from "./status";

export const metadata = { title: "Reservations" };
const SIZE = 25;

type Row = Reservation & {
  vehicles: { id: string; stock_no: string; make: string; model: string; grade: string | null; year: number | null } | null;
  customers: { id: string; name: string; customer_no: number } | null;
  agent: { full_name: string | null; email: string } | null;
};

export default async function ReservationsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; agent?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const profile = await getProfile();
  const { t, locale } = await getT();
  const supabase = await createClient();
  const seeCost = can.seeCost(profile.role);
  const page = Math.max(1, Number(sp.page) || 1);
  const status = sp.status === undefined ? "active" : sp.status;
  const q = (sp.q ?? "").trim().replace(/[%,()]/g, " ");

  let query = supabase
    .from("reservations")
    .select(
      "*, vehicles(id, stock_no, make, model, grade, year), customers(id, name, customer_no), agent:profiles!reservations_sales_agent_id_fkey(full_name, email)",
      { count: "exact" }
    )
    .order("created_at", { ascending: false })
    .range((page - 1) * SIZE, page * SIZE - 1);
  if ((RESERVATION_STATUSES as string[]).includes(status)) query = query.eq("status", status);
  if (sp.agent) query = query.eq("sales_agent_id", sp.agent);
  if (q) {
    const [{ data: veh }, { data: cust }] = await Promise.all([
      supabase.from("vehicles").select("id").or(`stock_no.ilike.%${q}%,chassis_no.ilike.%${q}%,model.ilike.%${q}%`).limit(500),
      supabase.from("customers").select("id").or(`name.ilike.%${q}%,company.ilike.%${q}%`).limit(500),
    ]);
    const ors = [`port_of_discharge.ilike.%${q}%`];
    if (veh?.length) ors.push(`vehicle_id.in.(${veh.map((v) => v.id).join(",")})`);
    if (cust?.length) ors.push(`customer_id.in.(${cust.map((c) => c.id).join(",")})`);
    if (/^\d+$/.test(q)) ors.push(`reservation_no.eq.${q}`);
    query = query.or(ors.join(","));
  }

  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
  const [{ data, count }, { data: agents }, { data: activeRows }, { count: invoicedMonth }] = await Promise.all([
    query,
    supabase.from("profiles").select("id, full_name, email").order("full_name"),
    supabase.from("reservations").select("profit_jpy").eq("status", "active").limit(10000),
    supabase.from("reservations").select("id", { count: "exact", head: true }).eq("status", "invoiced").gte("updated_at", monthStart),
  ]);
  const rows = (data ?? []) as unknown as Row[];
  const pages = Math.max(1, Math.ceil((count ?? 0) / SIZE));
  const activeProfit = (activeRows ?? []).reduce((s, r) => s + Number(r.profit_jpy || 0), 0);

  const href = (p: number) => {
    const u = new URLSearchParams();
    if (sp.q) u.set("q", sp.q);
    u.set("status", status);
    if (sp.agent) u.set("agent", sp.agent);
    u.set("page", String(p));
    return `/admin/reservations?${u}`;
  };

  return (
    <>
      <PageHeader icon={<BookmarkCheck />} tone="amber" title={t("rv_title")} subtitle={t("total_records", { count: num(count ?? 0, locale) })} />

      <div className="mb-5 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
        <Stat tone="amber" icon={<Clock />} label={t("rv_count")} value={num(activeRows?.length ?? 0, locale)} />
        {seeCost && (
          <Stat tone={activeProfit >= 0 ? "emerald" : "brand"} icon={<TrendingUp />} label={t("rv_profit_total")} value={money(activeProfit, "JPY", locale)} />
        )}
        <Stat tone="violet" icon={<CheckCircle2 />} label={t("rvs_invoiced")} value={num(invoicedMonth ?? 0, locale)} hint={t("dash_sold_month")} />
      </div>

      <div className="card overflow-hidden">
        <form action="/admin/reservations" className="flex flex-wrap items-center gap-2 border-b border-slate-100 p-3">
          <input name="q" defaultValue={sp.q ?? ""} placeholder={t("search_placeholder")} className="input w-64" />
          <select name="status" defaultValue={status} className="input w-auto">
            <option value="all">
              {t("status")}: {t("all")}
            </option>
            {RESERVATION_STATUSES.map((s) => (
              <option key={s} value={s}>
                {t(`rvs_${s}` as DictKey)}
              </option>
            ))}
          </select>
          <select name="agent" defaultValue={sp.agent ?? ""} className="input w-auto">
            <option value="">{t("rv_all_agents")}</option>
            {(agents ?? []).map((a) => (
              <option key={a.id} value={a.id}>
                {a.full_name || a.email}
              </option>
            ))}
          </select>
          <button className="btn-secondary">{t("search")}</button>
          <div className="ml-auto">
            <NumberedPagination page={page} pages={pages} makeHref={href} />
          </div>
        </form>
        {rows.length === 0 ? (
          <Empty>{t("rv_none")}</Empty>
        ) : (
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>{t("rv_no")}</th>
                  <th>{t("rv_vehicle")}</th>
                  <th>{t("rv_customer")}</th>
                  <th>{t("rv_agent")}</th>
                  <th>{t("rv_price_term")}</th>
                  <th className="text-right">{t("rv_sold_price")}</th>
                  <th className="text-right">{t("rv_freight")}</th>
                  {seeCost && <th className="text-right">{t("rv_profit")}</th>}
                  <th>{t("status")}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const profit = Number(r.profit_jpy);
                  return (
                    <tr key={r.id}>
                      <td className="whitespace-nowrap">
                        <Link href={`/admin/reservations/${r.id}`} className="font-semibold text-brand-700 hover:underline">
                          #{r.reservation_no}
                        </Link>
                        <div className="text-xs text-slate-500">{date(r.created_at.slice(0, 10), locale)}</div>
                      </td>
                      <td>
                        {r.vehicles && (
                          <>
                            <Link href={`/admin/stock/${r.vehicles.id}`} className="font-medium text-slate-800 hover:text-brand-700">
                              {r.vehicles.stock_no}
                            </Link>
                            <div className="text-xs text-slate-500">{vehicleTitle(r.vehicles)}</div>
                          </>
                        )}
                      </td>
                      <td>
                        {r.customers && (
                          <Link href={`/admin/customers/${r.customers.id}`} className="hover:text-brand-700">
                            <span className="text-xs text-slate-400">{r.customers.customer_no} · </span>
                            {r.customers.name}
                          </Link>
                        )}
                      </td>
                      <td className="whitespace-nowrap text-slate-600">{r.agent?.full_name || r.agent?.email || "—"}</td>
                      <td className="whitespace-nowrap">
                        <span className="font-semibold">{r.price_term === "CNF" ? "C&F" : r.price_term}</span>
                        <div className="text-xs text-slate-500">
                          {[r.shipment_type ? t(`ship_${r.shipment_type}` as DictKey) : null, r.port_of_discharge].filter(Boolean).join(" · ")}
                        </div>
                      </td>
                      <td className="whitespace-nowrap text-right font-semibold tabular-nums">{money(Number(r.sold_price), r.currency, locale)}</td>
                      <td className="whitespace-nowrap text-right tabular-nums text-slate-600">
                        {Number(r.freight) + Number(r.insurance) > 0 ? money(Number(r.freight) + Number(r.insurance), r.currency, locale) : "—"}
                      </td>
                      {seeCost && (
                        <td className={`whitespace-nowrap text-right font-bold tabular-nums ${profit >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                          {money(profit, "JPY", locale)}
                        </td>
                      )}
                      <td>
                        <Badge className={RES_STATUS_BADGE[r.status]}>{t(`rvs_${r.status}` as DictKey)}</Badge>
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
