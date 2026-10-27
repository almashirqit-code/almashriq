import Link from "next/link";
import { Gauge, BadgeCheck, AlertTriangle } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getProfile, can } from "@/lib/auth";
import { getT } from "@/lib/i18n/server";
import { money, num } from "@/lib/format";
import { costJpy, branchName } from "@/lib/branches";
import { VEHICLE_STATUSES, SHIPPING_STATUSES, type VehicleStatus, type ShippingStatus } from "@/lib/types";
import type { DictKey } from "@/lib/i18n/dictionaries";
import { PageHeader, Stat, VehicleStatusBadge } from "@/components/ui";

export const metadata = { title: "Vehicles dashboard" };

type V = {
  id: string; stock_no: string; make: string; model: string; year: number | null; status: VehicleStatus; shipping_status: ShippingStatus | null;
  ownership: string; branch: string | null; purchase_date: string | null; created_at: string;
  purchase_price: number | null; purchase_tax: number | null; expenses: number | null; cost_fx_rate: number | null; commission_paid_at: string | null;
};
const TONE: Record<VehicleStatus, "emerald" | "amber" | "violet" | "sky"> = { in_stock: "emerald", reserved: "amber", sold: "violet", shipped: "sky" };
const AGES = [
  { label: "0–30 days", max: 30 },
  { label: "31–60 days", max: 60 },
  { label: "61–90 days", max: 90 },
  { label: "Over 90 days", max: Infinity },
];

/** Stock at a glance: by status, shipping stage, age in stock, make and branch; commissions still to pay. */
export default async function VehiclesDashboard() {
  const profile = await getProfile();
  const seeCost = can.seeCost(profile.role);
  const { t, locale } = await getT();
  const supabase = await createClient();
  const { data } = await supabase
    .from("vehicles")
    .select("id, stock_no, make, model, year, status, shipping_status, ownership, branch, purchase_date, created_at, purchase_price, purchase_tax, expenses, cost_fx_rate, commission_paid_at")
    .limit(50000);
  const cars = (data ?? []) as V[];
  const today = Date.now();
  const days = (v: V) => Math.max(0, Math.floor((today - new Date(v.purchase_date ?? v.created_at).getTime()) / 86400000));

  const byStatus = new Map<VehicleStatus, { n: number; value: number }>(VEHICLE_STATUSES.map((s) => [s, { n: 0, value: 0 }]));
  const ship = new Map<ShippingStatus, number>(SHIPPING_STATUSES.map((s) => [s, 0]));
  const ages = AGES.map(() => ({ n: 0, value: 0 }));
  const makes = new Map<string, Record<VehicleStatus, number>>();
  const branches = new Map<string, number>();
  const commissionDue: V[] = [];

  for (const v of cars) {
    const cost = v.ownership === "third_party" ? 0 : costJpy(v);
    const s = byStatus.get(v.status);
    if (s) (s.n++, (s.value += cost));
    if ((v.status === "sold" || v.status === "shipped") && v.shipping_status) ship.set(v.shipping_status, (ship.get(v.shipping_status) ?? 0) + 1);
    if (v.status === "in_stock") {
      const i = AGES.findIndex((a) => days(v) <= a.max);
      ages[i].n++;
      ages[i].value += cost;
      branches.set(v.branch ?? "—", (branches.get(v.branch ?? "—") ?? 0) + 1);
    }
    const m = makes.get(v.make) ?? { in_stock: 0, reserved: 0, sold: 0, shipped: 0 };
    m[v.status]++;
    makes.set(v.make, m);
    if (v.shipping_status === "delivered" && !v.commission_paid_at) commissionDue.push(v);
  }
  const topMakes = [...makes.entries()].sort((a, b) => b[1].in_stock + b[1].reserved - (a[1].in_stock + a[1].reserved)).slice(0, 12);
  const oldest = cars.filter((v) => v.status === "in_stock").sort((a, b) => days(b) - days(a)).slice(0, 10);
  const maxAge = Math.max(1, ...ages.map((a) => a.n));

  return (
    <>
      <PageHeader icon={<Gauge />} tone="sky" title="Vehicles dashboard" subtitle={`${num(cars.length, locale)} vehicles in the system`} back={{ href: "/admin/stock", label: t("nav_stock") }} />

      <div className="mb-5 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {VEHICLE_STATUSES.map((s) => (
          <Link key={s} href={`/admin/stock?status=${s}`} className="block">
            <Stat tone={TONE[s]} label={t(`vs_${s}` as DictKey)} value={num(byStatus.get(s)!.n, locale)} hint={seeCost && byStatus.get(s)!.value ? `Cost ${money(byStatus.get(s)!.value, "JPY", locale)}` : undefined} />
          </Link>
        ))}
      </div>

      <div className="mb-5 grid grid-cols-1 gap-5 lg:grid-cols-2">
        <section className="card p-5">
          <h2 className="mb-3 text-sm font-semibold">How long in stock</h2>
          <ul className="space-y-2">
            {AGES.map((a, i) => (
              <li key={a.label} className="grid grid-cols-[7rem_minmax(0,1fr)_3rem] items-center gap-2 text-sm">
                <span className={i === 3 && ages[i].n ? "font-semibold text-red-600" : ""}>{a.label}</span>
                <span className={`h-2.5 rounded-full ${i === 3 ? "bg-red-500" : i === 2 ? "bg-amber-500" : "bg-emerald-500"}`} style={{ width: `${Math.max(2, (ages[i].n / maxAge) * 100)}%` }} />
                <span className="text-right tabular-nums">{num(ages[i].n, locale)}</span>
              </li>
            ))}
          </ul>
          {seeCost && <p className="mt-3 text-xs text-slate-500">Over 90 days ties up {money(ages[3].value, "JPY", locale)} of own stock.</p>}
        </section>

        <section className="card p-5">
          <h2 className="mb-3 text-sm font-semibold">Sold cars by shipping stage</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {SHIPPING_STATUSES.map((s) => (
              <div key={s} className="rounded-xl bg-slate-50 p-3 text-center ring-1 ring-slate-200">
                <div className="text-2xl font-bold tabular-nums">{num(ship.get(s) ?? 0, locale)}</div>
                <div className="text-xs text-slate-500">{t(`ss_${s}` as DictKey)}</div>
              </div>
            ))}
          </div>
          <div className="mt-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-900 ring-1 ring-amber-200">
            <div className="flex items-center gap-2 font-semibold">
              <AlertTriangle className="h-4 w-4" /> Commission to pay: {num(commissionDue.length, locale)}
            </div>
            <p className="mt-0.5 text-xs">Delivered cars without &quot;Commission paid&quot;. Open a car to mark it.</p>
            {commissionDue.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {commissionDue.slice(0, 20).map((v) => (
                  <Link key={v.id} href={`/admin/stock/${v.id}`} className="rounded-lg bg-white px-2 py-0.5 font-mono text-xs text-brand-700 ring-1 ring-amber-200 hover:underline">
                    {v.stock_no}
                  </Link>
                ))}
                {commissionDue.length > 20 && <span className="text-xs">+{commissionDue.length - 20} more</span>}
              </div>
            )}
          </div>
        </section>
      </div>

      <div className="mb-5 grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <section className="card overflow-hidden">
          <h2 className="px-5 pt-5 text-sm font-semibold">By make</h2>
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Make</th>
                  {VEHICLE_STATUSES.map((s) => (
                    <th key={s} className="text-right">
                      {t(`vs_${s}` as DictKey)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {topMakes.map(([make, c]) => (
                  <tr key={make}>
                    <td className="font-medium">
                      <Link href={`/admin/stock?make=${encodeURIComponent(make)}`} className="hover:underline">
                        {make}
                      </Link>
                    </td>
                    {VEHICLE_STATUSES.map((s) => (
                      <td key={s} className="text-right tabular-nums">
                        {c[s] || "—"}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
        <section className="card p-5">
          <h2 className="mb-3 text-sm font-semibold">In stock by branch</h2>
          <ul className="space-y-1.5 text-sm">
            {[...branches.entries()]
              .sort((a, b) => b[1] - a[1])
              .map(([b, n]) => (
                <li key={b} className="flex justify-between">
                  <span>{b === "—" ? "No branch" : branchName(b)}</span>
                  <span className="font-semibold tabular-nums">{num(n, locale)}</span>
                </li>
              ))}
          </ul>
        </section>
      </div>

      <section className="card overflow-hidden">
        <h2 className="px-5 pt-5 text-sm font-semibold">Longest in stock</h2>
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>Stock no.</th>
                <th>Car</th>
                <th>Status</th>
                <th className="text-right">Days</th>
                {seeCost && <th className="text-right">Cost</th>}
              </tr>
            </thead>
            <tbody>
              {oldest.map((v) => (
                <tr key={v.id}>
                  <td className="font-mono text-xs">
                    <Link href={`/admin/stock/${v.id}`} className="text-brand-700 hover:underline">
                      {v.stock_no}
                    </Link>
                  </td>
                  <td>{[v.year, v.make, v.model].filter(Boolean).join(" ")}</td>
                  <td>
                    <VehicleStatusBadge status={v.status} label={t(`vs_${v.status}` as DictKey)} />
                    {v.commission_paid_at && <BadgeCheck className="ml-1 inline h-4 w-4 text-emerald-600" aria-label="Commission paid" />}
                  </td>
                  <td className={`text-right tabular-nums ${days(v) > 90 ? "font-semibold text-red-600" : ""}`}>{days(v)}</td>
                  {seeCost && <td className="text-right tabular-nums">{v.ownership === "third_party" ? "—" : money(costJpy(v), "JPY", locale)}</td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
