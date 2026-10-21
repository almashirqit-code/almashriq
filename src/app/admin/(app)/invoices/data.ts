import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Currency, Settings } from "@/lib/types";
import type { VehicleOption } from "./invoice-editor";

const VEHICLE_COLS =
  "id, stock_no, chassis_no, make, model, grade, year, color, mileage, engine_cc, transmission, fuel, price, price_currency, status, " +
  "auction_houses(ports(name, shipment_modes)), yards(ports(name, shipment_modes))";

export async function loadEditorData(includeVehicleIds: string[] = []) {
  const supabase = await createClient();
  const [customers, available, included, settings] = await Promise.all([
    supabase
      .from("customers")
      .select("id, name, company, country, port, address, phone, email, consignee_name, consignee_address, consignee_phone, notify_party")
      .order("name")
      .limit(5000),
    supabase.from("vehicles").select(VEHICLE_COLS).in("status", ["in_stock", "reserved"]).order("stock_no").limit(5000),
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
    rates: { JPY: 1, USD: 150, EUR: 163, GBP: 191, ...(s?.exchange_rates ?? {}) } as Record<Currency, number>,
    defaults: { currency: (s?.default_currency ?? "USD") as Currency, tax_rate: Number(s?.tax_rate ?? 0) },
  };
}
