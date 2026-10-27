import Link from "next/link";
import { notFound } from "next/navigation";
import { Trash2, FileText, Car, BookmarkPlus, BookmarkCheck, Ship, Gavel } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getProfile, can } from "@/lib/auth";
import { getT } from "@/lib/i18n/server";
import { money, convert, date, vehicleTitle } from "@/lib/format";
import type { Currency, InvoiceStatus, Vehicle, VehicleImage } from "@/lib/types";
import type { DictKey } from "@/lib/i18n/dictionaries";
import { PageHeader, VehicleStatusBadge, InvoiceStatusBadge, Stat, Badge, PartsBadge, BranchBadge } from "@/components/ui";
import { costJpy, expensesJpy } from "@/lib/branches";
import { ConfirmButton } from "@/components/buttons";
import { VehicleForm } from "../vehicle-form";
import { updateVehicle, deleteVehicle } from "../actions";
import { ImageManager } from "./image-manager";
import { StatusPanel, type StatusChange } from "./status-panel";
import { YardPhotos } from "./yard-photos";
import type { StockPhoto } from "@/components/stock-photos";
import { loadMasters } from "../masters-data";
import { MakeAvailableButton } from "../make-available";
import { CommissionPanel } from "./commission-panel";
import { loadStaff } from "../../customers/staff";

export default async function VehiclePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = await getProfile();
  const { t, locale } = await getT();
  const supabase = await createClient();

  const [{ data: vehicle }, { data: images }, { data: items }, { data: settings }, { data: activeRes }, { data: yard }, { data: changes }] = await Promise.all([
    supabase.from("vehicles").select("*").eq("id", id).maybeSingle(),
    supabase.from("vehicle_images").select("*").eq("vehicle_id", id).order("sort_order").order("created_at"),
    supabase
      .from("invoice_items")
      .select("amount, invoices!inner(id, invoice_no, status, currency, issue_date, exchange_rate, customers(name, assigned_to))")
      .eq("vehicle_id", id)
      .eq("invoices.doc_type", "invoice"),
    supabase.from("settings").select("exchange_rates").single(),
    supabase
      .from("reservations")
      .select("id, reservation_no, sold_price, currency, price_term, profit_jpy, customers(name)")
      .eq("vehicle_id", id)
      .eq("status", "active")
      .maybeSingle(),
    supabase.from("vehicle_yard_images").select("id, path, sort_order").eq("vehicle_id", id).order("sort_order").order("created_at"),
    supabase
      .from("vehicle_status_changes")
      .select("id, old_status, new_status, manual, note, created_at, profiles(full_name, email)")
      .eq("vehicle_id", id)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);
  if (!vehicle) notFound();
  const masters = await loadMasters();
  const v = vehicle as Vehicle;
  const canEdit = can.editStock(profile.role);
  const seeCost = can.seeCost(profile.role);
  const update = updateVehicle.bind(null, id);
  const del = deleteVehicle.bind(null, id);

  const rates = (settings?.exchange_rates ?? {}) as Record<Currency, number>;
  const thirdParty = v.ownership === "third_party";
  // Own stock: what we paid. Third-party: what we owe the supplier (+ any expenses we incurred).
  const cost = thirdParty ? convert(Number(v.supplier_price || 0), v.supplier_currency ?? "JPY", "JPY", rates) + expensesJpy(v) : costJpy(v);
  const priceJpy = v.price != null ? convert(Number(v.price), v.price_currency, "JPY", rates) : null;

  type Inv = { id: string; invoice_no: string; status: InvoiceStatus; currency: Currency; issue_date: string; customers: { name: string; assigned_to: string | null } | null };
  const invoices = (items ?? [])
    .map((it) => ({ amount: it.amount as number, inv: it.invoices as unknown as Inv | null }))
    .filter((x) => x.inv);

  // Commission (admins): ready once the car's invoice is paid and the car is delivered.
  const live = invoices.find((x) => x.inv!.status !== "cancelled" && x.inv!.status !== "draft")?.inv ?? null;
  const commission =
    profile.role === "admin"
      ? await (async () => {
          const staff = await loadStaff();
          const agentName = v.commission_agent_id ? staff.find((s) => s.id === v.commission_agent_id)?.name ?? null : null;
          return {
            staff,
            defaultAgent: live?.customers?.assigned_to ?? null,
            ready: { delivered: v.shipping_status === "delivered", paid: live?.status === "paid" },
            info: { paidAt: v.commission_paid_at ?? null, amount: v.commission_amount ?? null, currency: v.commission_currency ?? null, agent: agentName, note: v.commission_note ?? null },
          };
        })()
      : null;

  return (
    <>
      <PageHeader
        icon={<Car />}
        tone="brand"
        back={v.ownership === "third_party" ? { href: "/admin/third-party", label: t("nav_third_party") } : { href: "/admin/stock", label: t("stock_title") }}
        title={
          <span className="flex flex-wrap items-center gap-3">
            {v.stock_no}
            <VehicleStatusBadge status={v.status} label={t(`vs_${v.status}` as DictKey)} />
            <BranchBadge code={v.branch} />
            {v.for_parts && <PartsBadge label={t("parts_badge")} />}
            {thirdParty && <Badge className="bg-amber-50 text-amber-800 ring-amber-600/20">{t("own_third_party")}</Badge>}
            {v.show_on_website && <Badge className="bg-sky-50 text-sky-700 ring-sky-600/20">{t("stock_on_website")}</Badge>}
          </span>
        }
        subtitle={`${vehicleTitle(v)}${v.chassis_no ? " · " + v.chassis_no : ""}`}
        actions={
          <>
            {v.status === "in_stock" && !activeRes && (
              <Link href={`/admin/reservations/new?vehicle=${v.id}`} className="btn bg-gradient-to-r from-amber-400 to-orange-500 text-white shadow-md shadow-orange-500/25 hover:from-amber-500 hover:to-orange-600">
                <BookmarkPlus className="h-4 w-4" />
                {t("rv_reserve")}
              </Link>
            )}
            {activeRes && (
              <Link href={`/admin/reservations/${activeRes.id}`} className="btn border border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100">
                <BookmarkCheck className="h-4 w-4" />
                {t("rv_current")} #{activeRes.reservation_no} · {(activeRes.customers as unknown as { name: string } | null)?.name}
              </Link>
            )}
            {(v.status === "in_stock" || v.status === "reserved") && (
              <Link href={activeRes ? `/admin/invoices/new?reservation=${activeRes.id}` : `/admin/invoices/new?vehicle=${v.id}`} className="btn-primary">
                <FileText className="h-4 w-4" />
                {t("va_create_invoice")}
              </Link>
            )}
            <Link href={`/admin/stock/${v.id}/shipping`} className="btn bg-gradient-to-r from-slate-800 to-slate-900 text-white hover:from-slate-700 hover:to-slate-800">
              <Ship className="h-4 w-4" />
              {t("sh_edit")}
            </Link>
            {seeCost && Number(v.purchase_price) > 0 && (
              <a href={`/admin/print/auction?vehicle=${v.id}`} target="_blank" className="btn-secondary">
                <Gavel className="h-4 w-4" />
                Auction breakdown
              </a>
            )}
            {canEdit && v.status !== "in_stock" && <MakeAvailableButton vehicleId={v.id} stockNo={v.stock_no} />}
            {can.deleteStock(profile.role) && (
              <ConfirmButton action={del}>
                <Trash2 className="h-4 w-4" />
                {t("delete")}
              </ConfirmButton>
            )}
          </>
        }
      />

      {seeCost && (
        <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Stat
            tone="violet"
            label={thirdParty ? t("f_supplier_price") : t("stock_total_cost")}
            value={money(cost, "JPY", locale)}
            hint={
              thirdParty && v.supplier_name
                ? v.supplier_name
                : !thirdParty && v.cost_currency !== "JPY"
                  ? `${money(Number(v.purchase_price || 0) + Number(v.purchase_tax || 0) + Number(v.expenses || 0), v.cost_currency, locale)} × ${v.cost_fx_rate}`
                  : undefined
            }
          />
          <Stat tone="sky" label={t("f_price")} value={v.price != null ? money(v.price, v.price_currency, locale) : "—"} hint={priceJpy != null && v.price_currency !== "JPY" ? `≈ ${money(priceJpy, "JPY", locale)}` : undefined} />
          <Stat
            tone={priceJpy != null && priceJpy - cost < 0 ? "brand" : "emerald"}
            label={t("stock_margin")}
            value={priceJpy != null ? money(priceJpy - cost, "JPY", locale) : "—"}
            hint={priceJpy && cost ? `${(((priceJpy - cost) / priceJpy) * 100).toFixed(1)}%` : undefined}
          />
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-5">
        <div className="xl:col-span-3">
          <VehicleForm vehicle={v} action={update} showCost={seeCost} readOnly={!canEdit} defaultFx={Number(rates.USD ?? 0)} rates={rates} masters={masters} />
        </div>
        <div className="space-y-5 xl:col-span-2">
          {profile.role === "admin" && (
            <StatusPanel vehicleId={id} status={v.status} manual={!!v.status_manual} history={(changes ?? []) as unknown as StatusChange[]} />
          )}
          {profile.role === "admin" && commission && (
            <CommissionPanel
              vehicleId={id}
              info={commission.info}
              ready={commission.ready}
              staff={commission.staff}
              defaultAgent={commission.defaultAgent}
              rates={rates}
            />
          )}
          <ImageManager vehicleId={id} images={(images ?? []) as VehicleImage[]} canEdit={canEdit} />
          <YardPhotos vehicleId={id} photos={(yard ?? []) as StockPhoto[]} canEdit={canEdit} />
          {invoices.length > 0 && (
            <section className="card overflow-hidden">
              <h2 className="border-b border-slate-100 px-5 py-3.5 text-sm font-semibold">{t("stock_in_invoices")}</h2>
              <table className="table">
                <tbody>
                  {invoices.map(({ inv, amount }) => (
                    <tr key={inv!.id}>
                      <td>
                        <Link href={`/admin/invoices/${inv!.id}`} className="font-medium text-brand-700 hover:underline">
                          {inv!.invoice_no}
                        </Link>
                        <div className="text-xs text-slate-500">
                          {inv!.customers?.name} · {date(inv!.issue_date, locale)}
                        </div>
                      </td>
                      <td className="text-right tabular-nums">{money(amount, inv!.currency, locale)}</td>
                      <td className="text-right">
                        <InvoiceStatusBadge status={inv!.status} label={t(`is_${inv!.status}` as DictKey)} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}
        </div>
      </div>
    </>
  );
}
