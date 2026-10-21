import Link from "next/link";
import { X, Car } from "lucide-react";
import { carTitle, getBranches, getCompany, getFacets, listCars, whatsapp, PAGE_SIZE, type Filters } from "@/lib/public-site";
import { branchName } from "@/lib/branches";
import { CarCard } from "./car-card";
import { SortSelect } from "./sort-select";
import { FilterPanel, FilterSubmit, FilterToolbar } from "@/components/site/filter-sheet";

const FIELD = "h-12 w-full rounded-xl px-3 text-sm font-semibold";
const FLABEL = "mb-1 block text-[11px] font-bold uppercase tracking-wider text-white/60";
const LABEL: Record<string, string> = { q: "Search", make: "Make", body: "Body", fuel: "Fuel", trans: "Transmission", steering: "Steering", min_price: "Min price", max_price: "Max price", min_year: "From year", max_year: "To year", branch: "Ships from" };

/** Filter sidebar (bottom sheet on phones) + results grid + pagination, shared by /cars and /makes/[make]. */
export async function CarListing({ f, path, heading, intro, lockMake = false }: { f: Filters; path: string; heading: string; intro?: React.ReactNode; lockMake?: boolean }) {
  const [company, facets, res, branches] = await Promise.all([getCompany(), getFacets(), listCars(f), getBranches()]);
  const pages = Math.max(1, Math.ceil(res.total / PAGE_SIZE));
  const active = (["q", "make", "body", "fuel", "trans", "steering", "min_price", "max_price", "min_year", "max_year", "branch"] as const).filter((k) => f[k] && !(lockMake && k === "make"));
  // Only offer a "Ships from" filter once stock comes from more than one country.
  const stocked = branches.filter((b) => b.n_cars > 0 || b.code === f.branch?.toUpperCase());

  const href = (over: Partial<Filters>) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries({ ...f, ...over })) if (v && !(lockMake && k === "make")) p.set(k, String(v));
    return `${path}${p.size ? `?${p}` : ""}`;
  };
  const sel = (name: keyof Filters, label: string, opts: [string, number][]) => (
    <div>
      <label className={FLABEL}>{label}</label>
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
    <div className="mx-auto max-w-7xl px-4 py-5 lg:px-6 lg:py-6">
      <nav className="mb-3 text-xs text-white/60" aria-label="Breadcrumb">
        <Link href="/" className="hover:text-white">Home</Link> / <Link href="/cars" className="hover:text-white">Stock list</Link>
        {lockMake && f.make ? ` / ${f.make}` : ""}
      </nav>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black tracking-tight sm:text-3xl">{heading}</h1>
          <p className="text-sm text-white/60">{res.total.toLocaleString()} cars found</p>
          {intro}
        </div>
        <div className="hidden lg:block">
          <SortSelect value={f.sort || "new"} />
        </div>
      </div>

      <FilterToolbar count={active.length}>
        <SortSelect value={f.sort || "new"} />
      </FilterToolbar>

      <div className="grid gap-5 lg:grid-cols-[16rem_1fr]">
        <aside>
          <FilterPanel>
            <form action={path} className="space-y-3">
              <input name="q" defaultValue={f.q ?? ""} placeholder="Model, stock ID…" className={FIELD} aria-label="Keyword" enterKeyHint="search" />
              {stocked.length > 1 && (
                <div>
                  <label className={FLABEL}>Ships from</label>
                  <select name="branch" defaultValue={f.branch?.toUpperCase() ?? ""} className={FIELD}>
                    <option value="">Any country</option>
                    {stocked.map((b) => (
                      <option key={b.code} value={b.code}>
                        {b.name} ({b.n_cars})
                      </option>
                    ))}
                  </select>
                </div>
              )}
              {!lockMake && sel("make", "Make", facets.make)}
              {sel("body", "Body type", facets.body)}
              {sel("fuel", "Fuel", facets.fuel)}
              {sel("trans", "Transmission", facets.transmission)}
              {sel("steering", "Steering", facets.steering)}
              <div>
                <label className={FLABEL}>Price (USD)</label>
                <div className="flex gap-2">
                  <input name="min_price" type="number" inputMode="numeric" min={0} defaultValue={f.min_price ?? ""} placeholder="Min" className={FIELD} aria-label="Min price" />
                  <input name="max_price" type="number" inputMode="numeric" min={0} defaultValue={f.max_price ?? ""} placeholder="Max" className={FIELD} aria-label="Max price" />
                </div>
              </div>
              <div>
                <label className={FLABEL}>Year</label>
                <div className="flex gap-2">
                  <input name="min_year" type="number" inputMode="numeric" min={1950} max={2100} defaultValue={f.min_year ?? ""} placeholder="From" className={FIELD} aria-label="From year" />
                  <input name="max_year" type="number" inputMode="numeric" min={1950} max={2100} defaultValue={f.max_year ?? ""} placeholder="To" className={FIELD} aria-label="To year" />
                </div>
              </div>
              {f.sort && <input type="hidden" name="sort" value={f.sort} />}
              <FilterSubmit />
              {active.length > 0 && (
                <Link href={path} className="flex min-h-11 items-center justify-center text-sm font-semibold text-white/70 hover:text-white">
                  Clear all filters
                </Link>
              )}
            </form>
          </FilterPanel>
        </aside>

        <div id="results">
          {active.length > 0 && (
            <div className="hscroll mb-4 lg:flex-wrap lg:overflow-visible">
              {active.map((k) => (
                <Link key={k} href={href({ [k]: undefined, page: undefined })} className="glass-lite inline-flex min-h-10 items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 text-xs font-bold hover:bg-white/15">
                  {LABEL[k]}: {k === "branch" ? branchName(f[k]!.toUpperCase()) : f[k]}
                  <X className="h-3.5 w-3.5" />
                </Link>
              ))}
            </div>
          )}

          {res.cars.length === 0 ? (
            <div className="glass-lite rounded-2xl p-10 text-center text-white/70">
              <Car className="mx-auto mb-2 h-8 w-8 text-white/30" />
              No cars match these filters. <Link href="/contact" className="font-semibold text-[var(--accent-text)]">Tell us what you need</Link> and we&apos;ll source it from auction.
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
                  <span key={`e${i}`} className="flex min-h-11 items-center px-2 text-white/40">…</span>
                ) : (
                  <Link
                    key={p}
                    href={href({ page: String(p) })}
                    aria-current={p === res.page ? "page" : undefined}
                    className={`flex min-h-11 min-w-11 items-center justify-center rounded-xl px-3 text-center text-sm font-bold ${p === res.page ? "bg-[var(--accent)] text-white shadow-lg shadow-red-900/40" : "glass-lite hover:bg-white/15"}`}
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
