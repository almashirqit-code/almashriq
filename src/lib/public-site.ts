import "server-only";
import { cache } from "react";
import { headers } from "next/headers";
import { createClient } from "@supabase/supabase-js";
import type { Currency, VehicleStatus } from "./types";

/** Hosts that serve the public website at the root (set PUBLIC_SITE_HOSTS in Vercel to override). */
export const PUBLIC_HOSTS = (process.env.PUBLIC_SITE_HOSTS ?? "almashriqtrading.site,www.almashriqtrading.site")
  .split(",")
  .map((h) => h.trim().toLowerCase())
  .filter(Boolean);

export const isPublicHost = (host: string | null | undefined) => !!host && PUBLIC_HOSTS.includes(host.split(":")[0].toLowerCase());

/** "" on the public domain, "/showroom" when browsing it inside the ERP. */
export async function siteBase() {
  const h = await headers();
  return isPublicHost(h.get("x-forwarded-host") ?? h.get("host")) ? "" : "/showroom";
}

export type PublicCard = {
  id: string;
  stock_no: string;
  make: string;
  model: string;
  grade: string | null;
  year: number | null;
  mileage: number | null;
  engine_cc: number | null;
  fuel: string | null;
  transmission: string | null;
  steering: string | null;
  body_type: string | null;
  color: string | null;
  price: number | null;
  price_currency: Currency;
  status: VehicleStatus;
  for_parts: boolean;
  location: string | null;
  cover: string | null;
  image_count: number;
  created_at: string;
  total_count: number;
};

export type PublicCar = Omit<PublicCard, "cover" | "image_count" | "total_count"> & {
  model_code: string | null;
  month: number | null;
  drive: string | null;
  doors: number | null;
  seats: number | null;
  chassis_no: string | null;
  features: string[];
  images: string[];
};

export type PublicCompany = {
  company_name: string;
  phone: string | null;
  mobile: string | null;
  fax: string | null;
  email: string | null;
  website: string | null;
  logo_url: string | null;
  address: string | null;
};

export type Filters = {
  q?: string;
  make?: string;
  body?: string;
  fuel?: string;
  trans?: string;
  steering?: string;
  min_price?: string;
  max_price?: string;
  min_year?: string;
  max_year?: string;
  sort?: string;
  page?: string;
};

function anon() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

const n = (v?: string) => (v && Number.isFinite(Number(v)) && Number(v) > 0 ? Number(v) : null);

export const PAGE_SIZE = 24;

export async function listCars(f: Filters, size = PAGE_SIZE) {
  const page = Math.max(1, Number(f.page) || 1);
  const { data, error } = await anon().rpc("public_vehicles", {
    p_q: f.q?.trim() || null,
    p_make: f.make || null,
    p_body: f.body || null,
    p_fuel: f.fuel || null,
    p_trans: f.trans || null,
    p_steering: f.steering || null,
    p_min_price: n(f.min_price),
    p_max_price: n(f.max_price),
    p_min_year: n(f.min_year),
    p_max_year: n(f.max_year),
    p_sort: f.sort || "new",
    p_limit: size,
    p_offset: (page - 1) * size,
  });
  const cars = (data ?? []) as PublicCard[];
  return { cars, total: cars[0] ? Number(cars[0].total_count) : 0, page, error: error?.message ?? null };
}

export type Facets = { make: [string, number][]; body: [string, number][]; fuel: [string, number][]; transmission: [string, number][]; steering: [string, number][]; total: number; available: number };

export const getFacets = cache(async (): Promise<Facets> => {
  const { data } = await anon().rpc("public_facets");
  const out: Facets = { make: [], body: [], fuel: [], transmission: [], steering: [], total: 0, available: 0 };
  for (const r of (data ?? []) as { kind: string; value: string | null; n: number }[]) {
    if (r.kind === "total") out.total = Number(r.n);
    else if (r.kind === "available") out.available = Number(r.n);
    else if (r.value && r.kind in out) (out[r.kind as "make"] as [string, number][]).push([r.value, Number(r.n)]);
  }
  for (const k of ["make", "body", "fuel", "transmission", "steering"] as const) out[k].sort((a, b) => b[1] - a[1]);
  return out;
});

export const getCompany = cache(async (): Promise<PublicCompany> => {
  const { data } = await anon().rpc("public_company");
  return ((data ?? [])[0] as PublicCompany) ?? { company_name: "Al Mashriq Trading Co., Ltd.", phone: null, mobile: null, fax: null, email: null, website: null, logo_url: null, address: null };
});

export const getCar = cache(async (key: string): Promise<PublicCar | null> => {
  const { data } = await anon().rpc("public_vehicle", { p_key: key });
  return ((data ?? [])[0] as PublicCar) ?? null;
});

export const carTitle = (c: { year: number | null; make: string; model: string }) => [c.make, c.model, c.year].filter(Boolean).join(" ").toUpperCase();

export function priceLabel(c: { price: number | null; price_currency: Currency }) {
  if (c.price == null || !(Number(c.price) > 0)) return null;
  return new Intl.NumberFormat("en-US", { style: "currency", currency: c.price_currency || "USD", maximumFractionDigits: 0 }).format(Number(c.price));
}

/** wa.me link with a ready-made message. */
export function whatsapp(company: PublicCompany, message: string) {
  const num = (company.mobile || company.phone || "").replace(/[^\d]/g, "").replace(/^0+/, "");
  return num ? `https://wa.me/${num}?text=${encodeURIComponent(message)}` : null;
}
