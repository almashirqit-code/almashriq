import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getMakeTiles, makeSlug, type Filters } from "@/lib/public-site";
import { MARKETS } from "@/lib/markets";
import { POPULAR_MODELS } from "@/lib/models";
import { CarListing } from "../../car-listing";

export const revalidate = 86400;

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
  const models = POPULAR_MODELS.filter((x) => makeSlug(x.make) === m.slug);
  return (
    <CarListing
      f={{ ...sp, make: m.value }}
      lockMake
      path={`/makes/${m.slug}`}
      heading={`Used ${m.label} for sale`}
      intro={
        <div className="mt-2 max-w-3xl text-sm text-white/70">
          {m.logo && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={m.logo} alt={`${m.label} logo`} className="mb-2 h-10 w-auto object-contain" />
          )}
          <p>
            Browse {m.n.toLocaleString()} used {m.label} cars in stock in Japan, each with full photos, honest mileage and an FOB price. We
            export {m.label} vehicles worldwide by RoRo or container and send a C&amp;F quotation to your port before you pay.
          </p>
          {models.length > 0 && (
            <p className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
              <span className="font-semibold">Popular {m.label} models:</span>
              {models.map((o) => (
                <Link key={o.slug} href={`/models/${o.slug}`} className="underline">
                  {o.model}
                </Link>
              ))}
            </p>
          )}
          <p className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
            <span className="font-semibold">Shipping to:</span>
            {MARKETS.map((x) => (
              <Link key={x.slug} href={`/export/${x.slug}`} className="underline">
                {x.name}
              </Link>
            ))}
          </p>
        </div>
      }
    />
  );
}
