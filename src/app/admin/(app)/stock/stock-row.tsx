import Link from "next/link";
import { ImageIcon, MapPin, Gavel, CalendarDays, Ship, FileText, ScrollText, Banknote, Container, ArrowRight, FileCheck2 } from "lucide-react";
import { date, money, num, publicImageUrl, vehicleTitle } from "@/lib/format";
import type { Currency, ShippingStatus, Vehicle } from "@/lib/types";
import type { DictKey } from "@/lib/i18n/dictionaries";
import { Badge, PartsBadge } from "@/components/ui";
import { VehicleRowActions } from "./row-actions";
import type { PaymentStatus, RowExtra } from "./row-data";
import { branchFlag, branchName, costJpy } from "@/lib/branches";

type T = (k: DictKey, v?: Record<string, string | number>) => string;

export const PAYMENT_STYLE: Record<PaymentStatus, { badge: string; bar: string; row: string }> = {
  available: { badge: "bg-sky-50 text-sky-700 ring-sky-600/20", bar: "from-sky-400 to-blue-500", row: "" },
  reserved: { badge: "bg-amber-50 text-amber-700 ring-amber-600/25", bar: "from-amber-400 to-orange-500", row: "bg-amber-50/20" },
  invoiced: { badge: "bg-indigo-50 text-indigo-700 ring-indigo-600/20", bar: "from-indigo-400 to-violet-600", row: "bg-indigo-50/20" },
  partial: { badge: "bg-orange-50 text-orange-700 ring-orange-600/25", bar: "from-orange-400 to-rose-500", row: "bg-orange-50/30" },
  paid: { badge: "bg-emerald-50 text-emerald-700 ring-emerald-600/25", bar: "from-emerald-400 to-teal-600", row: "bg-emerald-50/30" },
};
export const SHIPPING_STYLE: Record<ShippingStatus, string> = {
  not_booked: "bg-slate-100 text-slate-500 ring-slate-400/20",
  booked: "bg-sky-50 text-sky-700 ring-sky-600/20",
  shipped: "bg-violet-50 text-violet-700 ring-violet-600/20",
  delivered: "bg-emerald-50 text-emerald-700 ring-emerald-600/25",
};

type RowVehicle = Vehicle & {
  shipping_status: ShippingStatus;
  fob_usd?: number | null;
  auction_houses?: { name: string; ports: { name: string } | null } | null;
  yards?: { name: string; ports: { name: string } | null } | null;
};

export function StockRow({
  v,
  x,
  t,
  locale,
  seeCost,
  canEdit,
  canDelete,
}: {
  v: RowVehicle;
  x: RowExtra;
  t: T;
  locale: string;
  seeCost: boolean;
  canEdit: boolean;
  canDelete: boolean;
}) {
  const img = v.vehicle_images?.[0];
  const style = PAYMENT_STYLE[x.payment];
  const port = v.yards?.ports?.name ?? v.auction_houses?.ports?.name ?? null;
  const cost = costJpy(v);
  const flag = branchFlag(v.branch);
  const chip = "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-bold ring-1 ring-inset transition hover:-translate-y-px";

  return (
    <div className={`relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm transition hover:shadow-md ${style.row}`}>
      <div className={`absolute inset-y-0 left-0 w-1.5 bg-gradient-to-b ${style.bar}`} />
      <div className="grid grid-cols-1 gap-4 p-4 pl-5 md:grid-cols-2 xl:grid-cols-[minmax(0,1.45fr)_minmax(0,0.9fr)_minmax(0,1.55fr)_minmax(0,1fr)]">
        {/* 1 — vehicle */}
        <div className="flex min-w-0 gap-3">
          <Link href={`/admin/stock/${v.id}`} className="block h-[84px] w-28 shrink-0 overflow-hidden rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 ring-1 ring-slate-200">
            {img ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={publicImageUrl(img.path)} alt="" className="h-full w-full object-cover" loading="lazy" />
            ) : (
              <div className="flex h-full items-center justify-center text-slate-300">
                <ImageIcon className="h-6 w-6" />
              </div>
            )}
          </Link>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <Link href={`/admin/stock/${v.id}`} className="font-bold text-brand-700 hover:underline">
                {v.stock_no}
              </Link>
              {flag && v.branch !== "JP" && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={flag} alt={branchName(v.branch)} title={branchName(v.branch)} className="h-3.5 w-5 rounded-[2px] object-cover ring-1 ring-black/10" />
              )}
              {v.for_parts && <PartsBadge label={t("parts_badge")} />}
              {v.ownership === "third_party" && <Badge className="bg-amber-50 text-amber-800 ring-amber-600/20">{t("own_third_party_short")}</Badge>}
              {v.show_on_website && <Badge className="bg-sky-50 text-sky-700 ring-sky-600/20">Web</Badge>}
            </div>
            <div className="truncate font-semibold uppercase text-slate-900">{vehicleTitle(v)}</div>
            <div className="truncate text-xs text-slate-500">
              {[v.body_type, v.fuel, v.transmission, v.engine_cc ? `${num(v.engine_cc, locale)}cc` : null, v.steering, v.drive, v.color].filter(Boolean).join(" · ")}
            </div>
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              {v.chassis_no && (
                <span className="rounded-md bg-white px-1.5 py-0.5 font-mono text-[11px] font-semibold text-slate-700 ring-1 ring-slate-300">{v.chassis_no}</span>
              )}
              {x.docs.auction_sheet && (
                <a href={`/admin/stock/docs/${x.docs.auction_sheet}`} target="_blank" rel="noreferrer" className={`${chip} bg-sky-50 text-sky-700 ring-sky-200`}>
                  <ScrollText className="h-3 w-3" />
                  {t("doc_auction_sheet")}
                </a>
              )}
            </div>
          </div>
        </div>

        {/* 2 — location & cost */}
        <div className="min-w-0 space-y-1 text-xs">
          {port && (
            <div className="flex items-center gap-1.5 font-semibold uppercase text-slate-800">
              <MapPin className="h-3.5 w-3.5 text-cyan-500" />
              {port.replace(/ Port$/i, "")}
            </div>
          )}
          {v.yards && <div className="pl-5 text-cyan-700">{v.yards.name}</div>}
          {v.auction_houses && (
            <div className="flex items-center gap-1.5 text-slate-500">
              <Gavel className="h-3.5 w-3.5 text-violet-400" />
              {v.auction_houses.name}
            </div>
          )}
          <div className="flex flex-wrap gap-x-3 pt-1">
            {v.fob_usd != null && (
              <span>
                <span className="font-semibold text-slate-400">FOB </span>
                <b className="text-slate-900">{money(Number(v.fob_usd), "USD", locale)}</b>
              </span>
            )}
            {v.price != null && (
              <span>
                <span className="font-semibold text-slate-400">WEB </span>
                <b className="text-slate-900">{money(Number(v.price), v.price_currency, locale)}</b>
              </span>
            )}
          </div>
          {seeCost && cost > 0 && (
            <div className="flex items-center gap-1.5 text-slate-500">
              <CalendarDays className="h-3.5 w-3.5 text-slate-400" />
              {v.purchase_date ? date(v.purchase_date, locale) : "—"} · <span className="font-semibold text-slate-700">¥{num(cost, locale)}</span>
            </div>
          )}
        </div>

        {/* 3 — customer & money */}
        <div className="min-w-0">
          {x.customer ? (
            <>
              <div className="mb-2 flex flex-wrap items-baseline gap-x-2">
                <Link href={`/admin/customers/${x.customer.id}`} className="truncate font-bold uppercase text-blue-700 hover:underline">
                  {x.customer.name}
                </Link>
                {x.customer.country && <span className="text-xs font-semibold uppercase text-slate-400">{x.customer.country}</span>}
              </div>
              <div className="grid grid-cols-3 gap-2">
                <MoneyTile label={t("row_sold")} tag={x.term === "CNF" ? "C&F" : x.term ?? undefined} value={x.sold ? money(x.sold.amount, x.sold.currency, locale) : "—"} />
                <MoneyTile
                  label={t("row_balance")}
                  value={x.balance ? money(x.balance.amount, x.balance.currency, locale) : "—"}
                  tone={x.balance ? (x.balance.amount <= 0.005 ? "good" : "bad") : undefined}
                  bar={x.balance ? 100 - x.balance.pct : undefined}
                  hint={x.balance ? (x.balance.amount <= 0.005 ? `✓ ${t("row_paid_full")}` : t("row_due", { pct: x.balance.pct.toFixed(0) })) : undefined}
                />
                {seeCost ? (
                  <MoneyTile
                    label={t("row_profit")}
                    value={x.profitJpy != null ? money(x.profitJpy, "JPY", locale) : "—"}
                    tone={x.profitJpy != null ? (x.profitJpy >= 0 ? "good" : "bad") : undefined}
                  />
                ) : (
                  <div />
                )}
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                {x.invoice && (
                  <Link href={`/admin/invoices/${x.invoice.id}`} className={`${chip} bg-rose-50 text-rose-700 ring-rose-200`} title={x.invoice.invoice_no}>
                    <FileText className="h-3 w-3" />
                    INV
                  </Link>
                )}
                {x.remittances.map((r) => (
                  <Link key={r.id} href={`/admin/remittances/${r.id}`} className={`${chip} bg-violet-50 text-violet-700 ring-violet-200`} title={`#${r.id} · ${money(r.amount, r.currency as Currency, locale)}`}>
                    <Banknote className="h-3 w-3" />
                    TT
                  </Link>
                ))}
                {x.docs.bl && (
                  <a href={`/admin/stock/docs/${x.docs.bl}`} target="_blank" rel="noreferrer" className={`${chip} bg-blue-50 text-blue-700 ring-blue-200`}>
                    <FileCheck2 className="h-3 w-3" />
                    BL
                  </a>
                )}
                {x.remittances.length > 0 && (
                  <span className="text-[11px] text-slate-500">
                    {t("row_remittances", { count: x.remittances.length })} ·{" "}
                    <b className="text-slate-700">
                      {[...x.remittances.reduce((m, r) => m.set(r.currency, (m.get(r.currency) ?? 0) + r.amount), new Map<string, number>())]
                        .map(([c, a]) => money(a, c as Currency, locale))
                        .join(" + ")}
                    </b>
                  </span>
                )}
              </div>
            </>
          ) : (
            <div className="flex h-full items-center">
              <span className="rounded-xl border border-dashed border-slate-200 px-3 py-2 text-xs text-slate-400">{t("row_no_customer")}</span>
            </div>
          )}
        </div>

        {/* 4 — status & shipping */}
        <div className="flex min-w-0 flex-col items-start gap-2 xl:items-end">
          <div className="flex flex-wrap items-center gap-1.5 xl:justify-end">
            <Badge className={`${style.badge} uppercase tracking-wide`}>
              <span className="h-1.5 w-1.5 rounded-full bg-current" />
              {t(`ps_${x.payment}` as DictKey)}
            </Badge>
            <Badge className={SHIPPING_STYLE[v.shipping_status]}>
              <Ship className="h-3 w-3" />
              {t(`ss_${v.shipping_status}` as DictKey)}
            </Badge>
          </div>
          {(x.shipping?.shipment_type || x.shipping?.container_no) && (
            <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500 xl:justify-end">
              {x.shipping?.shipment_type && <span className="font-semibold">{t(`ship_${x.shipping.shipment_type}` as DictKey)}</span>}
              {x.shipping?.container_no && (
                <span className="inline-flex items-center gap-1 font-mono">
                  <Container className="h-3 w-3" />
                  {x.shipping.container_no}
                </span>
              )}
            </div>
          )}
          {(x.shipping?.etd || x.shipping?.eta) && (
            <div className="inline-flex items-center gap-1.5 rounded-lg bg-slate-50 px-2 py-1 text-[11px] font-semibold text-slate-600 ring-1 ring-slate-100">
              <span>ETD {x.shipping?.etd ?? "—"}</span>
              <ArrowRight className="h-3 w-3 text-slate-400" />
              <span>ETA {x.shipping?.eta ?? "—"}</span>
            </div>
          )}
          <div className="mt-auto flex flex-wrap gap-1.5 xl:justify-end">
            <Link
              href={`/admin/stock/${v.id}/shipping`}
              className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-slate-800 to-slate-900 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:from-slate-700 hover:to-slate-800"
            >
              <Ship className="h-3.5 w-3.5" />
              {t("sh_edit")}
            </Link>
            <VehicleRowActions
              id={v.id}
              stockNo={v.stock_no}
              status={v.status}
              showOnWebsite={!!v.show_on_website}
              forParts={!!v.for_parts}
              canEdit={canEdit}
              canDelete={canDelete}
              canInvoice
              reservationId={x.reservationId}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function MoneyTile({
  label,
  value,
  tag,
  tone,
  bar,
  hint,
}: {
  label: string;
  value: string;
  tag?: string;
  tone?: "good" | "bad";
  bar?: number;
  hint?: string;
}) {
  const color = tone === "good" ? "text-emerald-600" : tone === "bad" ? "text-red-600" : "text-slate-900";
  return (
    <div className="min-w-0 rounded-xl bg-white p-2 shadow-sm ring-1 ring-slate-200/80">
      <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
        {label}
        {tag && <span className="rounded bg-blue-50 px-1 text-[9px] text-blue-600">{tag}</span>}
      </div>
      <div className={`truncate text-sm font-bold tabular-nums ${color}`}>{value}</div>
      {bar != null && (
        <div className="mt-1 h-1 overflow-hidden rounded-full bg-slate-100">
          <div className={`h-full rounded-full ${tone === "good" ? "bg-emerald-500" : "bg-gradient-to-r from-orange-400 to-red-500"}`} style={{ width: `${Math.max(0, Math.min(100, bar))}%` }} />
        </div>
      )}
      {hint && <div className={`mt-0.5 truncate text-[10px] ${tone === "good" ? "text-emerald-600" : "text-slate-400"}`}>{hint}</div>}
    </div>
  );
}
