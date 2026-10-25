import type { Currency } from "./types";

const DECIMALS: Record<Currency, number> = { JPY: 0, USD: 2, EUR: 2, GBP: 2, SGD: 2, TWD: 0, THB: 2 };

export function money(value: number | null | undefined, currency: Currency = "JPY", locale = "en") {
  const v = Number(value ?? 0);
  return new Intl.NumberFormat(locale === "ja" ? "ja-JP" : "en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: DECIMALS[currency] ?? 2,
    maximumFractionDigits: DECIMALS[currency] ?? 2,
  }).format(v);
}

export function num(value: number | null | undefined, locale = "en") {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return "—";
  return new Intl.NumberFormat(locale === "ja" ? "ja-JP" : "en-US").format(Number(value));
}

export function date(value: string | null | undefined, locale = "en") {
  if (!value) return "—";
  const d = new Date(value.length === 10 ? value + "T00:00:00" : value);
  return new Intl.DateTimeFormat(locale === "ja" ? "ja-JP" : "en-GB", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(d);
}

export function round(value: number, currency: Currency) {
  const f = 10 ** (DECIMALS[currency] ?? 2);
  return Math.round(value * f) / f;
}

/** Convert an amount between currencies using rates expressed as "1 unit = N JPY". */
export function convert(
  amount: number,
  from: Currency,
  to: Currency,
  rates: Partial<Record<Currency, number>>
) {
  if (from === to) return amount;
  const fromRate = from === "JPY" ? 1 : Number(rates[from] || 0);
  const toRate = to === "JPY" ? 1 : Number(rates[to] || 0);
  if (!fromRate || !toRate) return amount;
  return round((amount * fromRate) / toRate, to);
}

/** Public URL of a stock photo (vehicle-images bucket; "site-assets:…" paths live in site-assets). */
export function publicImageUrl(path: string) {
  const [bucket, p] = path.startsWith("site-assets:") ? ["site-assets", path.slice(12)] : ["vehicle-images", path];
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${bucket}/${p}`;
}

/*
 * Card thumbnails: every listing photo in the vehicle-images bucket gets a small WebP copy at
 * thumbs/<same path>.webp (made on upload; older photos by Admin → System → "Create missing thumbnails").
 * Cards show the thumbnail and fall back to the full photo if it isn't there yet.
 * Keep in sync with staff_photo_thumbs_missing() in migration 0032.
 */
const PUBLIC_BUCKET = "/storage/v1/object/public/vehicle-images/";

/** Storage path of a photo's thumbnail (vehicle-images bucket). */
export function thumbPath(path: string) {
  return `thumbs/${path.replace(/\.[^./]+$/, "")}.webp`;
}

/** Thumbnail URL for a full photo URL; other URLs (site-assets, external) are returned unchanged. */
export function thumbUrl(url: string) {
  const i = url.indexOf(PUBLIC_BUCKET);
  if (i < 0) return url;
  const path = url.slice(i + PUBLIC_BUCKET.length).split("?")[0];
  return path.startsWith("thumbs/") ? url : url.slice(0, i + PUBLIC_BUCKET.length) + thumbPath(path);
}

/** Photo paths plus their thumbnails, for deleting both from the bucket. */
export function withThumbs(paths: string[]) {
  return [...paths, ...paths.map(thumbPath)];
}

export function vehicleTitle(v: { year?: number | null; make: string; model: string; grade?: string | null }) {
  return [v.year, v.make, v.model, v.grade].filter(Boolean).join(" ");
}
