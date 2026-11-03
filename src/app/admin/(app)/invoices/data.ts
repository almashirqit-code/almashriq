import "server-only";
import { createClient } from "@/lib/supabase/server";
import { fetchAll } from "@/lib/fetch-all";
import { DEFAULT_RATES, type Currency, type Customer, type Settings } from "@/lib/types";
import type { VehicleOption } from "./invoice-editor";

const VEHICLE_COLS =
  "id, stock_no, chassis_no, make, model, grade, year, color, mileage, engine_cc, transmission, fuel, price, price_currency, status, " +
  "auction_houses(ports(name, shipment_modes)), yards(ports(name, shipment_modes))";

export async function loadEditorData(includeVehicleIds: string[] = []) {
  const supabase = await createClient();
  const [customers, available, included, settings] = await Promise.all([
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
    rates: { ...DEFAULT_RATES, ...(s?.exchange_rates ?? {}) } as Record<Currency, number>,
    defaults: { currency: (s?.default_currency ?? "USD") as Currency, tax_rate: Number(s?.tax_rate ?? 0) },
  };
}
