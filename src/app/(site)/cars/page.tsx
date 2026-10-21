import type { Metadata } from "next";
import Link from "next/link";
import { SlidersHorizontal, X, Car } from "lucide-react";
import { carTitle, getCompany, getFacets, listCars, siteBase, whatsapp, PAGE_SIZE, type Filters } from "@/lib/public-site";
import { CarCard } from "../car-card";
import { SortSelect } from "../sort-select";

export const revalidate = 60;

export async function generateMetadata({ searchParams }: { searchParams: Promise<Filters & { brand?: string }> }): Promise<Metadata> {
  const sp = await searchParams;
  const make = sp.make || sp.brand;
  return { title: { absolute: `${make ? `${make} ` : ""}Used cars for sale from Japan — Al Mashriq` } };
}

const FIELD = "w-full rounded-xl border-0 bg-slate-50 px-3 py-2 text-sm text-slate-800 outline-none ring-1 ring-slate-200 focus:ring-2 focus:ring-brand-400";

export default async function PublicCars({ searchParams }: { searchParams: Promise<Filters & { brand?: string; body_type?: string; transmission?: string }> }) {
  const raw = await searchParams;
  // Old website filter names keep working (?brand=, ?body_type=, ?transmission=)
  const f: Filters = { ...raw, make: raw.make || raw.brand, body: raw.body || raw.body_type, trans: raw.trans || raw.transmission };
  const [company, facets, base, res] = await Promise.all([getCompany(), getFacets(), siteBase(), listCars(f)]);
  const pages = Math.max(1, Math.ceil(res.total / PAGE_SIZE));
  const active = (["q", "make", "body", "fuel", "trans", "steering", "min_price", "max_price", "min_year", "max_year"] as const).filter((k) => f[k]);

  const href = (over: Partial<Filters>) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries({ ...f, ...over })) if (v && !["brand", "body_type", "transmission"].includes(k)) p.set(k, String(v));
    return `${base}/cars${p.size ? `?${p}` : ""}`;
  };
  const sel = (name: keyof Filters, label: string, opts: [string, number][]) => (
    <div>
      <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-slate-500">{label}</label>
      <select name={name} defaultValue={f[name] ?? ""} className={FIELD}>
        <option value="">Any</option>
        {opts.map(([v, n]) => (
          <option key={v} value={v}>
            {v} ({n})
          </option>
        ))}
      </select>
    </div>
  );

  const nums: (number | "…")[] = [];
  for (let i = 1; i <= pages; i++) {
    if (i === 1 || i === pages || Math.abs(i - res.page) <= 2) nums.push(i);
    else if (nums[nums.length - 1] !== "…") nums.push("…");
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 lg:px-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black tracking-tight sm:text-3xl">{f.make ? `${f.make} for sale` : "Cars in stock"}</h1>
          <p className="text-sm text-slate-500">{res.total.toLocaleString()} cars found</p>
        </div>
        <SortSelect value={f.sort || "new"} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[17rem_1fr]">
        <aside>
          <form action={`${base}/cars`} className="space-y-3 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200/80 lg:sticky lg:top-24">
            <div className="flex items-center gap-2 text-sm font-extrabold">
              <SlidersHorizontal className="h-4 w-4 text-brand-600" /> Filters
            </div>
            <input name="q" defaultValue={f.q ?? ""} placeholder="Model, stock ID…" className={FIELD} />
            {sel("make", "Make", facets.make)}
            {sel("body", "Body type", facets.body)}
            {sel("fuel", "Fuel", facets.fuel)}
            {sel("trans", "Transmission", facets.transmission)}
            {sel("steering", "Steering", facets.steering)}
            <div>
              <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-slate-500">Price (USD)</label>
              <div className="flex gap-2">
                <input name="min_price" type="number" min={0} defaultValue={f.min_price ?? ""} placeholder="Min" className={FIELD} />
                <input name="max_price" type="number" min={0} defaultValue={f.max_price ?? ""} placeholder="Max" className={FIELD} />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-slate-500">Year</label>
              <div className="flex gap-2">
                <input name="min_year" type="number" min={1950} max={2100} defaultValue={f.min_year ?? ""} placeholder="From" className={FIELD} />
                <input name="max_year" type="number" min={1950} max={2100} defaultValue={f.max_year ?? ""} placeholder="To" className={FIELD} />
              </div>
            </div>
            {f.sort && <input type="hidden" name="sort" value={f.sort} />}
            <button className="w-full rounded-xl bg-gradient-to-r from-brand-600 to-rose-500 py-2.5 text-sm font-bold text-white shadow-md shadow-brand-600/25">Show cars</button>
            {active.length > 0 && (
              <Link href={`${base}/cars`} className="block text-center text-xs font-semibold text-slate-500 hover:text-brand-700">
                Clear all filters
              </Link>
            )}
          </form>
        </aside>

        <div>
          {active.length > 0 && (
            <div className="mb-4 flex flex-wrap gap-2">
              {active.map((k) => (
                <Link
                  key={k}
                  href={href({ [k]: undefined, page: undefined })}
                  className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-3 py-1 text-xs font-bold text-brand-700 ring-1 ring-rose-200 hover:bg-rose-100"
                >
                  {k.replace("_", " ")}: {f[k]}
                  <X className="h-3 w-3" />
                </Link>
              ))}
            </div>
          )}

          {res.cars.length === 0 ? (
            <div className="rounded-3xl bg-white p-14 text-center text-slate-500 ring-1 ring-slate-200">
              <Car className="mx-auto mb-2 h-8 w-8 text-slate-300" />
              No cars match these filters.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {res.cars.map((c) => (
                <CarCard key={c.id} c={c} base={base} wa={whatsapp(company, `Hello, I'm interested in ${c.stock_no} ${carTitle(c)}.`)} />
              ))}
            </div>
          )}

          {pages > 1 && (
            <nav className="mt-8 flex flex-wrap justify-center gap-1.5" aria-label="Pages">
              {nums.map((p, i) =>
                p === "…" ? (
                  <span key={`e${i}`} className="px-2 py-2 text-slate-400">
                    …
                  </span>
                ) : (
                  <Link
                    key={p}
                    href={href({ page: String(p) })}
                    className={`min-w-10 rounded-xl px-3 py-2 text-center text-sm font-bold ${
                      p === res.page ? "bg-gradient-to-r from-brand-600 to-rose-500 text-white shadow-md" : "bg-white text-slate-700 ring-1 ring-slate-200 hover:text-brand-700"
                    }`}
                  >
                    {p}
                  </Link>
                )
              )}
            </nav>
          )}
        </div>
      </div>
    </div>
  );
}
