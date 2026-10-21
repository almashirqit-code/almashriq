import { notFound } from "next/navigation";
import { Ship } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getProfile, can } from "@/lib/auth";
import { getT } from "@/lib/i18n/server";
import { vehicleTitle } from "@/lib/format";
import type { ShippingStatus, VehicleDocument, VehicleShipment, ShipmentType } from "@/lib/types";
import { PageHeader } from "@/components/ui";
import { ShippingEditor } from "./shipping-editor";

export const metadata = { title: "Shipping & documents" };

export default async function ShippingPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { id } = await params;
  const { tab } = await searchParams;
  const profile = await getProfile();
  const { t } = await getT();
  const supabase = await createClient();

  const [{ data: v }, { data: ship }, { data: docs }, { data: res }, { data: items }, { data: suggest }] = await Promise.all([
    supabase
      .from("vehicles")
      .select("id, stock_no, chassis_no, make, model, grade, year, shipping_status, auction_houses(ports(name)), yards(ports(name))")
      .eq("id", id)
      .maybeSingle(),
    supabase.from("vehicle_shipments").select("*").eq("vehicle_id", id).maybeSingle(),
    supabase.from("vehicle_documents").select("*").eq("vehicle_id", id).order("created_at"),
    supabase.from("reservations").select("port_of_loading, port_of_discharge, shipment_type").eq("vehicle_id", id).in("status", ["active", "invoiced"]).maybeSingle(),
    supabase
      .from("invoice_items")
      .select("invoices!inner(port_of_loading, port_of_discharge, shipment_type, status)")
      .eq("vehicle_id", id)
      .neq("invoices.status", "cancelled")
      .limit(1),
    supabase.from("vehicle_shipments").select("ship_company, forwarding_agent, courier_service, courier_company").limit(2000),
  ]);
  if (!v) notFound();

  type P = { ports: { name: string } | null } | null;
  const vv = v as unknown as { auction_houses: P; yards: P };
  const portName = vv.yards?.ports?.name ?? vv.auction_houses?.ports?.name ?? null;
  const inv = items?.[0]?.invoices as unknown as { port_of_loading: string | null; port_of_discharge: string | null; shipment_type: ShipmentType | null } | undefined;

  // Defaults for a first-time booking: from the invoice, else the reservation, else the car's port.
  const defaults = {
    port_of_loading: inv?.port_of_loading ?? res?.port_of_loading ?? (portName ? portName.replace(/ Port$/i, "").toUpperCase() : null),
    place_of_delivery: inv?.port_of_discharge ?? res?.port_of_discharge ?? null,
    shipment_type: (inv?.shipment_type ?? res?.shipment_type ?? null) as ShipmentType | null,
  };
  const uniq = (k: "ship_company" | "forwarding_agent" | "courier_service" | "courier_company") =>
    [...new Set((suggest ?? []).map((r) => r[k] as string | null).filter(Boolean) as string[])].sort();

  return (
    <>
      <PageHeader
        icon={<Ship />}
        tone="sky"
        back={{ href: `/admin/stock/${id}`, label: v.stock_no }}
        title={t("sh_title")}
        subtitle={`${v.stock_no} · ${vehicleTitle(v)}${v.chassis_no ? " · " + v.chassis_no : ""}`}
      />
      <ShippingEditor
        vehicleId={id}
        status={v.shipping_status as ShippingStatus}
        shipment={(ship ?? null) as VehicleShipment | null}
        docs={(docs ?? []) as VehicleDocument[]}
        defaults={defaults}
        suggestions={{
          ship_company: uniq("ship_company"),
          forwarding_agent: uniq("forwarding_agent"),
          courier_service: uniq("courier_service"),
          courier_company: uniq("courier_company"),
        }}
        initialTab={tab === "courier" ? "courier" : "shipping"}
        canEdit={can.editStock(profile.role)}
      />
    </>
  );
}
