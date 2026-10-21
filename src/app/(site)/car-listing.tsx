import Link from "next/link";
import { SlidersHorizontal, X, Car } from "lucide-react";
import { carTitle, getCompany, getFacets, listCars, whatsapp, PAGE_SIZE, type Filters } from "@/lib/public-site";
import { CarCard } from "./car-card";
import { SortSelect } from "./sort-select";

const FIELD = "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-navy-500 focus:ring-2 focus:ring-navy-500/15";
const LABEL: Record<string, string> = { q: "Search", make: "Make", body: "Body", fuel: "Fuel", trans: "Transmission", steering: "Steering", min_price: "Min price", max_price: "Max price", min_year: "From year", max_year: "To year" };

/** Filter sidebar + results grid + pagination, shared by /cars and /makes/[make]. */
export async function CarListing({ f, path, heading, intro, lockMake = false }: { f: Filters; path: string; heading: string; intro?: React.ReactNode; lockMake?: boolean }) {
  const [company, facets, res] = await Promise.all([getCompany(), getFacets(), listCars(f)]);
  const pages = Math.max(1, Math.ceil(res.total / PAGE_SIZE));
  const active = (["q", "make", "body", "fuel", "trans", "steering", "min_price", "max_price", "min_year", "max_year"] as const).filter((k) => f[k] && !(lockMake && k === "make"));

  const href = (over: Partial<Filters>) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries({ ...f, ...over })) if (v && !(lockMake && k === "make")) p.set(k, String(v));
    return `${path}${p.size ? `?${p}` : ""}`;
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
    <div className="mx-auto max-w-7xl px-4 py-6 lg:px-6">
      <nav className="mb-3 text-xs text-slate-500" aria-label="Breadcrumb">
        <Link href="/" className="hover:text-brand-700">Home</Link> / <Link href="/cars" className="hover:text-brand-700">Stock list</Link>
        {lockMake && f.make ? ` / ${f.make}` : ""}
      </nav>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-navy-950 sm:text-3xl">{heading}</h1>
          <p className="text-sm text-slate-500">{res.total.toLocaleString()} cars found</p>
          {intro}
        </div>
        <SortSelect value={f.sort || "new"} />
      </div>

      <div className="grid gap-5 lg:grid-cols-[16rem_1fr]">
        <aside>
          <form action={path} className="space-y-3 rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200 lg:sticky lg:top-16">
            <div className="-mx-4 -mt-4 mb-1 flex items-center gap-2 rounded-t-xl bg-navy-800 px-4 py-2.5 text-sm font-extrabold text-white">
              <SlidersHorizontal className="h-4 w-4" /> Search filters
            </div>
            <input name="q" defaultValue={f.q ?? ""} placeholder="Model, stock ID…" className={FIELD} aria-label="Keyword" />
            {!lockMake && sel("make", "Make", facets.make)}
            {sel("body", "Body type", facets.body)}
            {sel("fuel", "Fuel", facets.fuel)}
            {sel("trans", "Transmission", facets.transmission)}
            {sel("steering", "Steering", facets.steering)}
            <div>
              <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-slate-500">Price (USD)</label>
              <div className="flex gap-2">
                <input name="min_price" type="number" min={0} defaultValue={f.min_price ?? ""} placeholder="Min" className={FIELD} aria-label="Min price" />
                <input name="max_price" type="number" min={0} defaultValue={f.max_price ?? ""} placeholder="Max" className={FIELD} aria-label="Max price" />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-slate-500">Year</label>
              <div className="flex gap-2">
                <input name="min_year" type="number" min={1950} max={2100} defaultValue={f.min_year ?? ""} placeholder="From" className={FIELD} aria-label="From year" />
                <input name="max_year" type="number" min={1950} max={2100} defaultValue={f.max_year ?? ""} placeholder="To" className={FIELD} aria-label="To year" />
              </div>
            </div>
            {f.sort && <input type="hidden" name="sort" value={f.sort} />}
            <button className="w-full rounded-lg bg-brand-600 py-2.5 text-sm font-bold text-white hover:bg-brand-700">Search</button>
            {active.length > 0 && (
              <Link href={path} className="block text-center text-xs font-semibold text-slate-500 hover:text-brand-700">
                Clear all filters
              </Link>
            )}
          </form>
        </aside>

        <div>
          {active.length > 0 && (
            <div className="mb-4 flex flex-wrap gap-2">
              {active.map((k) => (
                <Link key={k} href={href({ [k]: undefined, page: undefined })} className="inline-flex items-center gap-1 rounded-full bg-navy-50 px-3 py-1 text-xs font-bold text-navy-800 ring-1 ring-navy-200 hover:bg-navy-100">
                  {LABEL[k]}: {f[k]}
                  <X className="h-3 w-3" />
                </Link>
              ))}
            </div>
          )}

          {res.cars.length === 0 ? (
            <div className="rounded-xl bg-white p-14 text-center text-slate-500 ring-1 ring-slate-200">
              <Car className="mx-auto mb-2 h-8 w-8 text-slate-300" />
              No cars match these filters. <Link href="/contact" className="font-semibold text-brand-700">Tell us what you need</Link> and we&apos;ll source it from auction.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {res.cars.map((c) => (
                <CarCard key={c.id} c={c} wa={whatsapp(company, `Hello, I'm interested in ${c.stock_no} ${carTitle(c)}.`)} />
              ))}
            </div>
          )}

          {pages > 1 && (
            <nav className="mt-8 flex flex-wrap justify-center gap-1.5" aria-label="Pages">
              {nums.map((p, i) =>
                p === "…" ? (
                  <span key={`e${i}`} className="px-2 py-2 text-slate-400">…</span>
                ) : (
                  <Link
                    key={p}
                    href={href({ page: String(p) })}
                    aria-current={p === res.page ? "page" : undefined}
                    className={`min-w-10 rounded-lg px-3 py-2 text-center text-sm font-bold ${p === res.page ? "bg-navy-800 text-white" : "bg-white text-slate-700 ring-1 ring-slate-200 hover:text-brand-700"}`}
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
