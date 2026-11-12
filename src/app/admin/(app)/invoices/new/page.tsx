import { getT } from "@/lib/i18n/server";
import { createClient } from "@/lib/supabase/server";
import type { InvoicePayload } from "../actions";
import { PageHeader } from "@/components/ui";
import { InvoiceEditor } from "../invoice-editor";
import { loadEditorData, loadShipmentCars } from "../data";
import { DOC_LIST_PATH, DOC_TYPES, type DocType } from "@/lib/types";
import type { DictKey } from "@/lib/i18n/dictionaries";

export default async function NewInvoicePage({
  searchParams,
}: {
  searchParams: Promise<{ customer?: string; vehicle?: string; reservation?: string; type?: string; shipment?: string }>;
}) {
  const { t } = await getT();
  const { customer, vehicle, reservation, type, shipment } = await searchParams;
  const docType: DocType = DOC_TYPES.includes(type as DocType) ? (type as DocType) : "invoice";

  // Opened from a reservation: carry its customer, terms, freight and price over.
  let initial: Partial<InvoicePayload> = { customer_id: customer ?? "" };
  let addVehicles: { id: string; price?: number }[] = vehicle ? [{ id: vehicle }] : [];
  let notice = "";
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
      addVehicles = [{ id: r.vehicle_id, price: Number(r.sold_price) - Number(r.freight) - Number(r.insurance) }];
    }
  } else if (shipment) {
    // Opened from a booking / BL / container: every car of it that is not invoiced yet, on one invoice.
    const s = await loadShipmentCars(shipment);
    // Reservations of one customer in one currency carry their terms and prices over.
    const first = s.reservations[0];
    const group = first ? s.reservations.filter((r) => r.customer_id === first.customer_id && r.currency === first.currency) : [];
    const sum = (k: "freight" | "insurance") => group.reduce((n, r) => n + Number(r[k] || 0), 0);
    initial = first
      ? {
          customer_id: first.customer_id,
          currency: first.currency,
          exchange_rate: Number(first.exchange_rate),
          incoterm: first.price_term,
          freight: sum("freight"),
          insurance: sum("insurance"),
          shipment_type: s.shipmentType ?? first.shipment_type,
          port_of_loading: first.port_of_loading,
          port_of_discharge: first.port_of_discharge,
          reservation_ids: group.map((r) => r.id),
        }
      : { customer_id: customer ?? "", shipment_type: s.shipmentType };
    const price = new Map(group.map((r) => [r.vehicle_id, Number(r.sold_price) - Number(r.freight) - Number(r.insurance)]));
    addVehicles = s.ids.map((id) => ({ id, price: price.get(id) }));
    notice = [
      !s.ids.length && !s.invoiced.length && `No car has booking, BL or container no. ${shipment}.`,
      s.invoiced.length && `Already on an invoice, not added: ${s.invoiced.join(", ")}.`,
    ]
      .filter(Boolean)
      .join(" ");
  }
  const data = await loadEditorData(addVehicles.map((a) => a.id));
  return (
    <>
      <PageHeader title={t(`doc_new_${docType}` as DictKey)} back={{ href: DOC_LIST_PATH[docType], label: t(`doc_${docType}` as DictKey) }} />
      {notice && <p className="mb-4 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800 ring-1 ring-amber-200">{notice}</p>}
      <InvoiceEditor {...data} docType={docType} initial={initial} addVehicles={addVehicles} />
    </>
  );
}
