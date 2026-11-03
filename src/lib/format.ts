import type { Currency } from "./types";

const DECIMALS: Record<Currency, number> = { JPY: 0, USD: 2, EUR: 2, GBP: 2, SGD: 2, TWD: 0, THB: 2, PKR: 0 };

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

/** Public base URL of the photo store (Cloudflare R2, see src/lib/photo-store.ts). */
const PHOTO_BASE = `${process.env.NEXT_PUBLIC_PHOTO_URL}/`;

/** Public URL of a stock photo (photo store; legacy "site-assets:…" paths are site images). */
export function publicImageUrl(path: string) {
  if (path.startsWith("site-assets:")) return siteAssetUrl(path.slice(12));
  return PHOTO_BASE + path;
}

/** Public URL of a site image (blog, reviews, make logos, avatars), stored under site-assets/ in the photo store. Full URLs and site paths are returned unchanged. */
export function siteAssetUrl(path: string) {
  return path.startsWith("http") || path.startsWith("/") ? path : `${PHOTO_BASE}site-assets/${path}`;
}

/*
 * Card thumbnails: every listing photo gets a small WebP copy at thumbs/<same path>.webp, made on upload.
 * Cards show the thumbnail and fall back to the full photo if it isn't there.
 */

/** Storage path of a photo's thumbnail. */
export function thumbPath(path: string) {
  return `thumbs/${path.replace(/\.[^./]+$/, "")}.webp`;
}

/** Thumbnail URL for a full photo URL; other URLs (site-assets, external) are returned unchanged. */
export function thumbUrl(url: string) {
  if (!url.startsWith(PHOTO_BASE)) return url;
  const path = url.slice(PHOTO_BASE.length).split("?")[0];
  return path.startsWith("thumbs/") ? url : PHOTO_BASE + thumbPath(path);
}

/** Photo paths plus their thumbnails, for deleting both from the bucket. */
export function withThumbs(paths: string[]) {
  return [...paths, ...paths.map(thumbPath)];
}

export function vehicleTitle(v: { year?: number | null; make: string; model: string; grade?: string | null }) {
  return [v.year, v.make, v.model, v.grade].filter(Boolean).join(" ");
}

/** "MINI VAN" → "Mini Van", "Bmw" → "BMW": display labels for makes and body types stored in mixed case. */
export const titleCase = (s: string) =>
  s
    .toLowerCase()
    .replace(/\b([a-z])/g, (c) => c.toUpperCase())
    .replace(/\bBmw\b/, "BMW")
    .replace(/\bGmc\b/, "GMC")
    .replace(/\bMg\b/, "MG")
    .replace(/\bSuv\b/, "SUV")
    .replace(/\bMpv\b/, "MPV")
    .replace(/\b(\d+)wd\b/i, (m) => m.toUpperCase());

/** "1 car", "1,508 cars". */
export const plural = (n: number, one: string, many = `${one}s`) => `${n.toLocaleString("en-US")} ${n === 1 ? one : many}`;
