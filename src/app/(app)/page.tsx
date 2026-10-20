import Link from "next/link";
import { Car, Clock, TrendingUp, Wallet, Users, Package } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getProfile, can } from "@/lib/auth";
import { getT } from "@/lib/i18n/server";
import { money, date, num, vehicleTitle } from "@/lib/format";
import type { Currency, InvoiceStatus, VehicleStatus } from "@/lib/types";
import { PageHeader, Stat, InvoiceStatusBadge, VehicleStatusBadge, Empty } from "@/components/ui";
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
      supabase.from("vehicles").select("make, purchase_price, purchase_tax, expenses, ownership, status").in("status", ["in_stock", "reserved"]).limit(20000),
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
      stockValue += Number(v.purchase_price || 0) + Number(v.purchase_tax || 0) + Number(v.expenses || 0);
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
      <PageHeader title={t("dash_title")} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          label={t("dash_in_stock")}
          value={num(inStock.count ?? 0, locale)}
          hint={thirdPartyInStock ? t("dash_third_party", { count: num(thirdPartyInStock, locale) }) : undefined}
          icon={<Car className="h-5 w-5" />}
        />
        <Stat label={t("dash_reserved")} value={num(reserved.count ?? 0, locale)} icon={<Clock className="h-5 w-5" />} />
        <Stat label={t("dash_sold_month")} value={num(soldThisMonth, locale)} icon={<Package className="h-5 w-5" />} />
        {can.seeCost(profile.role) ? (
          <Stat label={t("dash_stock_value")} value={money(stockValue, "JPY", locale)} icon={<Wallet className="h-5 w-5" />} />
        ) : (
          <Stat label={t("dash_customers")} value={num(custCount.count ?? 0, locale)} icon={<Users className="h-5 w-5" />} />
        )}
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Stat label={t("dash_sales_month")} value={byCurrency(monthSales)} icon={<TrendingUp className="h-5 w-5" />} />
        <Stat label={t("dash_outstanding")} value={byCurrency(outstanding)} icon={<Wallet className="h-5 w-5" />} />
        {can.seeCost(profile.role) && (
          <Stat label={t("dash_customers")} value={num(custCount.count ?? 0, locale)} icon={<Users className="h-5 w-5" />} />
        )}
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="card p-5 lg:col-span-2">
          <h2 className="mb-4 text-sm font-semibold">{t("dash_sales_chart")}</h2>
          <SalesChart data={months.map((m) => ({ label: m.label, value: Math.round(m.jpy) }))} locale={locale} />
        </div>
        <div className="card p-5">
          <h2 className="mb-4 text-sm font-semibold">{t("dash_top_makes")}</h2>
          {topMakes.length ? <MakesChart data={topMakes} /> : <Empty>{t("no_results")}</Empty>}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
            <h2 className="text-sm font-semibold">{t("dash_recent_invoices")}</h2>
            <Link href="/invoices" className="text-xs font-medium text-brand-600 hover:underline">
              {t("view")} →
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
                        <Link href={`/invoices/${inv.id}`} className="font-medium text-brand-700 hover:underline">
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
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
            <h2 className="text-sm font-semibold">{t("dash_recent_vehicles")}</h2>
            <Link href="/stock" className="text-xs font-medium text-brand-600 hover:underline">
              {t("view")} →
            </Link>
          </div>
          {recentVeh.data?.length ? (
            <table className="table">
              <tbody>
                {recentVeh.data.map((v) => (
                  <tr key={v.id}>
                    <td>
                      <Link href={`/stock/${v.id}`} className="font-medium text-brand-700 hover:underline">
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
