import type { Metadata } from "next";
import { makeSlug, type Filters } from "@/lib/public-site";
import { CarListing } from "../car-listing";

export const revalidate = 60;

type SP = Filters & { brand?: string; body_type?: string; transmission?: string };
const norm = (raw: SP): Filters => ({ ...raw, make: raw.make || raw.brand, body: raw.body || raw.body_type, trans: raw.trans || raw.transmission });

export async function generateMetadata({ searchParams }: { searchParams: Promise<SP> }): Promise<Metadata> {
  const f = norm(await searchParams);
  const label = [f.make, f.body].filter(Boolean).join(" ");
  const keys = Object.entries(f).filter(([k, v]) => v && !["sort", "page"].includes(k)).map(([k]) => k);
  const onlyMake = keys.length === 1 && keys[0] === "make";
  return {
    title: `${label ? `${label} ` : ""}Used cars for sale from Japan`,
    description: `Browse ${label ? `${label} ` : ""}Japanese used cars in stock at Al Mashriq Trading — FOB prices, full photos and C&F quotations to your port.`,
    // Make-only searches point at the make landing page; other filter combinations aren't indexed separately.
    alternates: { canonical: onlyMake ? `/makes/${makeSlug(f.make!)}` : "/cars" },
    robots: keys.length && !onlyMake ? { index: false, follow: true } : undefined,
  };
}

export default async function PublicCars({ searchParams }: { searchParams: Promise<SP> }) {
  const raw = await searchParams;
  const f = norm(raw);
  delete (f as SP).brand;
  delete (f as SP).body_type;
  delete (f as SP).transmission;
  return <CarListing f={f} path="/cars" heading={f.make ? `${f.make} for sale` : f.body ? `${f.body} for sale` : "Japanese used cars for sale"} />;
}
