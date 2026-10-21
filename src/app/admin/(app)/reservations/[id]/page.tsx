import Link from "next/link";
import { notFound } from "next/navigation";
import { BookmarkCheck, FileText, Trash2, XCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getProfile, can } from "@/lib/auth";
import { getT } from "@/lib/i18n/server";
import { date, money } from "@/lib/format";
import type { Reservation } from "@/lib/types";
import type { DictKey } from "@/lib/i18n/dictionaries";
import { PageHeader, Badge, Stat } from "@/components/ui";
import { ConfirmButton } from "@/components/buttons";
import { ReservationForm } from "../reservation-form";
import { loadFormLists, loadRates, loadReserveVehicle } from "../data";
import { cancelReservation, deleteReservation } from "../actions";
import { RES_STATUS_BADGE } from "../status";

export default async function ReservationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = await getProfile();
  const { t, locale } = await getT();
  const supabase = await createClient();
  const { data } = await supabase
    .from("reservations")
    .select("*, invoices(id, invoice_no), customers(name), profiles!reservations_sales_agent_id_fkey(full_name, email)")
    .eq("id", id)
    .maybeSingle();
  if (!data) notFound();
  const r = data as Reservation & {
    invoices: { id: string; invoice_no: string } | null;
    customers: { name: string } | null;
    profiles: { full_name: string | null; email: string } | null;
  };

  const { rates, defaultCurrency } = await loadRates();
  const [vehicle, lists] = await Promise.all([loadReserveVehicle(r.vehicle_id, rates), loadFormLists()]);
  if (!vehicle) notFound();
  const seeCost = can.seeCost(profile.role);
  const canChange = r.status === "active" && (can.editStock(profile.role) || r.sales_agent_id === profile.id || r.created_by === profile.id);

  return (
    <>
      <PageHeader
        icon={<BookmarkCheck />}
        tone="amber"
        back={{ href: "/admin/reservations", label: t("rv_title") }}
        title={
          <span className="flex flex-wrap items-center gap-3">
            {t("rv_current")} #{r.reservation_no}
            <Badge className={RES_STATUS_BADGE[r.status]}>{t(`rvs_${r.status}` as DictKey)}</Badge>
          </span>
        }
        subtitle={`${vehicle.stock_no} · ${r.customers?.name ?? ""} · ${t("rv_agent")}: ${r.profiles?.full_name || r.profiles?.email || "—"} · ${date(r.created_at.slice(0, 10), locale)}`}
        actions={
          <>
            {r.status === "active" && (
              <Link href={`/admin/invoices/new?reservation=${r.id}`} className="btn-primary">
                <FileText className="h-4 w-4" />
                {t("rv_create_invoice")}
              </Link>
            )}
            {r.invoices && (
              <Link href={`/admin/invoices/${r.invoices.id}`} className="btn-secondary">
                <FileText className="h-4 w-4" />
                {r.invoices.invoice_no}
              </Link>
            )}
            {canChange && (
              <ConfirmButton action={cancelReservation.bind(null, r.id)} message={t("rv_cancel_confirm")}>
                <XCircle className="h-4 w-4" />
                {t("rv_cancel")}
              </ConfirmButton>
            )}
            {can.deleteRecords(profile.role) && r.status !== "active" && (
              <ConfirmButton action={deleteReservation.bind(null, r.id)}>
                <Trash2 className="h-4 w-4" />
                {t("delete")}
              </ConfirmButton>
            )}
          </>
        }
      />

      {r.status !== "active" || !canChange ? (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Stat tone="sky" label={t("rv_sold_price")} value={money(Number(r.sold_price), r.currency, locale)} hint={`${r.price_term === "CNF" ? "C&F" : r.price_term}${r.shipment_type ? " · " + t(`ship_${r.shipment_type}` as DictKey) : ""}`} />
          <Stat tone="fuchsia" label={t("rv_freight")} value={money(Number(r.freight) + Number(r.insurance), r.currency, locale)} hint={r.port_of_discharge ?? undefined} />
          {seeCost && <Stat tone="violet" label={t("rv_total_cost")} value={money(Number(r.buying_cost_jpy), "JPY", locale)} />}
          {seeCost && (
            <Stat tone={Number(r.profit_jpy) >= 0 ? "emerald" : "brand"} label={t("rv_profit")} value={money(Number(r.profit_jpy), "JPY", locale)} />
          )}
        </div>
      ) : (
        <ReservationForm
          vehicle={vehicle}
          {...lists}
          rates={rates}
          defaultCurrency={defaultCurrency}
          meId={profile.id}
          seeCost={seeCost}
          initial={{
            id: r.id,
            customer_id: r.customer_id,
            sales_agent_id: r.sales_agent_id,
            price_term: r.price_term,
            shipment_type: r.shipment_type,
            port_of_loading: r.port_of_loading,
            port_of_discharge: r.port_of_discharge,
            freight_rate_id: r.freight_rate_id,
            currency: r.currency,
            exchange_rate: Number(r.exchange_rate),
            sold_price: Number(r.sold_price),
            freight: Number(r.freight),
            insurance: Number(r.insurance),
            reserved_until: r.reserved_until,
            notes: r.notes,
          }}
        />
      )}
    </>
  );
}
