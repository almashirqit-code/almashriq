import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Filters } from "@/lib/public-site";
import { makeSlug } from "@/lib/public-site";
import { modelBySlug, POPULAR_MODELS } from "@/lib/models";
import { CarListing } from "../../car-listing";

export const revalidate = 300;

export async function generateMetadata({ params }: { params: Promise<{ model: string }> }): Promise<Metadata> {
  const m = modelBySlug((await params).model);
  if (!m) return { title: "Model not found", robots: { index: false } };
  return {
    title: `Used ${m.make} ${m.model} for sale from Japan`,
    description: `Used ${m.make} ${m.model} in stock in Japan with full photos and FOB prices. Japanese exporter — C&F quotations to your port by RoRo or container.`,
    alternates: { canonical: `/models/${m.slug}` },
  };
}

export default async function ModelPage({ params, searchParams }: { params: Promise<{ model: string }>; searchParams: Promise<Filters> }) {
  const [{ model }, sp] = await Promise.all([params, searchParams]);
  const m = modelBySlug(model);
  if (!m) notFound();
  const others = POPULAR_MODELS.filter((x) => x.slug !== m.slug);
  return (
    <CarListing
      f={{ ...sp, make: m.make, q: m.q }}
      lockMake
      lockQ
      crumb={`${m.make} ${m.model}`}
      path={`/models/${m.slug}`}
      heading={`Used ${m.make} ${m.model} for sale`}
      intro={
        <div className="mt-2 max-w-3xl text-sm text-white/70">
          <p>{m.blurb} Every car comes with full photos, honest mileage and a C&amp;F price to your port.</p>
          <p className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
            <Link href={`/makes/${makeSlug(m.make)}`} className="font-semibold underline">All used {m.make}</Link>
            {others.slice(0, 5).map((o) => (
              <Link key={o.slug} href={`/models/${o.slug}`} className="underline">
                {o.make} {o.model}
              </Link>
            ))}
          </p>
        </div>
      }
    />
  );
}
