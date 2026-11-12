import "server-only";
import { createClient } from "@/lib/supabase/server";
import { fetchAll } from "@/lib/fetch-all";
import { DEFAULT_RATES, type Currency, type Customer, type Settings, type ShipmentType } from "@/lib/types";
import type { PartOption, VehicleOption } from "./invoice-editor";

const VEHICLE_COLS =
  "id, stock_no, chassis_no, make, model, grade, year, color, mileage, engine_cc, transmission, fuel, price, price_currency, status, " +
  "auction_houses(ports(name, shipment_modes)), yards(ports(name, shipment_modes))";

export async function loadEditorData(includeVehicleIds: string[] = []) {
  const supabase = await createClient();
  const [customers, available, included, settings, parts] = await Promise.all([
    // Pickers and totals must see every row: the API returns at most 1,000 per request.
    fetchAll<Pick<Customer, "id" | "name" | "company" | "country" | "port" | "address" | "phone" | "email" | "consignee_name" | "consignee_address" | "consignee_phone" | "notify_party">>((from, to) =>
      supabase
        .from("customers")
        .select("id, name, company, country, port, address, phone, email, consignee_name, consignee_address, consignee_phone, notify_party")
        .order("name")
        .order("id")
        .range(from, to)
    ).then((data) => ({ data })),
    fetchAll((from, to) => supabase.from("vehicles").select(VEHICLE_COLS).in("status", ["in_stock", "reserved"]).order("stock_no").order("id").range(from, to)).then((data) => ({ data })),
    includeVehicleIds.length
      ? supabase.from("vehicles").select(VEHICLE_COLS).in("id", includeVehicleIds)
      : Promise.resolve({ data: [] as VehicleOption[] }),
    supabase.from("settings").select("*").single(),
    fetchAll<PartOption>((from, to) =>
      supabase.from("parts").select("id, part_no, name, make, model, condition, price, price_currency, quantity").neq("status", "sold").order("part_no").order("id").range(from, to)
    ),
  ]);
  const map = new Map<string, VehicleOption>();
  type Raw = VehicleOption & {
    auction_houses?: { ports: VehicleOption["port"] } | null;
    yards?: { ports: VehicleOption["port"] } | null;
  };
  for (const raw of [...((available.data ?? []) as unknown as Raw[]), ...((included.data ?? []) as unknown as Raw[])]) {
    const { auction_houses, yards, ...v } = raw;
    map.set(v.id, { ...v, port: auction_houses?.ports ?? yards?.ports ?? null });
  }
  const s = settings.data as Settings | null;
  return {
    customers: customers.data ?? [],
    vehicles: [...map.values()],
    parts,
    rates: { ...DEFAULT_RATES, ...(s?.exchange_rates ?? {}) } as Record<Currency, number>,
    defaults: { currency: (s?.default_currency ?? "USD") as Currency, tax_rate: Number(s?.tax_rate ?? 0) },
  };
}

export type ShipmentReservation = {
  id: string; vehicle_id: string; customer_id: string; currency: Currency; exchange_rate: number; price_term: string | null;
  sold_price: number; freight: number; insurance: number; shipment_type: ShipmentType | null;
  port_of_loading: string | null; port_of_discharge: string | null;
};

/**
 * Cars of one booking / BL / container that can still be invoiced (exact match on any of the three
 * numbers, any case), the stock nos. already on a live invoice, and the cars' active reservations.
 */
export async function loadShipmentCars(ref: string) {
  const none = { ids: [] as string[], invoiced: [] as string[], reservations: [] as ShipmentReservation[], shipmentType: null as ShipmentType | null };
  const q = String(ref ?? "").trim().slice(0, 60);
  if (!q) return none;
  const supabase = await createClient();
  const exact = `"${q.replace(/"/g, "").replace(/[\\%_]/g, (c) => `\\${c}`)}"`;
  const { data: rows } = await supabase
    .from("vehicle_shipments")
    .select("vehicle_id, shipment_type, vehicles!inner(stock_no)")
    .or(["booking_no", "bl_no", "container_no"].map((k) => `${k}.ilike.${exact}`).join(","))
    .limit(50);
  const ships = ((rows ?? []) as unknown as { vehicle_id: string; shipment_type: ShipmentType | null; vehicles: { stock_no: string } }[]).sort((a, b) =>
    a.vehicles.stock_no.localeCompare(b.vehicles.stock_no)
  );
  if (!ships.length) return none;
  const all = ships.map((s) => s.vehicle_id);
  const [{ data: taken }, { data: res }] = await Promise.all([
    supabase.from("invoice_items").select("vehicle_id, invoices!inner(status, doc_type)").in("vehicle_id", all).neq("invoices.status", "cancelled").eq("invoices.doc_type", "invoice"),
    supabase
      .from("reservations")
      .select("id, vehicle_id, customer_id, currency, exchange_rate, price_term, sold_price, freight, insurance, shipment_type, port_of_loading, port_of_discharge")
      .in("vehicle_id", all)
      .eq("status", "active"),
  ]);
  const used = new Set((taken ?? []).map((x) => x.vehicle_id as string));
  return {
    ids: all.filter((id) => !used.has(id)),
    invoiced: ships.filter((s) => used.has(s.vehicle_id)).map((s) => s.vehicles.stock_no),
    reservations: ((res ?? []) as unknown as ShipmentReservation[]).filter((r) => !used.has(r.vehicle_id)),
    shipmentType: ships.find((s) => s.shipment_type)?.shipment_type ?? null,
  };
}
