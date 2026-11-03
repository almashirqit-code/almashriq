import { notFound } from "next/navigation";
import { Ship, Info } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getProfile, can } from "@/lib/auth";
import { getT } from "@/lib/i18n/server";
import { vehicleTitle } from "@/lib/format";
import type { ShippingStatus, VehicleDocument, VehicleShipment, ShipmentType } from "@/lib/types";
import { PageHeader } from "@/components/ui";
import { ShippingEditor } from "./shipping-editor";
import { SameShipment, type ShipmentMate } from "./same-shipment";
import { effectiveShipping } from "../../filters";
import { fetchAll } from "@/lib/fetch-all";

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
      .select("id, stock_no, chassis_no, make, model, grade, year, status, shipping_status, auction_houses(ports(name)), yards(ports(name))")
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
      .eq("invoices.doc_type", "invoice")
      .limit(1),
    fetchAll<{ ship_company: string | null; forwarding_agent: string | null; courier_service: string | null; courier_company: string | null }>((from, to) => supabase.from("vehicle_shipments").select("ship_company, forwarding_agent, courier_service, courier_company").order("vehicle_id").range(from, to)).then((data) => ({ data })),
  ]);
  if (!v) notFound();

  // Cars on the same booking / BL / container (exact, any case).
  // Quoted for the or-list; % and _ escaped so the match is exact.
  const exact = (x: string) => `"${x.replace(/["]/g, "").replace(/[\\%_]/g, (c) => `\\${c}`)}"`;
  const refs = (["booking_no", "bl_no", "container_no"] as const).filter((k) => ship?.[k]);
  const { data: mateRows } = refs.length
    ? await supabase
        .from("vehicle_shipments")
        .select("vehicle_id, booking_no, bl_no, container_no, vehicles(id, stock_no, make, model, grade, year)")
        .neq("vehicle_id", id)
        .or(refs.map((k) => `${k}.ilike.${exact(String(ship![k]).trim())}`).join(","))
        .limit(100)
    : { data: [] };
  const same = (a: unknown, b: unknown) => !!a && !!b && String(a).trim().toLowerCase() === String(b).trim().toLowerCase();
  const mates: ShipmentMate[] = ((mateRows ?? []) as unknown as {
    vehicle_id: string;
    booking_no: string | null;
    bl_no: string | null;
    container_no: string | null;
    vehicles: { id: string; stock_no: string; make: string; model: string; grade: string | null; year: number | null } | null;
  }[])
    .filter((m) => m.vehicles)
    .map((m) => ({
      id: m.vehicle_id,
      stock_no: m.vehicles!.stock_no,
      title: vehicleTitle(m.vehicles!),
      match: [
        same(m.container_no, ship?.container_no) && `${t("sh_container")} ${m.container_no}`,
        same(m.booking_no, ship?.booking_no) && `${t("sh_booking")} ${m.booking_no}`,
        same(m.bl_no, ship?.bl_no) && `${t("sh_bl_no")} ${m.bl_no}`,
      ]
        .filter(Boolean)
        .join(" · "),
    }));
  type P = { ports: { name: string } | null } | null;
  const vv = v as unknown as { auction_houses: P; yards: P };
  const portName = vv.yards?.ports?.name ?? vv.auction_houses?.ports?.name ?? null;
  const inv = items?.[0]?.invoices as unknown as { port_of_loading: string | null; port_of_discharge: string | null; shipment_type: ShipmentType | null } | undefined;
  const unsold = v.status === "in_stock" && !res && !inv;

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
      {unsold && (v.shipping_status as string) === "not_booked" && (
        <p className="mb-4 flex items-center gap-2 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800 ring-1 ring-amber-200">
          <Info className="h-4 w-4 shrink-0" />
          {t("sh_book_first")}
        </p>
      )}
      <ShippingEditor
        vehicleId={id}
        status={effectiveShipping(v as { status: string; shipping_status: string }) as ShippingStatus}
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
      <SameShipment vehicleId={id} mates={mates} hasRef={refs.length > 0} canEdit={can.editStock(profile.role)} />
    </>
  );
}
