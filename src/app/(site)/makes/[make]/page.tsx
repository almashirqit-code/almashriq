import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getMakeTiles, type Filters } from "@/lib/public-site";
import { CarListing } from "../../car-listing";

export const revalidate = 300;

async function find(slug: string) {
  return (await getMakeTiles()).find((m) => m.slug === slug) ?? null;
}

export async function generateMetadata({ params }: { params: Promise<{ make: string }> }): Promise<Metadata> {
  const m = await find((await params).make);
  if (!m) return { title: "Make not found", robots: { index: false } };
  return {
    title: `Used ${m.label} cars for sale from Japan`,
    description: `${m.n} used ${m.label} cars in stock. Japanese ${m.label} exporter — FOB prices, photos, inspection and shipping by RoRo or container.`,
    alternates: { canonical: `/makes/${m.slug}` },
    openGraph: m.logo ? { images: [m.logo] } : undefined,
  };
}

export default async function MakePage({ params, searchParams }: { params: Promise<{ make: string }>; searchParams: Promise<Filters> }) {
  const [{ make }, sp] = await Promise.all([params, searchParams]);
  const m = await find(make);
  if (!m) notFound();
  return (
    <CarListing
      f={{ ...sp, make: m.value }}
      lockMake
      path={`/makes/${m.slug}`}
      heading={`Used ${m.label} for sale`}
      intro={
        m.logo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={m.logo} alt={`${m.label} logo`} className="mt-2 h-10 w-auto object-contain" />
        ) : null
      }
    />
  );
}
