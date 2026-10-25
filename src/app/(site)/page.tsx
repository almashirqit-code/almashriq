import type { Metadata } from "next";
import { flagFor } from "@/lib/brand-assets";
import { MARKETS } from "@/lib/markets";
import { POPULAR_MODELS } from "@/lib/models";
import { dicebear } from "@/lib/avatar";
import Link from "next/link";
import { Search, ShieldCheck, Ship, Banknote, ArrowRight, Send, Quote, FileCheck2, Globe, ChevronDown } from "lucide-react";
import { publicImageUrl } from "@/lib/format";
import { getCompany, getFacets, getBodyPhotos, listCars, whatsapp, carTitle, priceLabel, getMakeTiles, getReviews, getPosts, assetUrl } from "@/lib/public-site";
import { CarCard } from "./car-card";
import { HeroSlider } from "@/components/site/hero-slider";
import { BodyIcon } from "@/components/site/body-icon";
import { Stars } from "@/components/site/stars";
import { BUY_STEPS } from "@/components/site/buy-steps";
import { HScrollRow } from "@/components/site/hscroll-row";
import { HomeMoreStock } from "@/components/site/home-more-stock";
import { TrustpilotWidget } from "@/components/site/trustpilot";

export const revalidate = 60;

export const metadata: Metadata = {
  title: { absolute: "Japanese Used Cars for Sale & Export | Al Mashriq Trading" },
  description: "Buy quality Japanese used cars, spare parts and heavy machinery direct from Japan. Full photos, FOB prices and RoRo or container shipping worldwide.",
  alternates: { canonical: "/" },
};

const PRICE_BANDS: { label: string; min?: number; max?: number }[] = [
  { label: "Under $3,000", max: 3000 },
  { label: "$3,000 – $5,000", min: 3000, max: 5000 },
  { label: "$5,000 – $10,000", min: 5000, max: 10000 },
  { label: "$10,000 – $20,000", min: 10000, max: 20000 },
  { label: "Over $20,000", min: 20000 },
];

const SELECT = "h-12 w-full rounded-xl px-3 text-sm font-semibold";

export default async function PublicHome() {
  const [company, facets, latest, makes, reviews, posts] = await Promise.all([
    getCompany(),
    getFacets(),
    listCars({ sort: "new" }, 24),
    getMakeTiles(),
    getReviews(12),
    getPosts(3),
  ]);

  // A real photo for each body type (newest car of that type in stock; cached for 10 minutes).
  const bodies = facets.body.filter(([b]) => !/^others?$/i.test(b)).slice(0, 16);
  const bodyPhoto = await getBodyPhotos(bodies.map(([b]) => b));

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
      <section>
        <div className="mx-auto grid max-w-7xl gap-3 px-4 pb-2 pt-4 lg:grid-cols-[1fr_22rem] lg:gap-4 lg:px-6 lg:pt-6">
          {slides.length ? (
            <HeroSlider slides={slides} />
          ) : (
            <div className="glass flex min-h-[14rem] flex-col justify-end rounded-3xl p-6 text-white lg:min-h-[18rem]">
              <h1 className="text-3xl font-black">Japanese used cars, shipped to your port.</h1>
            </div>
          )}
          <form action="/cars" className="glass rounded-3xl p-4 sm:p-5" role="search">
            <h1 className="text-lg font-black leading-tight">
              Japanese used cars <span className="text-gradient">exported worldwide</span>
            </h1>
            <p className="mt-1 text-xs text-white/60">{facets.available.toLocaleString()} cars ready to ship — search our stock</p>
            <div className="mt-3.5 space-y-2.5">
              <div className="flex gap-2">
                <div className="relative min-w-0 flex-1">
                  <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/50" />
                  <input name="q" placeholder="Model, stock ID or chassis" className={`${SELECT} pl-10`} aria-label="Keyword" enterKeyHint="search" />
                </div>
                <button className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[var(--accent)] text-white shadow-lg shadow-brand-900/40 hover:bg-brand-700" aria-label="Search cars">
                  <Search className="h-5 w-5" />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <select name="make" defaultValue="" className={SELECT} aria-label="Make">
                  <option value="">All makes</option>
                  {facets.make.map(([m, n]) => (
                    <option key={m} value={m}>
                      {m} ({n})
                    </option>
                  ))}
                </select>
                <select name="body" defaultValue="" className={SELECT} aria-label="Body type">
                  <option value="">All bodies</option>
                  {facets.body.map(([b, n]) => (
                    <option key={b} value={b}>
                      {b} ({n})
                    </option>
                  ))}
                </select>
              </div>
              <details className="group">
                <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between rounded-xl px-1 text-sm font-semibold text-white/80 [&::-webkit-details-marker]:hidden">
                  More filters (year, price)
                  <ChevronDown className="h-4 w-4 transition group-open:rotate-180" />
                </summary>
                <div className="mt-1 grid grid-cols-2 gap-2">
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
              </details>
              <button className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[var(--accent)] text-sm font-bold text-white shadow-lg shadow-brand-900/40 hover:bg-brand-700">
                <Search className="h-4 w-4" /> Search {facets.available.toLocaleString()} cars
              </button>
            </div>
          </form>
        </div>

        {/* Trust badges: swipe row on phones */}
        <div className="mx-auto max-w-7xl px-4 py-3 lg:px-6">
          <div className="hscroll lg:grid lg:grid-cols-4 lg:overflow-visible">
            {[
              { icon: ShieldCheck, t: "Inspected stock", d: "Real photos & honest specs" },
              { icon: Ship, t: "RoRo & container", d: "To ports worldwide" },
              { icon: Banknote, t: "Secure TT payment", d: "Invoice in your name" },
              { icon: FileCheck2, t: "Export documents", d: "Sent by DHL / FedEx" },
            ].map(({ icon: I, t, d }) => (
              <div key={t} className="glass-lite flex w-60 items-center gap-3 rounded-2xl px-4 py-3 lg:w-auto">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--accent)] shadow-lg shadow-brand-900/40">
                  <I className="h-5 w-5 text-white" />
                </span>
                <div>
                  <div className="text-sm font-bold">{t}</div>
                  <div className="text-xs text-white/60">{d}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trustpilot review collector */}
      <section className="mx-auto max-w-7xl px-4 pt-8 lg:px-6">
        <div className="glass rounded-2xl px-4 py-3">
          <TrustpilotWidget />
        </div>
      </section>

      {/* Shop by make */}
      {makes.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 pt-8 lg:px-6">
          <SectionHead title="Shop by make" href="/cars" link="All stock" />
          <HScrollRow className="hscroll hscroll-grid">
            {makes.slice(0, 16).map((m) => (
              <Link key={m.slug} href={`/makes/${m.slug}`} className="glass-lite glass-hover group flex w-[6.5rem] shrink-0 flex-col items-center justify-center gap-1.5 rounded-2xl p-3 text-center">
                <span className="flex h-12 w-full items-center justify-center rounded-xl bg-white/95 px-2">
                  {m.logo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={m.logo} alt={`${m.label} logo`} loading="lazy" className="max-h-9 max-w-full object-contain" />
                  ) : (
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#17181c] text-base font-black text-white">{m.label.slice(0, 1)}</span>
                  )}
                </span>
                <span className="w-full truncate text-xs font-bold">{m.label}</span>
                <span className="text-[11px] text-white/50">{m.n} cars</span>
              </Link>
            ))}
          </HScrollRow>
        </section>
      )}

      {/* Body types — real photos from stock */}
      <section className="mx-auto max-w-7xl px-4 pt-8 lg:px-6">
        <SectionHead title="Search by body type" href="/cars" link="All stock" />
        <div className="hscroll hscroll-grid">
          {bodies.map(([b, n]) => {
            const path = bodyPhoto[b.toLowerCase()];
            const photo = path ? publicImageUrl(path) : null;
            return (
              <Link key={b} href={`/cars?body=${encodeURIComponent(b)}`} className="glass-lite glass-hover group w-40 shrink-0 overflow-hidden rounded-2xl">
                <div className="relative aspect-[4/3] bg-black/20">
                  {photo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={photo} alt={`${b} cars`} loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <BodyIcon type={b} className="h-9 w-[4.5rem] text-white/70" />
                    </div>
                  )}
                  <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-[#0a0a0c]/85 to-transparent" />
                  <span className="absolute bottom-1.5 left-2.5 right-2 truncate text-[13px] font-extrabold uppercase tracking-wide text-white drop-shadow">{b}</span>
                </div>
                <div className="px-2.5 py-2 text-[11px] text-white/60">{n.toLocaleString()} cars</div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Price bands */}
      <section className="mx-auto max-w-7xl px-4 pt-6 lg:px-6">
        <h2 className="mb-2.5 flex items-center gap-2 text-base font-black">
          <span className="h-5 w-1 rounded-full bg-gradient-to-b from-[var(--accent)] to-rose-300" />
          Search by price
        </h2>
        <div className="hscroll lg:flex-wrap lg:overflow-visible">
          {PRICE_BANDS.map((p) => (
            <Link
              key={p.label}
              href={`/cars?${new URLSearchParams({ ...(p.min ? { min_price: String(p.min) } : {}), ...(p.max ? { max_price: String(p.max) } : {}), sort: "price_asc" })}`}
              className="glass-lite glass-hover inline-flex min-h-11 items-center whitespace-nowrap rounded-full px-5 text-sm font-semibold"
            >
              {p.label}
            </Link>
          ))}
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
          <div className="glass-lite rounded-2xl p-10 text-center text-white/60">New stock is being added — check back soon.</div>
        )}
        <Link href="/cars" className="glass-lite mt-4 flex min-h-12 items-center justify-center gap-2 rounded-2xl text-sm font-bold sm:hidden">
          View all {facets.available.toLocaleString()} cars <ArrowRight className="h-4 w-4" />
        </Link>
      </section>

      {/* Spare parts, half cuts / complete units, heavy machinery */}
      <HomeMoreStock />

      {/* Reviews */}
      {reviews.count > 0 && (
        <section className="mx-auto max-w-7xl px-4 pt-12 lg:px-6">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="flex items-center gap-2 text-xl font-black sm:text-2xl">
                <span className="h-6 w-1 rounded-full bg-gradient-to-b from-[var(--accent)] to-rose-300" />
                What our customers say
              </h2>
              <div className="mt-2 flex items-center gap-2 text-sm text-white/70">
                <Stars value={reviews.avg} /> <b className="text-white">{reviews.avg.toFixed(1)}</b> from {reviews.count} reviews
              </div>
            </div>
            <Link href="/reviews" className="inline-flex min-h-11 items-center gap-1 text-sm font-bold text-[var(--accent-text)] hover:underline">
              All reviews <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="hscroll">
            {reviews.reviews.slice(0, 8).map((r) => (
              <figure key={r.id} className="glass-lite w-[17.5rem] rounded-2xl p-5 sm:w-80">
                <div className="flex items-center gap-3">
                  {r.photo_path ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={assetUrl(r.photo_path)!} alt="" className="h-11 w-11 rounded-full object-cover" loading="lazy" />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={dicebear(r.customer_name)} alt="" className="h-11 w-11 rounded-full" loading="lazy" />
                  )}
                  <div>
                    <figcaption className="text-sm font-bold">{r.customer_name}</figcaption>
                    <div className="flex items-center gap-1.5 text-xs text-white/60">
                      {flagFor(r.country) && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={flagFor(r.country)!} alt="" className="h-3 w-4 rounded-[2px] object-cover ring-1 ring-black/10" />
                      )}
                      {[r.country, r.vehicle].filter(Boolean).join(" · ")}
                    </div>
                  </div>
                </div>
                <Stars value={r.rating} size="mt-3 h-3.5 w-3.5" />
                <blockquote className="mt-2 line-clamp-5 text-sm leading-6 text-white/80">
                  <Quote className="mr-1 inline h-3.5 w-3.5 text-brand-600" />
                  {r.body}
                </blockquote>
              </figure>
            ))}
          </div>
        </section>
      )}

      {/* How to buy */}
      <section className="mx-auto max-w-7xl px-4 pt-12 lg:px-6">
        <SectionHead title="How to buy from Japan" href="/how-to-buy" link="Full guide" />
        <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {BUY_STEPS.map((s, i) => (
            <li key={s.title} className="glass-lite flex gap-4 rounded-2xl p-4 sm:p-5">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--accent)] text-lg font-black text-white shadow-lg shadow-brand-900/40">{i + 1}</span>
              <div>
                <h3 className="font-bold">{s.title}</h3>
                <p className="mt-1 text-sm leading-6 text-white/70">{s.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* Destinations */}
      <section className="mx-auto max-w-7xl px-4 pt-10 lg:px-6">
        <div className="glass-lite rounded-2xl p-5">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-black">
            <span className="h-5 w-1 rounded-full bg-gradient-to-b from-[var(--accent)] to-rose-300" />
            We export worldwide — including
          </h2>
          <ul className="grid grid-cols-2 gap-x-4 gap-y-1 sm:flex sm:flex-wrap sm:gap-x-6">
            {MARKETS.map((m) => (
              <li key={m.slug}>
                <Link href={`/export/${m.slug}`} className="flex min-h-11 items-center gap-2 text-sm font-semibold hover:underline">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`/flags/${m.code}.svg`} alt="" className="h-4 w-6 rounded-sm object-cover ring-1 ring-black/10" loading="lazy" />
                  {m.name}
                </Link>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 border-t border-white/10 pt-3 text-sm">
            <span className="font-bold">Popular models:</span>
            {POPULAR_MODELS.map((m) => (
              <Link key={m.slug} href={`/models/${m.slug}`} className="hover:underline">
                {m.make} {m.model}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Blog */}
      {posts.posts.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 pt-12 lg:px-6">
          <SectionHead title="From our blog" href="/blog" link="All articles" />
          <div className="hscroll md:grid md:grid-cols-3 md:overflow-visible">
            {posts.posts.map((p) => (
              <Link key={p.slug} href={`/blog/${p.slug}`} className="glass-lite glass-hover group w-72 overflow-hidden rounded-2xl md:w-auto">
                <div className="aspect-[16/9] bg-black/20">
                  {p.cover_path && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={assetUrl(p.cover_path)!} alt="" loading="lazy" className="h-full w-full object-cover" />
                  )}
                </div>
                <div className="p-4">
                  <time className="text-xs text-white/50" dateTime={p.published_at}>
                    {new Date(p.published_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                  </time>
                  <h3 className="mt-1 line-clamp-2 font-bold group-hover:text-[var(--accent-text)]">{p.title}</h3>
                  {p.excerpt && <p className="mt-1 line-clamp-2 text-sm text-white/65">{p.excerpt}</p>}
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="mx-auto max-w-7xl px-4 pt-12 lg:px-6">
        <div className="glass relative flex flex-col items-start justify-between gap-5 overflow-hidden rounded-3xl p-6 sm:p-8 md:flex-row md:items-center">
          <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-[var(--accent)]/25 blur-3xl" />
          <div className="relative flex gap-4">
            <Globe className="hidden h-12 w-12 shrink-0 text-brand-600 sm:block" />
            <div>
              <h2 className="text-xl font-black sm:text-2xl">Can&apos;t find the car you want?</h2>
              <p className="mt-1 text-white/75">Tell us the model, year and budget — we buy daily at Japanese auctions and ship to your port.</p>
            </div>
          </div>
          <Link href="/contact" className="relative inline-flex min-h-12 w-full shrink-0 items-center justify-center gap-2 rounded-xl bg-[var(--accent)] px-6 font-bold text-white shadow-lg shadow-brand-900/40 hover:bg-brand-700 md:w-auto">
            <Send className="h-4 w-4" /> Send an inquiry
          </Link>
        </div>
      </section>
    </>
  );
}

function SectionHead({ title, href, link }: { title: string; href: string; link: string }) {
  return (
    <div className="mb-3 flex items-end justify-between gap-3">
      <h2 className="flex items-center gap-2 text-xl font-black sm:text-2xl">
        <span className="h-6 w-1 rounded-full bg-gradient-to-b from-[var(--accent)] to-rose-300" />
        {title}
      </h2>
      <Link href={href} className="inline-flex min-h-11 shrink-0 items-center gap-1 text-sm font-bold text-[var(--accent-text)] hover:underline">
        {link} <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );
}
