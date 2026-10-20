import Link from "next/link";
import { notFound } from "next/navigation";
import { Trash2, FileText, Car } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getProfile, can } from "@/lib/auth";
import { getT } from "@/lib/i18n/server";
import { money, convert, date, vehicleTitle } from "@/lib/format";
import type { Currency, InvoiceStatus, Vehicle, VehicleImage } from "@/lib/types";
import type { DictKey } from "@/lib/i18n/dictionaries";
import { PageHeader, VehicleStatusBadge, InvoiceStatusBadge, Stat, Badge, PartsBadge } from "@/components/ui";
import { ConfirmButton } from "@/components/buttons";
import { VehicleForm } from "../vehicle-form";
import { updateVehicle, deleteVehicle } from "../actions";
import { ImageManager } from "./image-manager";
import { loadMasters } from "../masters-data";

export default async function VehiclePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = await getProfile();
  const { t, locale } = await getT();
  const supabase = await createClient();

  const [{ data: vehicle }, { data: images }, { data: items }, { data: settings }] = await Promise.all([
    supabase.from("vehicles").select("*").eq("id", id).maybeSingle(),
    supabase.from("vehicle_images").select("*").eq("vehicle_id", id).order("sort_order").order("created_at"),
    supabase
      .from("invoice_items")
      .select("amount, invoices(id, invoice_no, status, currency, issue_date, exchange_rate, customers(name))")
      .eq("vehicle_id", id),
    supabase.from("settings").select("exchange_rates").single(),
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
  const cost = thirdParty
    ? convert(Number(v.supplier_price || 0), v.supplier_currency ?? "JPY", "JPY", rates) + Number(v.expenses || 0)
    : Number(v.purchase_price || 0) + Number(v.purchase_tax || 0) + Number(v.expenses || 0);
  const priceJpy = v.price != null ? convert(Number(v.price), v.price_currency, "JPY", rates) : null;

  type Inv = { id: string; invoice_no: string; status: InvoiceStatus; currency: Currency; issue_date: string; customers: { name: string } | null };
  const invoices = (items ?? [])
    .map((it) => ({ amount: it.amount as number, inv: it.invoices as unknown as Inv | null }))
    .filter((x) => x.inv);

  return (
    <>
      <PageHeader
        icon={<Car />}
        tone="brand"
        back={{ href: "/stock", label: t("stock_title") }}
        title={
          <span className="flex flex-wrap items-center gap-3">
            {v.stock_no}
            <VehicleStatusBadge status={v.status} label={t(`vs_${v.status}` as DictKey)} />
            {v.for_parts && <PartsBadge label={t("parts_badge")} />}
            {thirdParty && <Badge className="bg-amber-50 text-amber-800 ring-amber-600/20">{t("own_third_party")}</Badge>}
            {v.show_on_website && <Badge className="bg-sky-50 text-sky-700 ring-sky-600/20">{t("stock_on_website")}</Badge>}
          </span>
        }
        subtitle={`${vehicleTitle(v)}${v.chassis_no ? " · " + v.chassis_no : ""}`}
        actions={
          <>
            {(v.status === "in_stock" || v.status === "reserved") && (
              <Link href={`/invoices/new?vehicle=${v.id}`} className="btn-primary">
                <FileText className="h-4 w-4" />
                {t("va_create_invoice")}
              </Link>
            )}
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
            hint={thirdParty && v.supplier_name ? v.supplier_name : undefined}
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
          <VehicleForm vehicle={v} action={update} showCost={seeCost} readOnly={!canEdit} defaultFx={Number(rates.USD ?? 0)} masters={masters} />
        </div>
        <div className="space-y-5 xl:col-span-2">
          <ImageManager vehicleId={id} images={(images ?? []) as VehicleImage[]} canEdit={canEdit} />
          {invoices.length > 0 && (
            <section className="card overflow-hidden">
              <h2 className="border-b border-slate-100 px-5 py-3.5 text-sm font-semibold">{t("stock_in_invoices")}</h2>
              <table className="table">
                <tbody>
                  {invoices.map(({ inv, amount }) => (
                    <tr key={inv!.id}>
                      <td>
                        <Link href={`/invoices/${inv!.id}`} className="font-medium text-brand-700 hover:underline">
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
