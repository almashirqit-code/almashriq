import { getT } from "@/lib/i18n/server";
import { createClient } from "@/lib/supabase/server";
import type { InvoicePayload } from "../actions";
import { PageHeader } from "@/components/ui";
import { InvoiceEditor } from "../invoice-editor";
import { loadEditorData } from "../data";

export default async function NewInvoicePage({
  searchParams,
}: {
  searchParams: Promise<{ customer?: string; vehicle?: string; reservation?: string }>;
}) {
  const { t } = await getT();
  const { customer, vehicle, reservation } = await searchParams;

  // Opened from a reservation: carry its customer, terms, freight and price over.
  let initial: Partial<InvoicePayload> = { customer_id: customer ?? "" };
  let addVehicleId = vehicle;
  let addVehiclePrice: number | undefined;
  if (reservation) {
    const supabase = await createClient();
    const { data: r } = await supabase.from("reservations").select("*").eq("id", reservation).eq("status", "active").maybeSingle();
    if (r) {
      initial = {
        customer_id: r.customer_id,
        currency: r.currency,
        exchange_rate: Number(r.exchange_rate),
        incoterm: r.price_term,
        freight: Number(r.freight),
        insurance: Number(r.insurance),
        shipment_type: r.shipment_type,
        port_of_loading: r.port_of_loading,
        port_of_discharge: r.port_of_discharge,
        notes: r.notes,
        reservation_id: r.id,
      };
      addVehicleId = r.vehicle_id;
      addVehiclePrice = Number(r.sold_price) - Number(r.freight) - Number(r.insurance);
    }
  }
  const data = await loadEditorData(addVehicleId ? [addVehicleId] : []);
  return (
    <>
      <PageHeader title={t("inv_new")} back={{ href: "/admin/invoices", label: t("inv_title") }} />
      <InvoiceEditor {...data} initial={initial} addVehicleId={addVehicleId} addVehiclePrice={addVehiclePrice} />
    </>
  );
}
