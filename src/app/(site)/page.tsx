import type { Metadata } from "next";
import { SearchForm } from "@/components/site/search-form";
import { flagFor } from "@/lib/brand-assets";
import { MARKETS } from "@/lib/markets";
import { POPULAR_MODELS } from "@/lib/models";
import { dicebear } from "@/lib/avatar";
import Link from "next/link";
import { Search, ShieldCheck, Ship, Banknote, ArrowRight, Send, Quote, FileCheck2, Globe, ChevronDown, UserRound, Fuel, Leaf, Zap, Cog } from "lucide-react";
import { publicImageUrl, titleCase, plural } from "@/lib/format";
import { getCompany, getFacets, getBodyPhotos, listCars, whatsapp, carTitle, priceLabel, getMakeTiles, getReviews, getPosts, getOffers, assetUrl } from "@/lib/public-site";
import { CarCard } from "./car-card";
import { HeroSlider } from "@/components/site/hero-slider";
import { BodyIcon } from "@/components/site/body-icon";
import { Stars } from "@/components/site/stars";
import { BUY_STEPS } from "@/components/site/buy-steps";
import { HScrollRow } from "@/components/site/hscroll-row";
import { HomeMoreStock } from "@/components/site/home-more-stock";
import { TrustpilotWidget } from "@/components/site/trustpilot";
import { OfferCard } from "@/components/site/offer-card";

export const revalidate = 3600;

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
  const [company, facets, latest, makes, reviews, posts, offers] = await Promise.all([
    getCompany(),
    getFacets(),
    listCars({ sort: "new" }, 24),
    getMakeTiles(),
    getReviews(12),
    getPosts(3),
    getOffers(6),
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
      // Same rule as the car cards: only cars listed in the last 7 days
      tag: Date.now() - new Date(c.created_at).getTime() < 7 * 864e5 ? "New arrival" : undefined,
    }));
  const years = Array.from({ length: 30 }, (_, i) => new Date().getFullYear() - i);

  return (
    <>
      {/* Hero: navy band. Promise + live counts + full search on the left, real stock photos on the right */}
      <section className="on-dark home-hero">
        <div className="mx-auto grid max-w-7xl gap-6 px-4 pb-6 pt-6 lg:grid-cols-[minmax(0,26rem)_1fr] lg:gap-10 lg:px-6 lg:pb-8 lg:pt-10">
          <SearchForm action="/cars" className="flex flex-col" role="search">
            <h1 className="text-[1.9rem] font-extrabold leading-[1.08] sm:text-[2.6rem]">
              Japanese vehicles, exported <span className="text-[var(--red-text)]">to your port</span>
            </h1>
            <p className="mt-3 max-w-[34ch] text-[15px] leading-6 text-white/75">
              Our own stock in Japan with real photos and FOB prices, shipped by RoRo or container with the export papers done for you.
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-sm text-white/75">
              <span>
                <b className="text-lg font-extrabold tabular-nums text-white">{facets.available.toLocaleString()}</b> cars available now
              </span>
              {reviews.count > 0 && (
                <Link href="/reviews" className="inline-flex min-h-11 items-center gap-1.5 hover:underline">
                  <Stars value={reviews.avg} size="h-3.5 w-3.5" />
                  <b className="font-extrabold text-white">{reviews.avg.toFixed(1)}</b> from {reviews.count} reviews
                </Link>
              )}
            </div>
            <div className="mt-4 space-y-2.5 rounded-2xl border border-white/15 bg-white/[0.06] p-3 sm:p-4">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/60" />
                <input name="q" placeholder="Make, model or stock ID" className={`${SELECT} pl-10`} aria-label="Keyword" enterKeyHint="search" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <select name="make" defaultValue="" className={SELECT} aria-label="Make">
                  <option value="">All makes</option>
                  {facets.make.map(([m, n]) => (
                    <option key={m} value={m}>
                      {titleCase(m)} ({n})
                    </option>
                  ))}
                </select>
                <select name="body" defaultValue="" className={SELECT} aria-label="Body type">
                  <option value="">All bodies</option>
                  {facets.body.map(([b, n]) => (
                    <option key={b} value={b}>
                      {titleCase(b)} ({n})
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
              <button className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[var(--red)] text-sm font-extrabold text-white hover:bg-[#9e1b16]">
                <Search className="h-4 w-4" /> Search {facets.available.toLocaleString()} cars
              </button>
            </div>
          </SearchForm>
          {slides.length ? (
            <HeroSlider slides={slides} />
          ) : (
            <div className="flex min-h-[14rem] flex-col justify-end rounded-3xl border border-white/15 p-6 lg:min-h-[24rem]">
              <p className="text-2xl font-extrabold">New stock is being added from Japanese auctions.</p>
            </div>
          )}
        </div>

        {/* What we handle: one ruled strip, not four cards */}
        <ul className="mx-auto grid max-w-7xl grid-cols-2 border-t border-white/15 px-4 lg:grid-cols-4 lg:px-6">
          {[
            { icon: ShieldCheck, t: "Real photos, honest specs", d: "Every car is our own stock" },
            { icon: Ship, t: "RoRo & container", d: "To ports worldwide" },
            { icon: Banknote, t: "Bank transfer (TT)", d: "Invoice in your name" },
            { icon: FileCheck2, t: "Export documents", d: "Sent by DHL / FedEx" },
          ].map(({ icon: I, t, d }) => (
            <li key={t} className="flex items-center gap-3 py-3.5 pr-3 sm:py-4">
              <I className="h-5 w-5 shrink-0 text-[var(--red-text)]" />
              <div className="min-w-0">
                <div className="text-[13px] font-bold leading-tight sm:text-sm">{t}</div>
                <div className="text-xs text-white/65">{d}</div>
              </div>
            </li>
          ))}
        </ul>
      </section>
      {/* Offers */}
      {offers.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 pt-8 lg:px-6">
          <SectionHead title="Current offers" href="/offers" link="All offers" />
          <div className="hscroll md:grid md:grid-cols-3 md:overflow-visible">
            {offers.slice(0, 3).map((o) => (
              <Link key={o.id} href="/offers" className="glass-hover block w-72 rounded-2xl md:w-auto">
                <OfferCard offer={o} compact />
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Customer account, phones only (desktop has "My account" in the menu bar) */}
      <section className="mx-auto max-w-7xl px-4 pt-6 lg:hidden">
        <div className="glass flex items-center gap-3 rounded-2xl p-4">
          <UserRound className="h-9 w-9 shrink-0 rounded-full bg-brand-50 p-2 text-brand-700" />
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-black">Your customer account</h2>
            <p className="text-xs text-white/70">Track your car, invoices and shipping.</p>
          </div>
        </div>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <Link href="/account/signup" className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[var(--accent)] text-sm font-bold text-white hover:bg-brand-700">
            Create account
          </Link>
          <Link href="/account/login" className="glass-lite inline-flex min-h-11 items-center justify-center rounded-xl text-sm font-bold">
            Sign in
          </Link>
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
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#2b2621] text-base font-black text-white">{m.label.slice(0, 1)}</span>
                  )}
                </span>
                <span className="w-full truncate text-xs font-bold">{titleCase(m.label)}</span>
                <span className="text-[11px] text-white/50">{plural(m.n, "car")}</span>
              </Link>
            ))}
          </HScrollRow>
        </section>
      )}

      {/* Body types — real photos from stock */}
      <section className="mx-auto max-w-7xl px-4 pt-8 lg:px-6">
        <SectionHead title="Shop by shape" href="/cars" link="All stock" />
        <div className="hscroll hscroll-grid">
          {bodies.map(([b, n]) => {
            const path = bodyPhoto[b.toLowerCase()];
            const photo = path ? publicImageUrl(path) : null;
            return (
              <Link key={b} href={`/cars?body=${encodeURIComponent(b)}`} className="glass-lite glass-hover group w-40 shrink-0 overflow-hidden rounded-2xl">
                <div className="relative aspect-[4/3] bg-black/20">
                  {photo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={photo} alt={`${titleCase(b)} cars`} loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <BodyIcon type={b} className="h-9 w-[4.5rem] text-white/70" />
                    </div>
                  )}
                  <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-[#1a1714]/85 to-transparent" />
                  <span className="absolute bottom-1.5 left-2.5 right-2 truncate text-[13px] font-extrabold text-white drop-shadow">{titleCase(b)}</span>
                </div>
                <div className="px-2.5 py-2 text-[11px] text-white/60">{plural(n, "car")}</div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Fuel and transmission: chip rows with live counts */}
      {[
        { title: "Shop by fuel", key: "fuel", items: facets.fuel },
        { title: "Shop by transmission", key: "trans", items: facets.transmission },
      ].map((g) =>
        g.items.length > 0 ? (
          <section key={g.key} className="mx-auto max-w-7xl px-4 pt-6 lg:px-6">
            <h2 className="mb-2.5 flex items-center gap-2 text-base font-black">
              <span className="h-5 w-1 rounded-full bg-gradient-to-b from-[var(--accent)] to-rose-300" />
              {g.title}
            </h2>
            <div className="hscroll lg:flex-wrap lg:overflow-visible">
              {g.items
                .filter(([v]) => !/^others?$/i.test(v))
                // same label twice (e.g. GASOLINE and PETROL): keep the bigger one, the list is sorted by count
                .filter(([v], i, all) => all.findIndex(([w]) => chipLabel(w) === chipLabel(v)) === i)
                .slice(0, 8)
                .map(([v, n]) => {
                const Icon = g.key === "trans" ? Cog : /hybrid/i.test(v) ? Leaf : /electric|ev/i.test(v) ? Zap : Fuel;
                return (
                  <Link key={v} href={`/cars?${g.key}=${encodeURIComponent(v)}`} className="glass-lite glass-hover inline-flex min-h-11 items-center gap-2 whitespace-nowrap rounded-full px-4 text-sm font-semibold">
                    <Icon className="h-4 w-4 text-brand-700" />
                    {chipLabel(v)}
                    <span className="text-xs font-normal text-white/60">{n.toLocaleString()}</span>
                  </Link>
                );
              })}
            </div>
          </section>
        ) : null,
      )}

      {/* Price bands */}
      <section className="mx-auto max-w-7xl px-4 pt-6 lg:px-6">
        <h2 className="mb-2.5 flex items-center gap-2 text-base font-black">
          <span className="h-5 w-1 rounded-full bg-gradient-to-b from-[var(--accent)] to-rose-300" />
          Shop by price
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
          <div className="grid grid-cols-1 gap-4 max-sm:[&>*:nth-child(n+5)]:hidden sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {arrivals.map((c) => (
              <CarCard key={c.id} c={c} wa={whatsapp(company, `Hello, I'm interested in ${c.stock_no} ${carTitle(c)}.`, c.stock_no)} />
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

      {/* Trustpilot review collector — after the reviews, not before the stock */}
      <section className={`mx-auto max-w-7xl px-4 lg:px-6 ${reviews.count > 0 ? "pt-4" : "pt-12"}`}>
        <div className="glass rounded-2xl px-4 py-3">
          <TrustpilotWidget />
        </div>
      </section>

      {/* How to buy */}
      <section className="mx-auto max-w-7xl px-4 pt-12 lg:px-6">
        <SectionHead title="How to buy from Japan" href="/how-to-buy" link="Full guide" />
        {/* One route from Japan to your port: a red line joins the steps (down the side on phones, across on desktop) */}
        <ol className="journey relative grid gap-5 lg:grid-cols-6 lg:gap-4">
          {BUY_STEPS.map((s, i) => (
            <li key={s.title} className="relative flex gap-4 lg:flex-col lg:gap-3">
              <span className="on-dark relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-[var(--red)] bg-[#141210] text-base font-extrabold tabular-nums text-white">{i + 1}</span>
              <div className="min-w-0 pt-1.5 lg:pt-0">
                <h3 className="font-bold">{s.title}</h3>
                <p className="mt-1 text-sm leading-6 text-white/70">{s.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* Destinations (the footer lists the same countries on phones) */}
      <section className="mx-auto hidden max-w-7xl px-4 pt-10 sm:block lg:px-6">
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
        <div className="on-dark home-hero relative flex flex-col items-start justify-between gap-5 overflow-hidden rounded-3xl p-6 sm:p-8 md:flex-row md:items-center">
          <div className="relative flex gap-4">
            <Globe className="hidden h-12 w-12 shrink-0 text-[var(--red-text)] sm:block" />
            <div>
              <h2 className="text-xl font-extrabold sm:text-2xl">Can&apos;t find the car you want?</h2>
              <p className="mt-1 max-w-[52ch] text-white/75">Tell us the model, year, budget and your port. We buy daily at Japanese auctions and can source it for you.</p>
            </div>
          </div>
          <Link href="/contact" className="relative inline-flex min-h-12 w-full shrink-0 items-center justify-center gap-2 rounded-xl bg-[var(--red)] px-6 font-extrabold text-white hover:bg-[#9e1b16] md:w-auto">
            <Send className="h-4 w-4" /> Request a vehicle
          </Link>
        </div>
      </section>
    </>
  );
}

// Friendly names for the stock data's fuel / transmission codes on the home page chips
const CHIP_LABEL: Record<string, string> = { GASOLINE: "Petrol", PETROL: "Petrol", AT: "Automatic", MT: "Manual", CVT: "CVT", EV: "Electric", ELECTRICITY: "Electric" };
const chipLabel = (v: string) => CHIP_LABEL[v.toUpperCase()] ?? v.charAt(0).toUpperCase() + v.slice(1).toLowerCase();

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
