import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Currency, VehicleStatus } from "./types";
import { fetchAll } from "./fetch-all";

export type ShowroomVehicle = {
  id: string;
  stock_no: string;
  make: string;
  model: string;
  grade: string | null;
  year: number | null;
  month: number | null;
  mileage: number | null;
  color: string | null;
  engine_cc: number | null;
  fuel: string | null;
  transmission: string | null;
  drive: string | null;
  steering: string | null;
  doors: number | null;
  seats: number | null;
  body_type: string | null;
  auction_grade: string | null;
  price: number | null;
  price_currency: Currency;
  status: VehicleStatus;
  for_parts: boolean;
  images: string[];
  created_at: string;
};

export type ShowroomCompany = {
  company_name: string;
  company_name_ja: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  logo_url: string | null;
  address: string | null;
};

/** Anonymous client — the showroom only reads through the public, safe-column RPCs. */
function anon() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function getShowroom() {
  const sb = anon();
  // Supabase caps one request at 1,000 rows, so read every page (newest first, as the RPC orders them).
  let error: string | null = null;
  const [vehicles, company] = await Promise.all([
    fetchAll<ShowroomVehicle>(async (from, to) => {
      const r = await sb.rpc("showcase_vehicles").order("created_at", { ascending: false }).order("id").range(from, to);
      if (r.error) error = r.error.message;
      return r;
    }),
    sb.rpc("showcase_company"),
  ]);
  return {
    vehicles,
    company: ((company.data ?? [])[0] ?? null) as ShowroomCompany | null,
    error,
  };
}
