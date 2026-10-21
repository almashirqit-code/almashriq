import "server-only";
import { createClient } from "@/lib/supabase/server";
import { convert } from "@/lib/format";
import type { Currency, FreightRate, Settings, ShipmentMode } from "@/lib/types";

export type PortInfo = { id: string; name: string; shipment_modes: ShipmentMode[] } | null;

export type ReserveVehicle = {
  id: string;
  stock_no: string;
  chassis_no: string | null;
  make: string;
  model: string;
  grade: string | null;
  year: number | null;
  color: string | null;
  mileage: number | null;
  status: string;
  ownership: "own" | "third_party";
  price: number | null;
  price_currency: Currency;
  purchase_price: number | null;
  purchase_tax: number | null;
  expenses: number | null;
  supplier_name: string | null;
  supplier_price: number | null;
  supplier_currency: Currency | null;
  fob_usd: number | null;
  auction: { name: string; port: PortInfo } | null;
  yard: { name: string; address: string | null; port: PortInfo } | null;
  port: PortInfo;
  cost: { buying: number; tax: number; expenses: number; supplier: number; total: number };
  image: string | null;
};

const VEHICLE_SELECT =
  "id, stock_no, chassis_no, make, model, grade, year, color, mileage, status, ownership, price, price_currency, purchase_price, purchase_tax, expenses, " +
  "supplier_name, supplier_price, supplier_currency, fob_usd, " +
  "auction_houses(name, ports(id, name, shipment_modes)), yards(name, address, ports(id, name, shipment_modes)), vehicle_images(path, sort_order)";

/** Buying cost in JPY: own stock = price + tax + expenses; third-party = supplier price (→ JPY) + expenses. */
export function vehicleCostJpy(
  v: Pick<ReserveVehicle, "ownership" | "purchase_price" | "purchase_tax" | "expenses" | "supplier_price" | "supplier_currency">,
  rates: Record<Currency, number>
) {
  const expenses = Number(v.expenses || 0);
  if (v.ownership === "third_party") {
    const supplier = convert(Number(v.supplier_price || 0), (v.supplier_currency ?? "JPY") as Currency, "JPY", rates);
    return { buying: 0, tax: 0, expenses, supplier, total: Math.round(supplier + expenses) };
  }
  const buying = Number(v.purchase_price || 0);
  const tax = Number(v.purchase_tax || 0);
  return { buying, tax, expenses, supplier: 0, total: Math.round(buying + tax + expenses) };
}

export async function loadRates(): Promise<{ rates: Record<Currency, number>; defaultCurrency: Currency }> {
  const supabase = await createClient();
  const { data } = await supabase.from("settings").select("exchange_rates, default_currency").single();
  const s = data as Pick<Settings, "exchange_rates" | "default_currency"> | null;
  return {
    rates: { JPY: 1, USD: 150, EUR: 163, GBP: 191, ...(s?.exchange_rates ?? {}) } as Record<Currency, number>,
    defaultCurrency: (s?.default_currency ?? "USD") as Currency,
  };
}

export async function loadReserveVehicle(id: string, rates: Record<Currency, number>): Promise<ReserveVehicle | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("vehicles")
    .select(VEHICLE_SELECT)
    .eq("id", id)
    .order("sort_order", { referencedTable: "vehicle_images", ascending: true })
    .limit(1, { referencedTable: "vehicle_images" })
    .maybeSingle();
  if (!data) return null;
  type Raw = Omit<ReserveVehicle, "auction" | "yard" | "port" | "cost" | "image"> & {
    auction_houses: { name: string; ports: PortInfo } | null;
    yards: { name: string; address: string | null; ports: PortInfo } | null;
    vehicle_images: { path: string }[] | null;
  };
  const r = data as unknown as Raw;
  const { auction_houses, yards, vehicle_images, ...v } = r;
  const auction = auction_houses ? { name: auction_houses.name, port: auction_houses.ports } : null;
  const yard = yards ? { name: yards.name, address: yards.address, port: yards.ports } : null;
  return {
    ...v,
    auction,
    yard,
    // The yard is where the car physically is, so its port wins.
    port: yard?.port ?? auction?.port ?? null,
    cost: vehicleCostJpy(v, rates),
    image: vehicle_images?.[0]?.path ?? null,
  };
}

export async function loadFormLists() {
  const supabase = await createClient();
  const [customers, agents, freight] = await Promise.all([
    supabase.from("customers").select("id, customer_no, name, company, country, port").order("name").limit(5000),
    supabase.from("profiles").select("id, full_name, email, role").order("full_name"),
    supabase.from("freight_rates").select("*").eq("active", true).order("destination").limit(5000),
  ]);
  return {
    customers: (customers.data ?? []) as { id: string; customer_no: number; name: string; company: string | null; country: string | null; port: string | null }[],
    agents: (agents.data ?? []) as { id: string; full_name: string | null; email: string; role: string }[],
    freightRates: (freight.data ?? []) as FreightRate[],
  };
}
