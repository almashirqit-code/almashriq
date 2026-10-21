/**
 * Bundled brand logos (public/brand/makes) and country flags (public/flags).
 * Logos: car-logos-dataset / simple-icons (CC0). Flags: flag-icons (MIT).
 * Brand names and logos belong to their owners and are used only to identify the make of vehicles for sale.
 * A logo uploaded in Configuration → Make logos always takes priority.
 */
const LOGOS: Record<string, string> = {
  toyota: "toyota.png",
  lexus: "lexus.png",
  honda: "honda.png",
  nissan: "nissan.png",
  mazda: "mazda.png",
  suzuki: "suzuki.png",
  mitsubishi: "mitsubishi.png",
  subaru: "subaru.png",
  daihatsu: "daihatsu.png",
  isuzu: "isuzu.png",
  hino: "hino.png",
  "mercedes-benz": "mercedes-benz.png",
  bmw: "bmw.png",
  audi: "audi.png",
  volkswagen: "volkswagen.png",
  ford: "ford.png",
  fiat: "fiat.png",
  "land-rover": "land-rover.png",
  hitachi: "hitachi.svg",
  "john-deere": "john-deere.svg",
};

const key = (make: string) => make.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

/** Bundled logo for a make, if we have one ("Mercedes Benz" → /brand/makes/mercedes-benz.png). */
export function defaultMakeLogo(make: string) {
  const f = LOGOS[key(make)];
  return f ? `/brand/makes/${f}` : null;
}

export const FLAGS: Record<string, string> = {
  gh: "Ghana",
  ke: "Kenya",
  ng: "Nigeria",
  tz: "Tanzania",
  jm: "Jamaica",
  tt: "Trinidad and Tobago",
  gy: "Guyana",
  gb: "United Kingdom",
  mn: "Mongolia",
  pk: "Pakistan",
};

const ALIASES: Record<string, string> = { uk: "gb", "united kingdom": "gb", england: "gb", britain: "gb", "great britain": "gb", trinidad: "tt", "trinidad & tobago": "tt" };

/** Flag image for a country name or ISO code, if bundled. */
export function flagFor(country: string | null | undefined) {
  if (!country) return null;
  const c = country.trim().toLowerCase();
  const code = FLAGS[c] ? c : ALIASES[c] ?? Object.keys(FLAGS).find((k) => FLAGS[k].toLowerCase() === c);
  return code ? `/flags/${code}.svg` : null;
}
