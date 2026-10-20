import type { Metadata } from "next";
import Link from "next/link";
import { Search, ShieldCheck, Ship, Banknote, ArrowRight, Car } from "lucide-react";
import { getCompany, getFacets, listCars, siteBase, whatsapp, carTitle } from "@/lib/public-site";
import { CarCard } from "./car-card";

export const revalidate = 60;

export async function generateMetadata(): Promise<Metadata> {
  const company = await getCompany();
  return {
    title: { absolute: `${company.company_name} — Japanese used cars for export` },
    description: "Quality Japanese used cars and spare parts, exported worldwide by RoRo and container. Browse our stock and get a C&F quotation.",
  };
}

export default async function PublicHome() {
  const [company, facets, base, latest] = await Promise.all([getCompany(), getFacets(), siteBase(), listCars({ sort: "new" }, 12)]);
  const makes = facets.make.slice(0, 14);

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-brand-700 via-rose-600 to-orange-500 text-white">
        <div className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-fuchsia-500/40 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 left-1/4 h-80 w-80 rounded-full bg-amber-300/40 blur-3xl" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.15)_1px,transparent_0)] [background-size:24px_24px]" />
        <div className="relative mx-auto max-w-7xl px-4 py-14 lg:px-8 lg:py-20">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-bold uppercase tracking-widest ring-1 ring-white/30">
              <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-300" />
              {facets.available.toLocaleString()} cars in stock
            </span>
            <h1 className="mt-4 text-4xl font-black leading-tight tracking-tight sm:text-5xl">Japanese used cars, shipped to your port.</h1>
            <p className="mt-3 max-w-xl text-base text-white/85">
              Quality Japanese used cars with real photos and full specs. Ask for a C&F quotation to your destination port.
            </p>
          </div>

          <form action={`${base}/cars`} className="mt-8 grid max-w-4xl grid-cols-1 gap-2 rounded-3xl bg-white/95 p-3 shadow-2xl shadow-black/20 sm:grid-cols-[1fr_1fr_1.4fr_auto]">
            <select name="make" defaultValue="" className="rounded-2xl border-0 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 outline-none ring-1 ring-slate-200 focus:ring-2 focus:ring-brand-400">
              <option value="">All makes</option>
              {facets.make.map(([m, n]) => (
                <option key={m} value={m}>
                  {m} ({n})
                </option>
              ))}
            </select>
            <select name="body" defaultValue="" className="rounded-2xl border-0 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 outline-none ring-1 ring-slate-200 focus:ring-2 focus:ring-brand-400">
              <option value="">All body types</option>
              {facets.body.map(([b, n]) => (
                <option key={b} value={b}>
                  {b} ({n})
                </option>
              ))}
            </select>
            <input name="q" placeholder="Model, stock ID or chassis…" className="rounded-2xl border-0 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none ring-1 ring-slate-200 placeholder:text-slate-400 focus:ring-2 focus:ring-brand-400" />
            <button className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-brand-600 to-rose-500 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-brand-600/30">
              <Search className="h-4 w-4" />
              Search
            </button>
          </form>
        </div>
      </section>

      {/* Makes */}
      {makes.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 pt-10 lg:px-8">
          <h2 className="text-xl font-black tracking-tight">Shop by make</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {makes.map(([m, n]) => (
              <Link
                key={m}
                href={`${base}/cars?make=${encodeURIComponent(m)}`}
                className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-2.5 text-sm font-bold text-slate-800 shadow-sm ring-1 ring-slate-200 transition hover:-translate-y-0.5 hover:text-brand-700 hover:shadow-md"
              >
                {m}
                <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-bold text-brand-700">{n}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* New arrivals */}
      <section className="mx-auto max-w-7xl px-4 pt-10 lg:px-8">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="text-xl font-black tracking-tight">New arrivals</h2>
            <p className="text-sm text-slate-500">Freshly added to our stock</p>
          </div>
          <Link href={`${base}/cars`} className="inline-flex items-center gap-1.5 text-sm font-bold text-brand-700 hover:underline">
            View all {facets.total.toLocaleString()} <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        {latest.cars.length ? (
          <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {latest.cars.map((c) => (
              <CarCard key={c.id} c={c} base={base} wa={whatsapp(company, `Hello, I'm interested in ${c.stock_no} ${carTitle(c)}.`)} />
            ))}
          </div>
        ) : (
          <div className="mt-5 rounded-2xl bg-white p-12 text-center text-slate-500 ring-1 ring-slate-200">
            <Car className="mx-auto mb-2 h-8 w-8 text-slate-300" />
            New stock is being added — check back soon.
          </div>
        )}
      </section>

      {/* Why us */}
      <section className="mx-auto max-w-7xl px-4 pt-14 lg:px-8">
        <div className="grid gap-4 md:grid-cols-3">
          {[
            { icon: ShieldCheck, title: "Real photos, full specs", text: "Every listing shows the actual car with its mileage, engine, features and stock ID.", g: "from-violet-500 to-indigo-600" },
            { icon: Ship, title: "RoRo & container", text: "Shipping from Yokohama, Nagoya, Kobe and Kyushu to ports worldwide.", g: "from-sky-400 to-blue-600" },
            { icon: Banknote, title: "Simple TT payment", text: "Pay by bank transfer (TT). Shipping documents are released once payment is confirmed.", g: "from-emerald-400 to-teal-600" },
          ].map(({ icon: Icon, title, text, g }) => (
            <div key={title} className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200/80">
              <span className={`inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br text-white shadow-lg ${g}`}>
                <Icon className="h-5 w-5" />
              </span>
              <h3 className="mt-4 font-extrabold">{title}</h3>
              <p className="mt-1 text-sm text-slate-500">{text}</p>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
