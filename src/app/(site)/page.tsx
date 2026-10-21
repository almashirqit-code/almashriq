import type { Metadata } from "next";
import { flagFor, FLAGS } from "@/lib/brand-assets";
import { dicebear } from "@/lib/avatar";
import Link from "next/link";
import { Search, ShieldCheck, Ship, Banknote, ArrowRight, Car, Send, Quote, FileCheck2, Globe } from "lucide-react";
import { publicImageUrl } from "@/lib/format";
import { getCompany, getFacets, listCars, whatsapp, carTitle, priceLabel, getMakeTiles, getReviews, getPosts, assetUrl } from "@/lib/public-site";
import { CarCard } from "./car-card";
import { HeroSlider } from "@/components/site/hero-slider";
import { Stars } from "@/components/site/stars";
import { BUY_STEPS } from "@/components/site/buy-steps";

export const revalidate = 60;

export const metadata: Metadata = {
  title: { absolute: "Al Mashriq Trading — Japanese used cars for export" },
  description: "Quality Japanese used cars and spare parts, exported worldwide by RoRo and container. Browse our stock with full photos and get a C&F quotation to your port.",
  alternates: { canonical: "/" },
};

const PRICE_BANDS: { label: string; min?: number; max?: number }[] = [
  { label: "Under $3,000", max: 3000 },
  { label: "$3,000 – $5,000", min: 3000, max: 5000 },
  { label: "$5,000 – $10,000", min: 5000, max: 10000 },
  { label: "$10,000 – $20,000", min: 10000, max: 20000 },
  { label: "Over $20,000", min: 20000 },
];

const SELECT = "w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 outline-none focus:border-navy-500";

export default async function PublicHome() {
  const [company, facets, latest, makes, reviews, posts] = await Promise.all([
    getCompany(),
    getFacets(),
    listCars({ sort: "new" }, 24),
    getMakeTiles(),
    getReviews(12),
    getPosts(3),
  ]);
  const available = latest.cars.filter((c) => c.status === "in_stock");
  const arrivals = (available.length >= 8 ? available : latest.cars).slice(0, 12);
  const slides = (available.length ? available : latest.cars)
    .filter((c) => c.cover || c.images?.length)
    .slice(0, 6)
    .map((c) => ({
      image: publicImageUrl(c.images?.[0] ?? c.cover!),
      title: carTitle(c),
      subtitle: [c.grade, c.mileage != null ? `${c.mileage.toLocaleString()} km` : null, priceLabel(c) ? `FOB ${priceLabel(c)}` : "Ask for price"].filter(Boolean).join(" · "),
      href: `/cars/${encodeURIComponent(c.stock_no)}`,
      tag: "New arrival",
    }));
  const years = Array.from({ length: 30 }, (_, i) => new Date().getFullYear() - i);

  return (
    <>
      {/* Hero: slider + quick search */}
      <section className="bg-gradient-to-b from-navy-900 to-navy-800">
        <div className="mx-auto grid max-w-7xl gap-4 px-4 py-6 lg:grid-cols-[1fr_22rem] lg:px-6">
          {slides.length ? (
            <HeroSlider slides={slides} />
          ) : (
            <div className="flex min-h-[18rem] flex-col justify-end rounded-3xl bg-navy-950 p-8 text-white">
              <h1 className="text-3xl font-black">Japanese used cars, shipped to your port.</h1>
            </div>
          )}
          <form action="/cars" className="rounded-3xl bg-white p-5 shadow-xl">
            <h1 className="text-lg font-black leading-tight text-navy-950">
              Japanese used cars <span className="text-brand-600">exported worldwide</span>
            </h1>
            <p className="mt-1 text-xs text-slate-500">{facets.available.toLocaleString()} cars ready to ship — search our stock</p>
            <div className="mt-4 space-y-2.5">
              <select name="make" defaultValue="" className={SELECT} aria-label="Make">
                <option value="">All makes</option>
                {facets.make.map(([m, n]) => (
                  <option key={m} value={m}>
                    {m} ({n})
                  </option>
                ))}
              </select>
              <select name="body" defaultValue="" className={SELECT} aria-label="Body type">
                <option value="">All body types</option>
                {facets.body.map(([b, n]) => (
                  <option key={b} value={b}>
                    {b} ({n})
                  </option>
                ))}
              </select>
              <div className="grid grid-cols-2 gap-2">
                <select name="min_year" defaultValue="" className={SELECT} aria-label="Year from">
                  <option value="">Year from</option>
                  {years.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
                <select name="max_price" defaultValue="" className={SELECT} aria-label="Max price">
                  <option value="">Max price</option>
                  {[2000, 3000, 5000, 8000, 10000, 15000, 20000, 30000].map((p) => (
                    <option key={p} value={p}>
                      ${p.toLocaleString()}
                    </option>
                  ))}
                </select>
              </div>
              <input name="q" placeholder="Model, stock ID or chassis…" className={SELECT} aria-label="Keyword" />
              <button className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-brand-600 py-3 text-sm font-bold text-white hover:bg-brand-700">
                <Search className="h-4 w-4" /> Search cars
              </button>
            </div>
          </form>
        </div>
        <div className="border-t border-white/10">
          <div className="mx-auto grid max-w-7xl grid-cols-2 gap-3 px-4 py-4 text-white lg:grid-cols-4 lg:px-6">
            {[
              { icon: ShieldCheck, t: "Inspected stock", d: "Real photos & honest specs" },
              { icon: Ship, t: "RoRo & container", d: "To ports worldwide" },
              { icon: Banknote, t: "Secure TT payment", d: "Invoice in your name" },
              { icon: FileCheck2, t: "Export documents", d: "Sent by DHL / FedEx" },
            ].map(({ icon: I, t, d }) => (
              <div key={t} className="flex items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-600">
                  <I className="h-5 w-5" />
                </span>
                <div>
                  <div className="text-sm font-bold">{t}</div>
                  <div className="text-xs text-navy-200">{d}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Shop by make */}
      {makes.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 pt-10 lg:px-6">
          <SectionHead title="Shop by make" href="/cars" link="All stock" />
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
            {makes.slice(0, 16).map((m) => (
              <Link
                key={m.slug}
                href={`/makes/${m.slug}`}
                className="group flex flex-col items-center justify-center gap-2 rounded-xl bg-white p-3 text-center shadow-sm ring-1 ring-slate-200 transition hover:-translate-y-0.5 hover:shadow-md hover:ring-navy-300"
              >
                <span className="flex h-12 w-full items-center justify-center">
                  {m.logo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={m.logo} alt={`${m.label} logo`} loading="lazy" className="max-h-12 max-w-[80%] object-contain" />
                  ) : (
                    <span className="flex h-12 w-12 items-center justify-center rounded-full bg-navy-800 text-lg font-black text-white group-hover:bg-brand-600">{m.label.slice(0, 1)}</span>
                  )}
                </span>
                <span className="text-xs font-bold text-navy-900">{m.label}</span>
                <span className="text-[11px] text-slate-400">{m.n} cars</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Body types + price bands */}
      <section className="mx-auto grid max-w-7xl gap-6 px-4 pt-10 lg:grid-cols-2 lg:px-6">
        <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <h2 className="mb-3 border-l-4 border-brand-600 pl-3 text-lg font-black text-navy-950">Search by body type</h2>
          <div className="flex flex-wrap gap-2">
            {facets.body.slice(0, 14).map(([b, n]) => (
              <Link key={b} href={`/cars?body=${encodeURIComponent(b)}`} className="inline-flex items-center gap-2 rounded-lg bg-navy-50 px-3 py-2 text-sm font-semibold text-navy-900 hover:bg-navy-800 hover:text-white">
                <Car className="h-4 w-4" /> {b} <span className="text-xs opacity-60">{n}</span>
              </Link>
            ))}
          </div>
        </div>
        <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <h2 className="mb-3 border-l-4 border-brand-600 pl-3 text-lg font-black text-navy-950">Search by price</h2>
          <div className="flex flex-wrap gap-2">
            {PRICE_BANDS.map((p) => (
              <Link
                key={p.label}
                href={`/cars?${new URLSearchParams({ ...(p.min ? { min_price: String(p.min) } : {}), ...(p.max ? { max_price: String(p.max) } : {}), sort: "price_asc" })}`}
                className="rounded-lg bg-brand-50 px-3 py-2 text-sm font-semibold text-brand-800 hover:bg-brand-600 hover:text-white"
              >
                {p.label}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* New arrivals */}
      <section className="mx-auto max-w-7xl px-4 pt-10 lg:px-6">
        <SectionHead title="New arrivals" href="/cars" link="View all stock" />
        {arrivals.length ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {arrivals.map((c) => (
              <CarCard key={c.id} c={c} wa={whatsapp(company, `Hello, I'm interested in ${c.stock_no} ${carTitle(c)}.`)} />
            ))}
          </div>
        ) : (
          <div className="rounded-xl bg-white p-10 text-center text-slate-500 ring-1 ring-slate-200">New stock is being added — check back soon.</div>
        )}
      </section>

      {/* Reviews */}
      {reviews.count > 0 && (
        <section className="mt-12 bg-white py-10">
          <div className="mx-auto max-w-7xl px-4 lg:px-6">
            <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="border-l-4 border-brand-600 pl-3 text-2xl font-black text-navy-950">What our customers say</h2>
                <div className="mt-2 flex items-center gap-2 pl-4 text-sm text-slate-600">
                  <Stars value={reviews.avg} /> <b>{reviews.avg.toFixed(1)}</b> from {reviews.count} reviews
                </div>
              </div>
              <Link href="/reviews" className="inline-flex items-center gap-1 text-sm font-bold text-brand-700 hover:underline">
                All reviews <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="flex snap-x gap-4 overflow-x-auto pb-2">
              {reviews.reviews.slice(0, 8).map((r) => (
                <figure key={r.id} className="w-80 shrink-0 snap-start rounded-xl bg-slate-50 p-5 ring-1 ring-slate-200">
                  <div className="flex items-center gap-3">
                    {r.photo_path ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={assetUrl(r.photo_path)!} alt="" className="h-11 w-11 rounded-full object-cover" loading="lazy" />
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={dicebear(r.customer_name)} alt="" className="h-11 w-11 rounded-full" loading="lazy" />
                    )}
                    <div>
                      <figcaption className="text-sm font-bold text-navy-950">{r.customer_name}</figcaption>
                      <div className="flex items-center gap-1.5 text-xs text-slate-500">
                        {flagFor(r.country) && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={flagFor(r.country)!} alt="" className="h-3 w-4 rounded-[2px] object-cover ring-1 ring-black/10" />
                        )}
                        {[r.country, r.vehicle].filter(Boolean).join(" · ")}
                      </div>
                    </div>
                  </div>
                  <Stars value={r.rating} size="mt-3 h-3.5 w-3.5" />
                  <blockquote className="mt-2 line-clamp-5 text-sm leading-6 text-slate-700">
                    <Quote className="mr-1 inline h-3.5 w-3.5 text-brand-500" />
                    {r.body}
                  </blockquote>
                </figure>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* How to buy */}
      <section className="mx-auto max-w-7xl px-4 pt-12 lg:px-6">
        <SectionHead title="How to buy from Japan" href="/how-to-buy" link="Full guide" />
        <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {BUY_STEPS.map((s, i) => (
            <li key={s.title} className="flex gap-4 rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-navy-800 text-lg font-black text-white">{i + 1}</span>
              <div>
                <h3 className="font-bold text-navy-950">{s.title}</h3>
                <p className="mt-1 text-sm leading-6 text-slate-600">{s.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* Destinations */}
      <section className="mx-auto max-w-7xl px-4 pt-10 lg:px-6">
        <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <h2 className="mb-4 border-l-4 border-brand-600 pl-3 text-lg font-black text-navy-950">We export worldwide — including</h2>
          <ul className="flex flex-wrap gap-x-6 gap-y-3">
            {Object.entries(FLAGS).map(([code, name]) => (
              <li key={code} className="flex items-center gap-2 text-sm font-semibold text-navy-900">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/flags/${code}.svg`} alt="" className="h-4 w-6 rounded-sm object-cover ring-1 ring-black/10" loading="lazy" />
                {name}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Blog */}
      {posts.posts.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 pt-12 lg:px-6">
          <SectionHead title="From our blog" href="/blog" link="All articles" />
          <div className="grid gap-4 md:grid-cols-3">
            {posts.posts.map((p) => (
              <Link key={p.slug} href={`/blog/${p.slug}`} className="group overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-200 hover:shadow-md">
                <div className="aspect-[16/9] bg-navy-100">
                  {p.cover_path && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={assetUrl(p.cover_path)!} alt="" loading="lazy" className="h-full w-full object-cover" />
                  )}
                </div>
                <div className="p-4">
                  <time className="text-xs text-slate-400" dateTime={p.published_at}>
                    {new Date(p.published_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                  </time>
                  <h3 className="mt-1 line-clamp-2 font-bold text-navy-950 group-hover:text-brand-700">{p.title}</h3>
                  {p.excerpt && <p className="mt-1 line-clamp-2 text-sm text-slate-600">{p.excerpt}</p>}
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="mx-auto max-w-7xl px-4 pt-12 lg:px-6">
        <div className="flex flex-col items-start justify-between gap-5 rounded-2xl bg-gradient-to-r from-navy-900 to-navy-700 p-8 text-white md:flex-row md:items-center">
          <div className="flex gap-4">
            <Globe className="hidden h-12 w-12 shrink-0 text-brand-400 sm:block" />
            <div>
              <h2 className="text-2xl font-black">Can&apos;t find the car you want?</h2>
              <p className="mt-1 text-navy-100">Tell us the model, year and budget — we buy daily at Japanese auctions and ship to your port.</p>
            </div>
          </div>
          <Link href="/contact" className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-brand-600 px-6 py-3 font-bold hover:bg-brand-700">
            <Send className="h-4 w-4" /> Send an inquiry
          </Link>
        </div>
      </section>
    </>
  );
}

function SectionHead({ title, href, link }: { title: string; href: string; link: string }) {
  return (
    <div className="mb-4 flex items-end justify-between gap-3">
      <h2 className="border-l-4 border-brand-600 pl-3 text-2xl font-black text-navy-950">{title}</h2>
      <Link href={href} className="inline-flex items-center gap-1 text-sm font-bold text-brand-700 hover:underline">
        {link} <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );
}
