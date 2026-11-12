import Link from "next/link";
import { notFound } from "next/navigation";
import { Container } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getProfile, can } from "@/lib/auth";
import { getT } from "@/lib/i18n/server";
import { date, vehicleTitle } from "@/lib/format";
import { getDisplayCurrency } from "@/lib/display-currency";
import type { Currency } from "@/lib/types";
import { PageHeader, Empty } from "@/components/ui";
import { loadRates, vehicleCostJpy } from "../../reservations/data";

export const metadata = { title: "Shipment profit sheet" };

const CHARGES = ["freight", "thc", "vanning", "courier"] as const;
type Charge = (typeof CHARGES)[number];

type Ship = {
  vehicle_id: string;
  booking_no: string | null;
  bl_no: string | null;
  container_no: string | null;
  ship_company: string | null;
  vessel_name: string | null;
  etd: string | null;
  eta: string | null;
  vehicles: {
    id: string; stock_no: string; chassis_no: string | null; make: string; model: string; grade: string | null; year: number | null;
    ownership: "own" | "third_party"; purchase_price: number | null; purchase_tax: number | null; expenses: number | null;
    cost_fx_rate: number | null; supplier_price: number | null; supplier_currency: Currency | null;
  };
};

/** One booking / BL / container: every car's cost, what it sold for, what was received, and the profit. */
export default async function ShipmentSheetPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const q = ((await searchParams).q ?? "").trim().slice(0, 60);
  const profile = await getProfile();
  if (!can.seeCost(profile.role)) notFound();
  const { t, locale } = await getT();
  const supabase = await createClient();

  // Exact match (any case) on any of the three numbers; quoted for the or-list, % and _ escaped.
  const exact = `"${q.replace(/"/g, "").replace(/[\\%_]/g, (c) => `\\${c}`)}"`;
  const { data: shipRows } = q
    ? await supabase
        .from("vehicle_shipments")
        .select(
          "vehicle_id, booking_no, bl_no, container_no, ship_company, vessel_name, etd, eta, " +
            "vehicles!inner(id, stock_no, chassis_no, make, model, grade, year, ownership, purchase_price, purchase_tax, expenses, cost_fx_rate, supplier_price, supplier_currency)"
        )
        .or(["booking_no", "bl_no", "container_no"].map((k) => `${k}.ilike.${exact}`).join(","))
        .limit(200)
    : { data: [] };
  const ships = ((shipRows ?? []) as unknown as Ship[]).sort((a, b) => a.vehicles.stock_no.localeCompare(b.vehicles.stock_no));
  const ids = ships.map((s) => s.vehicle_id);

  const [{ rates }, display, items, reservations, allocs, book] = await Promise.all([
    loadRates(),
    getDisplayCurrency(),
    ids.length
      ? supabase
          .from("invoice_items")
          .select("vehicle_id, amount, invoices!inner(status, currency, exchange_rate)")
          .in("vehicle_id", ids)
          .eq("invoices.doc_type", "invoice")
          .not("invoices.status", "in", "(draft,cancelled)")
      : { data: [] },
    ids.length ? supabase.from("reservations").select("vehicle_id, sold_price, currency, exchange_rate").in("vehicle_id", ids).in("status", ["active", "invoiced"]) : { data: [] },
    ids.length ? supabase.from("remittance_allocations").select("vehicle_id, amount, remittances(currency, exchange_rate)").in("vehicle_id", ids) : { data: [] },
    ids.length ? supabase.from("company_expenses").select("vehicle_id, shipping_charge, amount_jpy").in("vehicle_id", ids) : { data: [] },
  ]);

  const toJpy = (amount: number, currency: Currency | null | undefined, rate: number | null | undefined) =>
    Math.round(Number(amount || 0) * (currency === "JPY" ? 1 : Number(rate) || 1));
  const add = (m: Map<string, number>, k: string, n: number) => m.set(k, (m.get(k) ?? 0) + n);

  const sold = new Map<string, number>();
  type Inv = { vehicle_id: string; amount: number; invoices: { currency: Currency; exchange_rate: number } };
  for (const r of (items.data ?? []) as unknown as Inv[]) sold.set(r.vehicle_id, toJpy(r.amount, r.invoices.currency, r.invoices.exchange_rate));
  // Not invoiced yet: the reservation's price
  type Res = { vehicle_id: string; sold_price: number; currency: Currency; exchange_rate: number };
  for (const r of (reservations.data ?? []) as unknown as Res[]) if (!sold.has(r.vehicle_id)) sold.set(r.vehicle_id, toJpy(r.sold_price, r.currency, r.exchange_rate));

  const received = new Map<string, number>();
  type Al = { vehicle_id: string; amount: number; remittances: { currency: Currency; exchange_rate: number } | null };
  for (const a of (allocs.data ?? []) as unknown as Al[]) add(received, a.vehicle_id, toJpy(a.amount, a.remittances?.currency, a.remittances?.exchange_rate));

  // Expense book rows booked to the car: its shipping charges (migration 0044) and anything else (commission, repairs…)
  const booked = new Map<string, number>();
  for (const e of (book.data ?? []) as { vehicle_id: string; shipping_charge: Charge | null; amount_jpy: number }[])
    add(booked, `${e.vehicle_id}:${e.shipping_charge ?? "other"}`, Number(e.amount_jpy));

  const rows = ships.map((s) => {
    const v = s.vehicles;
    const c = vehicleCostJpy(v, rates);
    const charge = Object.fromEntries(CHARGES.map((k) => [k, booked.get(`${v.id}:${k}`) ?? 0])) as Record<Charge, number>;
    const other = booked.get(`${v.id}:other`) ?? 0;
    const cost = c.total + CHARGES.reduce((n, k) => n + charge[k], 0) + other;
    const soldJpy = sold.get(v.id) ?? null;
    return { v, buying: c.buying + c.tax + c.supplier, carExp: c.expenses, charge, other, cost, sold: soldJpy, received: received.get(v.id) ?? 0, profit: soldJpy === null ? null : soldJpy - cost };
  });
  const sum = (f: (r: (typeof rows)[number]) => number) => rows.reduce((n, r) => n + f(r), 0);
  const fmt = (jpy: number | null) => (jpy === null ? "—" : display.fmt(jpy, locale));
  const uniq = (k: "booking_no" | "bl_no" | "container_no" | "ship_company" | "vessel_name") => [...new Set(ships.map((s) => (s[k] ?? "").trim()).filter(Boolean))].join(", ");
  const first = ships[0];
  const profitTotal = sum((r) => r.profit ?? 0);

  return (
    <>
      <PageHeader
        icon={<Container />}
        tone="sky"
        back={{ href: q ? `/admin/stock?q=${encodeURIComponent(q)}` : "/admin/stock", label: t("stock_title") }}
        title={t("sh_sheet_title")}
        subtitle={
          first
            ? [
                uniq("bl_no") && `${t("sh_bl_no")} ${uniq("bl_no")}`,
                uniq("container_no") && `${t("sh_container")} ${uniq("container_no")}`,
                uniq("booking_no") && `${t("sh_booking")} ${uniq("booking_no")}`,
                [uniq("ship_company"), uniq("vessel_name")].filter(Boolean).join(" "),
                (first.etd || first.eta) && `${date(first.etd, locale)} → ${date(first.eta, locale)}`,
              ]
                .filter(Boolean)
                .join(" · ")
            : undefined
        }
      />
      <div className="card overflow-hidden">
        <form className="no-print flex flex-wrap items-center gap-2 border-b border-slate-100 p-3" action="/admin/stock/shipment">
          <input name="q" defaultValue={q} placeholder={`${t("sh_booking")} / ${t("sh_bl_no")} / ${t("sh_container")}`} aria-label={t("search")} className="input max-w-xs" />
          <button className="btn-secondary">{t("search")}</button>
        </form>
        {rows.length === 0 ? (
          <Empty>{q ? t("sh_sheet_none") : `${t("sh_booking")} / ${t("sh_bl_no")} / ${t("sh_container")}`}</Empty>
        ) : (
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>{t("sh_sheet_car")}</th>
                  <th className="text-right">{t("sh_sheet_buying")}</th>
                  <th className="text-right">{t("sh_sheet_car_exp")}</th>
                  <th className="text-right">{t("sh_freight")}</th>
                  <th className="text-right">{t("sh_thc")}</th>
                  <th className="text-right">{t("sh_vanning")}</th>
                  <th className="text-right">{t("sh_courier_charges")}</th>
                  <th className="text-right">{t("sh_sheet_other")}</th>
                  <th className="text-right">{t("sh_sheet_cost")}</th>
                  <th className="text-right">{t("sh_sheet_sold")}</th>
                  <th className="text-right">{t("sh_sheet_received")}</th>
                  <th className="text-right">{t("sh_sheet_profit")}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.v.id}>
                    <td>
                      <Link href={`/admin/stock/${r.v.id}/shipping`} className="font-mono font-semibold text-blue-700 hover:underline">
                        {r.v.stock_no}
                      </Link>
                      <div className="text-xs text-slate-500">
                        {vehicleTitle(r.v)}
                        {r.v.chassis_no ? ` · ${r.v.chassis_no}` : ""}
                      </div>
                    </td>
                    <td className="whitespace-nowrap text-right tabular-nums">{fmt(r.buying)}</td>
                    <td className="whitespace-nowrap text-right tabular-nums">{fmt(r.carExp)}</td>
                    {CHARGES.map((k) => (
                      <td key={k} className="whitespace-nowrap text-right tabular-nums">
                        {fmt(r.charge[k])}
                      </td>
                    ))}
                    <td className="whitespace-nowrap text-right tabular-nums">{fmt(r.other)}</td>
                    <td className="whitespace-nowrap text-right font-semibold tabular-nums">{fmt(r.cost)}</td>
                    <td className="whitespace-nowrap text-right tabular-nums">{fmt(r.sold)}</td>
                    <td className="whitespace-nowrap text-right tabular-nums">{fmt(r.received)}</td>
                    <td className={`whitespace-nowrap text-right font-semibold tabular-nums ${(r.profit ?? 0) < 0 ? "text-red-600" : "text-emerald-700"}`}>{fmt(r.profit)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="font-semibold">
                  <td>
                    {t("sh_sheet_total")} · {rows.length}
                  </td>
                  <td className="whitespace-nowrap text-right tabular-nums">{fmt(sum((r) => r.buying))}</td>
                  <td className="whitespace-nowrap text-right tabular-nums">{fmt(sum((r) => r.carExp))}</td>
                  {CHARGES.map((k) => (
                    <td key={k} className="whitespace-nowrap text-right tabular-nums">
                      {fmt(sum((r) => r.charge[k]))}
                    </td>
                  ))}
                  <td className="whitespace-nowrap text-right tabular-nums">{fmt(sum((r) => r.other))}</td>
                  <td className="whitespace-nowrap text-right tabular-nums">{fmt(sum((r) => r.cost))}</td>
                  <td className="whitespace-nowrap text-right tabular-nums">{fmt(sum((r) => r.sold ?? 0))}</td>
                  <td className="whitespace-nowrap text-right tabular-nums">{fmt(sum((r) => r.received))}</td>
                  <td className={`whitespace-nowrap text-right tabular-nums ${profitTotal < 0 ? "text-red-600" : "text-emerald-700"}`}>{fmt(profitTotal)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
        <p className="border-t border-slate-100 px-4 py-3 text-xs text-slate-500">
          {t("sh_sheet_note")}
          {display.note ? ` ${display.note}` : ""}
        </p>
      </div>
    </>
  );
}
