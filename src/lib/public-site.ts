import "server-only";
import { cache } from "react";
import { createClient } from "@supabase/supabase-js";
import type { Currency, VehicleStatus } from "./types";
import { defaultMakeLogo } from "./brand-assets";

/** Public pages live at the site root (the ERP is under /admin). Kept as a helper so links stay in one place. */
export async function siteBase() {
  return "";
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
  images: string[];
  branch: string;
};

export type PublicCar = Omit<PublicCard, "cover" | "image_count" | "total_count" | "images" | "branch"> & {
  branch: string | null;
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
  branch?: string;
};

export type PublicBranch = { code: string; name: string; n_cars: number; n_parts: number; n_machines?: number };
/** Active source branches with how much stock each has on the website. */
export const getBranches = cache(async (): Promise<PublicBranch[]> => {
  const { data } = await anon().rpc("public_branches");
  return ((data ?? []) as PublicBranch[]).map((b) => ({ ...b, n_cars: Number(b.n_cars), n_parts: Number(b.n_parts), n_machines: Number(b.n_machines ?? 0) }));
});

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
    p_branch: f.branch || null,
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

/** Public website address (used for canonical URLs, sitemap and share links). */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.almashriqtrading.site").replace(/\/$/, "");

export const assetUrl = (p: string | null | undefined) =>
  p ? (p.startsWith("http") || p.startsWith("/") ? p : `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/site-assets/${p}`) : null;

export type PublicMake = { make: string; label: string; logo_path: string | null; n: number; featured: boolean; sort_order: number };
export const getMakes = cache(async (): Promise<PublicMake[]> => {
  const { data } = await anon().rpc("public_makes");
  return ((data ?? []) as PublicMake[]).map((m) => ({ ...m, n: Number(m.n) }));
});

export type PublicReview = {
  id: string;
  customer_name: string;
  country: string | null;
  rating: number;
  title: string | null;
  body: string;
  vehicle: string | null;
  photo_path: string | null;
  review_date: string;
  avg_rating: number;
  review_count: number;
};
export const getReviews = cache(async (limit = 50) => {
  const { data } = await anon().rpc("public_reviews", { p_limit: limit });
  const rows = (data ?? []) as PublicReview[];
  return { reviews: rows, avg: rows[0] ? Number(rows[0].avg_rating) : 0, count: rows[0] ? Number(rows[0].review_count) : 0 };
});

export type PublicPostCard = { slug: string; title: string; excerpt: string | null; cover_path: string | null; tags: string[]; published_at: string; updated_at: string; total_count: number };
export const getPosts = cache(async (limit = 12, offset = 0) => {
  const { data } = await anon().rpc("public_posts", { p_limit: limit, p_offset: offset });
  const rows = (data ?? []) as PublicPostCard[];
  return { posts: rows, total: rows[0] ? Number(rows[0].total_count) : 0 };
});

export type PublicPost = Omit<PublicPostCard, "total_count"> & { content: string; seo_title: string | null; seo_description: string | null; author: string };
export const getPost = cache(async (slug: string): Promise<PublicPost | null> => {
  const { data } = await anon().rpc("public_post", { p_slug: slug });
  return ((data ?? [])[0] as PublicPost) ?? null;
});

export type PublicPart = {
  id: string;
  part_no: string;
  name: string;
  category: string | null;
  make: string | null;
  model: string | null;
  model_code: string | null;
  year_from: number | null;
  year_to: number | null;
  oem_no: string | null;
  condition: "new" | "used" | "rebuilt";
  quantity: number;
  price: number | null;
  price_currency: Currency;
  description: string | null;
  status: "available" | "reserved";
  created_at: string;
  total_count: number;
  branch: string;
  cover: string | null;
  image_count: number;
  images: string[];
};

export type PublicPartDetail = Omit<PublicPart, "total_count" | "cover" | "image_count"> & { updated_at: string };
export const getPart = cache(async (partNo: string): Promise<PublicPartDetail | null> => {
  const { data } = await anon().rpc("public_part", { p_part_no: partNo });
  return ((data ?? [])[0] as PublicPartDetail) ?? null;
});
export type PartFilters = { q?: string; category?: string; make?: string; condition?: string; branch?: string; page?: string };

export async function listParts(f: PartFilters, size = PAGE_SIZE) {
  const page = Math.max(1, Number(f.page) || 1);
  const { data, error } = await anon().rpc("public_parts", {
    p_q: f.q?.trim() || null,
    p_category: f.category || null,
    p_make: f.make || null,
    p_condition: f.condition || null,
    p_limit: size,
    p_offset: (page - 1) * size,
    p_branch: f.branch || null,
  });
  const parts = (data ?? []) as PublicPart[];
  return { parts, total: parts[0] ? Number(parts[0].total_count) : 0, page, error: error?.message ?? null };
}

export const getPartFacets = cache(async () => {
  const { data } = await anon().rpc("public_part_facets");
  const out = { category: [] as [string, number][], make: [] as [string, number][], total: 0 };
  for (const r of (data ?? []) as { kind: string; value: string | null; n: number }[]) {
    if (r.kind === "total") out.total = Number(r.n);
    else if (r.value && (r.kind === "category" || r.kind === "make")) out[r.kind].push([r.value, Number(r.n)]);
  }
  out.category.sort((a, b) => b[1] - a[1]);
  out.make.sort((a, b) => b[1] - a[1]);
  return out;
});

export async function getSitemapRows() {
  const { data } = await anon().rpc("public_sitemap");
  return (data ?? []) as { kind: "car" | "post" | "make" | "part" | "machine"; key: string; updated: string }[];
}

/** Submits a website inquiry (anonymous, validated by the database). */
export async function submitInquiryRpc(v: {
  name: string;
  email: string;
  phone: string;
  country: string;
  port: string;
  message: string;
  stock_no: string;
  page_url: string;
  source: string;
}) {
  const { data, error } = await anon().rpc("submit_inquiry", {
    p_name: v.name,
    p_email: v.email,
    p_phone: v.phone,
    p_country: v.country,
    p_port: v.port,
    p_message: v.message,
    p_stock_no: v.stock_no,
    p_page_url: v.page_url,
    p_source: v.source,
  });
  return { no: data as number | null, error: error?.message ?? null };
}

/** URL slug for a make landing page ("Land Rover" → "land-rover"). */
export const makeSlug = (make: string) => make.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

/** Makes in stock merged with their logos (most stock first, featured/sorted ones on top). */
export async function getMakeTiles() {
  const [makes, facets] = await Promise.all([getMakes(), getFacets()]);
  const byKey = new Map(makes.map((m) => [m.make.toLowerCase(), m]));
  const tiles = facets.make.map(([label, n]) => {
    const m = byKey.get(label.toLowerCase());
    return { label: m?.label || label, value: label, slug: makeSlug(label), n, logo: assetUrl(m?.logo_path) ?? defaultMakeLogo(label), featured: !!m?.featured, sort: m?.sort_order ?? 999 };
  });
  return tiles.sort((a, b) => Number(b.featured) - Number(a.featured) || a.sort - b.sort || b.n - a.n);
}

/** Bank details printed on invoices, if the company chose to show them on the website. */
export const getBank = cache(async () => {
  const { data } = await anon().rpc("public_bank");
  const row = ((data ?? [])[0] ?? null) as { bank_details: string | null; intermediary_bank: string | null } | null;
  return row && (row.bank_details || row.intermediary_bank) ? row : null;
});
