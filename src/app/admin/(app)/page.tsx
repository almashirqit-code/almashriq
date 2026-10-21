import Link from "next/link";
import { Car, Clock, TrendingUp, Wallet, Users, Package, Plus, FileText, Banknote, Upload, ArrowUpRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getProfile, can } from "@/lib/auth";
import { getT } from "@/lib/i18n/server";
import { money, date, num, vehicleTitle } from "@/lib/format";
import { costJpy } from "@/lib/branches";
import type { Currency, InvoiceStatus, VehicleStatus } from "@/lib/types";
import { Stat, InvoiceStatusBadge, VehicleStatusBadge, Empty, IconChip } from "@/components/ui";
import { Greeting } from "./greeting";
import { SalesChart, MakesChart } from "./dashboard-charts";
import type { DictKey } from "@/lib/i18n/dictionaries";

const ACTIVE: InvoiceStatus[] = ["issued", "partially_paid", "paid"];

export default async function DashboardPage() {
  const profile = await getProfile();
  const { t, locale } = await getT();
  const supabase = await createClient();

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const yearAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1).toISOString().slice(0, 10);

  const countStatus = (s: VehicleStatus) =>
    supabase.from("vehicles").select("id", { count: "exact", head: true }).eq("status", s);

  const [inStock, reserved, stockRows, salesRows, openRows, soldItems, recentInv, recentVeh, custCount] =
    await Promise.all([
      countStatus("in_stock"),
      countStatus("reserved"),
      supabase.from("vehicles").select("make, purchase_price, purchase_tax, expenses, cost_fx_rate, ownership, status").in("status", ["in_stock", "reserved"]).limit(20000),
      supabase
        .from("invoices")
        .select("issue_date, total, currency, exchange_rate")
        .in("status", ACTIVE)
        .gte("issue_date", yearAgo)
        .limit(20000),
      supabase.from("invoices").select("total, amount_paid, currency").in("status", ["issued", "partially_paid"]).limit(20000),
      supabase
        .from("invoice_items")
        .select("vehicle_id, invoices!inner(issue_date, status)")
        .not("vehicle_id", "is", null)
        .gte("invoices.issue_date", monthStart)
        .in("invoices.status", ACTIVE),
      supabase
        .from("invoices")
        .select("id, invoice_no, issue_date, total, currency, status, customers(name)")
        .order("created_at", { ascending: false })
        .limit(6),
      supabase
        .from("vehicles")
        .select("id, stock_no, make, model, grade, year, status, created_at")
        .order("created_at", { ascending: false })
        .limit(6),
      supabase.from("customers").select("id", { count: "exact", head: true }),
    ]);

  // Stock value + makes
  let stockValue = 0;
  const makes = new Map<string, number>();
  let thirdPartyInStock = 0;
  for (const v of stockRows.data ?? []) {
    if (v.ownership === "third_party") {
      if (v.status === "in_stock") thirdPartyInStock++;
    } else {
      stockValue += costJpy(v);
    }
    makes.set(v.make, (makes.get(v.make) ?? 0) + 1);
  }
  const topMakes = [...makes.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([make, count]) => ({ make, count }));

  // Sales per month (JPY equivalent) + this month by currency
  const months: { key: string; label: string; jpy: number }[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
      label: new Intl.DateTimeFormat(locale === "ja" ? "ja-JP" : "en-US", { month: "short" }).format(d),
      jpy: 0,
    });
  }
  const monthSales = new Map<Currency, number>();
  for (const inv of salesRows.data ?? []) {
    const key = String(inv.issue_date).slice(0, 7);
    const m = months.find((x) => x.key === key);
    if (m) m.jpy += Number(inv.total) * Number(inv.exchange_rate || 1);
    if (inv.issue_date >= monthStart) {
      monthSales.set(inv.currency, (monthSales.get(inv.currency) ?? 0) + Number(inv.total));
    }
  }

  const outstanding = new Map<Currency, number>();
  for (const inv of openRows.data ?? []) {
    outstanding.set(inv.currency, (outstanding.get(inv.currency) ?? 0) + Number(inv.total) - Number(inv.amount_paid));
  }

  const soldThisMonth = new Set((soldItems.data ?? []).map((r) => r.vehicle_id)).size;

  const byCurrency = (m: Map<Currency, number>) =>
    m.size === 0 ? (
      <span>—</span>
    ) : (
      <div className="space-y-0.5">
        {[...m.entries()].map(([c, v]) => (
          <div key={c} className="text-xl">
            {money(v, c, locale)}
          </div>
        ))}
      </div>
    );

  return (
    <>
      <section className="relative mb-6 overflow-hidden rounded-3xl bg-gradient-to-br from-brand-600 via-rose-500 to-orange-400 p-6 text-white shadow-xl shadow-brand-600/20 sm:p-8">
        <div className="pointer-events-none absolute -right-16 -top-20 h-72 w-72 rounded-full bg-fuchsia-500/40 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 left-1/3 h-64 w-64 rounded-full bg-amber-300/40 blur-3xl" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.18)_1px,transparent_0)] [background-size:22px_22px] opacity-40" />
        <div className="relative flex flex-wrap items-end justify-between gap-6">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-white/70">{t("dash_title")}</div>
            <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
              <Greeting name={(profile.full_name || "").split(" ")[0]} />
            </h1>
            <p className="mt-1 max-w-lg text-sm text-white/85">{t("dash_hero_sub")}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {can.editStock(profile.role) && (
              <Link href="/admin/stock/new" className="btn bg-white text-brand-700 shadow-lg shadow-black/10 hover:bg-white/90">
                <Plus className="h-4 w-4" />
                {t("top_new_vehicle")}
              </Link>
            )}
            <Link href="/admin/invoices/new" className="btn bg-white/15 text-white ring-1 ring-white/30 backdrop-blur hover:bg-white/25">
              <FileText className="h-4 w-4" />
              {t("top_new_invoice")}
            </Link>
            {can.editStock(profile.role) && (
              <>
                <Link href="/admin/remittances/new" className="btn bg-white/15 text-white ring-1 ring-white/30 backdrop-blur hover:bg-white/25">
                  <Banknote className="h-4 w-4" />
                  TT
                </Link>
                <Link href="/admin/stock/import" className="btn bg-white/15 text-white ring-1 ring-white/30 backdrop-blur hover:bg-white/25">
                  <Upload className="h-4 w-4" />
                  {t("nav_import")}
                </Link>
              </>
            )}
          </div>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <Stat
          label={t("dash_in_stock")}
          value={num(inStock.count ?? 0, locale)}
          hint={thirdPartyInStock ? t("dash_third_party", { count: num(thirdPartyInStock, locale) }) : undefined}
          icon={<Car />}
          tone="brand"
        />
        <Stat label={t("dash_reserved")} value={num(reserved.count ?? 0, locale)} icon={<Clock />} tone="amber" />
        <Stat label={t("dash_sold_month")} value={num(soldThisMonth, locale)} icon={<Package />} tone="violet" />
        {can.seeCost(profile.role) ? (
          <Stat label={t("dash_stock_value")} value={money(stockValue, "JPY", locale)} icon={<Wallet />} tone="emerald" />
        ) : (
          <Stat label={t("dash_customers")} value={num(custCount.count ?? 0, locale)} icon={<Users />} tone="sky" />
        )}
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Stat label={t("dash_sales_month")} value={byCurrency(monthSales)} icon={<TrendingUp />} tone="fuchsia" />
        <Stat label={t("dash_outstanding")} value={byCurrency(outstanding)} icon={<Wallet />} tone="cyan" />
        {can.seeCost(profile.role) && (
          <Stat label={t("dash_customers")} value={num(custCount.count ?? 0, locale)} icon={<Users />} tone="sky" />
        )}
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="card p-5 lg:col-span-2">
          <h2 className="card-title mb-4">
            <IconChip tone="brand" size="sm">
              <TrendingUp />
            </IconChip>
            {t("dash_sales_chart")}
          </h2>
          <SalesChart data={months.map((m) => ({ label: m.label, value: Math.round(m.jpy) }))} locale={locale} />
        </div>
        <div className="card p-5">
          <h2 className="card-title mb-4">
            <IconChip tone="violet" size="sm">
              <Car />
            </IconChip>
            {t("dash_top_makes")}
          </h2>
          {topMakes.length ? <MakesChart data={topMakes} /> : <Empty>{t("no_results")}</Empty>}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="card overflow-hidden">
          <div className="card-head">
            <h2 className="card-title">
              <IconChip tone="fuchsia" size="sm">
                <FileText />
              </IconChip>
              {t("dash_recent_invoices")}
            </h2>
            <Link href="/admin/invoices" className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600 transition hover:bg-brand-50 hover:text-brand-700">
              {t("view")} <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          {recentInv.data?.length ? (
            <table className="table">
              <tbody>
                {recentInv.data.map((inv) => {
                  const cust = inv.customers as unknown as { name: string } | null;
                  return (
                    <tr key={inv.id}>
                      <td>
                        <Link href={`/admin/invoices/${inv.id}`} className="font-medium text-brand-700 hover:underline">
                          {inv.invoice_no}
                        </Link>
                        <div className="text-xs text-slate-500">{cust?.name}</div>
                      </td>
                      <td className="text-slate-500">{date(inv.issue_date, locale)}</td>
                      <td className="text-right tabular-nums">{money(inv.total, inv.currency, locale)}</td>
                      <td className="text-right">
                        <InvoiceStatusBadge status={inv.status} label={t(`is_${inv.status}` as DictKey)} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <Empty>{t("no_results")}</Empty>
          )}
        </div>
        <div className="card overflow-hidden">
          <div className="card-head">
            <h2 className="card-title">
              <IconChip tone="amber" size="sm">
                <Car />
              </IconChip>
              {t("dash_recent_vehicles")}
            </h2>
            <Link href="/admin/stock" className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600 transition hover:bg-brand-50 hover:text-brand-700">
              {t("view")} <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          {recentVeh.data?.length ? (
            <table className="table">
              <tbody>
                {recentVeh.data.map((v) => (
                  <tr key={v.id}>
                    <td>
                      <Link href={`/admin/stock/${v.id}`} className="font-medium text-brand-700 hover:underline">
                        {v.stock_no}
                      </Link>
                    </td>
                    <td>{vehicleTitle(v)}</td>
                    <td className="text-right">
                      <VehicleStatusBadge status={v.status} label={t(`vs_${v.status}` as DictKey)} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <Empty>{t("no_results")}</Empty>
          )}
        </div>
      </div>
    </>
  );
}
