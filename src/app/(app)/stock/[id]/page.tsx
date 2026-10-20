import Link from "next/link";
import { notFound } from "next/navigation";
import { Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getProfile, can } from "@/lib/auth";
import { getT } from "@/lib/i18n/server";
import { money, convert, date, vehicleTitle } from "@/lib/format";
import type { Currency, InvoiceStatus, Vehicle, VehicleImage } from "@/lib/types";
import type { DictKey } from "@/lib/i18n/dictionaries";
import { PageHeader, VehicleStatusBadge, InvoiceStatusBadge, Stat } from "@/components/ui";
import { ConfirmButton } from "@/components/buttons";
import { VehicleForm } from "../vehicle-form";
import { updateVehicle, deleteVehicle } from "../actions";
import { ImageManager } from "./image-manager";

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
  const v = vehicle as Vehicle;
  const canEdit = can.editStock(profile.role);
  const seeCost = can.seeCost(profile.role);
  const update = updateVehicle.bind(null, id);
  const del = deleteVehicle.bind(null, id);

  const cost = Number(v.purchase_price || 0) + Number(v.expenses || 0);
  const rates = (settings?.exchange_rates ?? {}) as Record<Currency, number>;
  const priceJpy = v.price != null ? convert(Number(v.price), v.price_currency, "JPY", rates) : null;

  type Inv = { id: string; invoice_no: string; status: InvoiceStatus; currency: Currency; issue_date: string; customers: { name: string } | null };
  const invoices = (items ?? [])
    .map((it) => ({ amount: it.amount as number, inv: it.invoices as unknown as Inv | null }))
    .filter((x) => x.inv);

  return (
    <>
      <PageHeader
        back={{ href: "/stock", label: t("stock_title") }}
        title={
          <span className="flex flex-wrap items-center gap-3">
            {v.stock_no}
            <VehicleStatusBadge status={v.status} label={t(`vs_${v.status}` as DictKey)} />
          </span>
        }
        subtitle={`${vehicleTitle(v)}${v.chassis_no ? " · " + v.chassis_no : ""}`}
        actions={
          can.deleteStock(profile.role) && (
            <ConfirmButton action={del}>
              <Trash2 className="h-4 w-4" />
              {t("delete")}
            </ConfirmButton>
          )
        }
      />

      {seeCost && (
        <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Stat label={t("stock_total_cost")} value={money(cost, "JPY", locale)} />
          <Stat label={t("f_price")} value={v.price != null ? money(v.price, v.price_currency, locale) : "—"} hint={priceJpy != null && v.price_currency !== "JPY" ? `≈ ${money(priceJpy, "JPY", locale)}` : undefined} />
          <Stat
            label={t("stock_margin")}
            value={priceJpy != null ? money(priceJpy - cost, "JPY", locale) : "—"}
            hint={priceJpy && cost ? `${(((priceJpy - cost) / priceJpy) * 100).toFixed(1)}%` : undefined}
          />
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-5">
        <div className="xl:col-span-3">
          <VehicleForm vehicle={v} action={update} showCost={seeCost} readOnly={!canEdit} />
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
