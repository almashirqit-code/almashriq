/**
 * Parsers for the old website (almashriqtrading.site).
 * Pure string functions — no DOM — so they run in server actions.
 */

export const SITE_ORIGIN = "https://www.almashriqtrading.site";
export const SITE_HOSTS = ["www.almashriqtrading.site", "almashriqtrading.site"];

export type SiteCar = {
  ref: string; // "site:36161"
  siteId: string; // "36161"
  url: string;
  stock_no: string; // "AM-36161"
  make: string;
  model: string;
  grade: string | null;
  model_code: string | null;
  year: number | null;
  month: number | null;
  mileage: number | null;
  engine_cc: number | null;
  fuel: string | null;
  transmission: string | null;
  drive: string | null;
  steering: string | null;
  doors: number | null;
  seats: number | null;
  body_type: string | null;
  color: string | null;
  chassis: string | null; // may be masked ("ZSU186-001****")
  location: string | null;
  price: number | null; // USD FOB, null = "Ask for price"
  features: string[];
  images: string[];
  addedOn: string | null;
};

const decode = (s: string) =>
  s
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();

const titleCase = (s: string) =>
  s
    .toLowerCase()
    .replace(/\b([a-z])/g, (c) => c.toUpperCase())
    .replace(/\bBmw\b/, "BMW")
    .replace(/\bGmc\b/, "GMC")
    .replace(/\bMg\b/, "MG")
    .replace(/\bSuv\b/, "SUV")
    .replace(/\bMpv\b/, "MPV")
    .replace(/\b(\d+)wd\b/i, (m) => m.toUpperCase());

const int = (s: string | undefined | null) => {
  if (!s) return null;
  const n = parseInt(s.replace(/[^\d]/g, ""), 10);
  return Number.isFinite(n) && n > 0 ? n : null;
};
const blank = (s: string | undefined | null) => {
  const v = (s ?? "").trim();
  return v && v !== "-" && v.toLowerCase() !== "n/a" ? v : null;
};

/** Absolute URL for a site link (handles relative paths). */
export function absolute(u: string) {
  return u.startsWith("http") ? u : `${SITE_ORIGIN}${u.startsWith("/") ? "" : "/"}${u}`;
}

export function siteIdFromUrl(u: string) {
  return u.match(/\/car\/details\/[^/]+\/(\d+)/)?.[1] ?? null;
}

/** Car links + highest page number from a /cars listing page. */
export function parseListing(html: string) {
  const links = [...new Set([...html.matchAll(/href="([^"]*\/car\/details\/[^"]+)"/g)].map((m) => absolute(m[1].replace(/&amp;/g, "&"))))];
  const pages = [...html.matchAll(/[?&]page=(\d+)/g)].map((m) => Number(m[1]));
  return { links, maxPage: pages.length ? Math.max(...pages) : 1 };
}

/** "Sold" / "Reserve" ribbons on the homepage cards → site id → status. */
export function parseStatusTags(html: string) {
  const out: Record<string, "sold" | "reserved"> = {};
  const links = [...html.matchAll(/\/car\/details\/[^"]+?\/(\d+)"/g)].map((m) => ({ id: m[1], at: m.index ?? 0 }));
  for (const m of html.matchAll(/<span>\s*(Sold|Reserve|Reserved)\s*<\/span>/gi)) {
    const at = m.index ?? 0;
    let best: { id: string; d: number } | null = null;
    for (const l of links) {
      const d = Math.abs(l.at - at);
      if (d < 2500 && (!best || d < best.d)) best = { id: l.id, d };
    }
    if (best) out[best.id] = /^sold$/i.test(m[1]) ? "sold" : "reserved";
  }
  return out;
}

/** Full vehicle record from a /car/details/... page. */
export function parseDetail(html: string, url: string): SiteCar | null {
  const specs: Record<string, string> = {};
  for (const m of html.matchAll(/<th[^>]*>([\s\S]*?)<\/th>\s*<td[^>]*>([\s\S]*?)<\/td>/g)) specs[decode(m[1]).toLowerCase()] = decode(m[2]);
  for (const m of html.matchAll(/<div class="col-6 label[^"]*">([\s\S]*?)<\/div>\s*<div class="col-6 value[^"]*">([\s\S]*?)<\/div>/g))
    specs[decode(m[1]).toLowerCase()] = decode(m[2]);

  const siteId = siteIdFromUrl(url) ?? (specs["stock id #"] ?? "").replace(/\D/g, "");
  const title = decode(html.match(/<h4 class="title">([\s\S]*?)<\/h4>/)?.[1] ?? "");
  const make = blank(specs["make"]) ?? title.split(" ")[0] ?? "";
  const model = blank(specs["model"]) ?? "";
  if (!siteId || !make || !model) return null;

  const reg = (specs["registration year/month"] || specs["manufacture year/month"] || "").match(/(\d{4})\D*(\d{1,2})?/);
  const titleYear = title.match(/\b(19[5-9]\d|20[0-4]\d)\b/)?.[1];
  const year = Number(reg?.[1] ?? titleYear) || null;
  const month = reg?.[2] ? Math.min(12, Math.max(1, Number(reg[2]))) : null;

  const trans = (specs["transmission"] ?? "").toUpperCase();
  const steer = (specs["steering"] ?? "").toUpperCase();
  const priceText = specs["fob price"] ?? "";
  const price = /ask/i.test(priceText) ? null : Number(priceText.replace(/[^\d.]/g, "")) || null;

  // Car photos sit in the slider; everything else under /images/ is site chrome.
  const images: string[] = [];
  for (const m of html.matchAll(/muhib-slider-slide"[^>]*>\s*<img[^>]+src="([^"]+)"/g)) {
    const u = absolute(m[1]);
    if (!images.includes(u)) images.push(u);
  }
  const features = [...html.matchAll(/<span\s+class="\s*active\s*"\s*>([^<]+)<\/span>/g)].map((m) => decode(m[1])).filter(Boolean);

  return {
    ref: `site:${siteId}`,
    siteId,
    url,
    stock_no: blank(specs["stock id #"]) ?? `AM-${siteId}`,
    make: titleCase(make),
    model: titleCase(model),
    grade: blank(specs["version/class"]),
    model_code: blank(specs["model code"]),
    year,
    month,
    mileage: int(specs["mileage"]),
    engine_cc: int(specs["engine cc"]),
    fuel: blank(specs["fuel"]) ? titleCase(specs["fuel"]) : null,
    transmission: trans.startsWith("AUTO") ? "AT" : trans.startsWith("MAN") ? "MT" : blank(trans),
    drive: blank(specs["drive type"]),
    steering: steer.startsWith("RIGHT") ? "RHD" : steer.startsWith("LEFT") ? "LHD" : blank(steer),
    doors: int(specs["doors"]),
    seats: int(specs["seats"]),
    body_type: blank(specs["body type"]) ? titleCase(specs["body type"]) : null,
    color: blank(specs["color"]) ? titleCase(specs["color"]) : null,
    chassis: blank(specs["chassis no"]),
    location: blank(specs["location"]) ? titleCase(specs["location"]) : null,
    price,
    features,
    images,
    addedOn: blank(specs["added on"]),
  };
}
