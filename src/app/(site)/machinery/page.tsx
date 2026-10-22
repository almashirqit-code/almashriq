import type { Metadata } from "next";
import Link from "next/link";
import { Camera, Clock, Gauge, MessageCircle, Tractor, Weight, X } from "lucide-react";
import { publicImageUrl } from "@/lib/format";
import { getBranches, getCompany, getMachineryFacets, listMachinery, priceLabel, whatsapp, type MachineFilters } from "@/lib/public-site";
import { branchName } from "@/lib/branches";
import { machineTitle } from "@/lib/machinery";
import { CardPhotos } from "@/components/site/card-photos";
import { ShipsFrom } from "@/components/site/ships-from";
import { FilterPanel, FilterSubmit, FilterToolbar } from "@/components/site/filter-sheet";
import { SortSelect } from "../sort-select";

export const revalidate = 300;
const SIZE = 24;
const FIELD = "h-12 w-full rounded-xl px-3 text-sm font-semibold";
const FLABEL = "mb-1 block text-[11px] font-bold uppercase tracking-wider text-white/60";
const LABEL: Record<string, string> = { q: "Search", category: "Type", make: "Make", branch: "Ships from", min_price: "Min price", max_price: "Max price", min_year: "From year", max_year: "To year" };

export const metadata: Metadata = {
  title: "Used heavy machinery from Japan for export",
  description: "Used excavators, wheel loaders, bulldozers, cranes and forklifts from Japan, Singapore, Taiwan and Thailand. Worldwide export by Al Mashriq Trading.",
  alternates: { canonical: "/machinery" },
};

export default async function MachineryPage({ searchParams }: { searchParams: Promise<MachineFilters> }) {
  const f = await searchParams;
  const [{ machines, total, page }, facets, company, branches] = await Promise.all([listMachinery(f, SIZE), getMachineryFacets(), getCompany(), getBranches()]);
  const pages = Math.max(1, Math.ceil(total / SIZE));
  const href = (over: Partial<MachineFilters>) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries({ ...f, ...over })) if (v) p.set(k, String(v));
    return `/machinery${p.size ? `?${p}` : ""}`;
  };
  const active = (["q", "category", "make", "branch", "min_price", "max_price", "min_year", "max_year"] as const).filter((k) => f[k]);
  const stocked = branches.filter((b) => (b.n_machines ?? 0) > 0 || b.code === f.branch?.toUpperCase());
  const chip = (on: boolean) => `inline-flex min-h-10 items-center whitespace-nowrap rounded-full px-4 text-sm font-bold ${on ? "bg-[var(--accent)] text-white shadow-lg shadow-brand-900/30" : "glass-lite hover:bg-white/15"}`;

  return (
    <div className="mx-auto max-w-7xl px-4 py-5 lg:px-6 lg:py-6">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2.5 text-2xl font-black sm:text-3xl">
            <span className="h-7 w-1 rounded-full bg-gradient-to-b from-[var(--accent)] to-rose-300" />
            Heavy machinery
          </h1>
          <p className="mt-1.5 text-sm text-white/65">{total.toLocaleString()} machines found — inspected, photographed and shipped worldwide.</p>
        </div>
        <div className="hidden lg:block">
          <SortSelect value={f.sort || "new"} />
        </div>
      </div>

      {facets.category.length > 0 && (
        <div className="hscroll mb-4 lg:flex-wrap lg:overflow-visible">
          <Link href={href({ category: undefined, page: undefined })} className={chip(!f.category)}>
            All <span className="ml-1.5 opacity-70">{facets.total}</span>
          </Link>
          {facets.category.map(([c, n]) => (
            <Link key={c} href={href({ category: c, page: undefined })} className={chip(f.category?.toLowerCase() === c.toLowerCase())}>
              {c} <span className="ml-1.5 opacity-70">{n}</span>
            </Link>
          ))}
        </div>
      )}

      <FilterToolbar count={active.length}>
        <SortSelect value={f.sort || "new"} />
      </FilterToolbar>

      <div className="grid gap-5 lg:grid-cols-[16rem_1fr]">
        <aside>
          <FilterPanel>
            <form action="/machinery" className="space-y-3" role="search">
              <input name="q" defaultValue={f.q ?? ""} placeholder="Model, stock ID, type…" className={FIELD} aria-label="Keyword" enterKeyHint="search" />
              {stocked.length > 1 && (
                <div>
                  <label className={FLABEL}>Ships from</label>
                  <select name="branch" defaultValue={f.branch?.toUpperCase() ?? ""} className={FIELD}>
                    <option value="">Any country</option>
                    {stocked.map((b) => (
                      <option key={b.code} value={b.code}>
                        {b.name} ({b.n_machines})
                      </option>
                    ))}
                  </select>
                </div>
              )}
              {[
                ["category", "Type", facets.category],
                ["make", "Make", facets.make],
              ].map(([name, label, opts]) => (
                <div key={name as string}>
                  <label className={FLABEL}>{label as string}</label>
                  <select name={name as string} defaultValue={f[name as "category" | "make"] ?? ""} className={FIELD}>
                    <option value="">Any</option>
                    {(opts as [string, number][]).map(([v, c]) => (
                      <option key={v} value={v}>
                        {v} ({c})
                      </option>
                    ))}
                  </select>
                </div>
              ))}
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
              <FilterSubmit label="Show machines" />
              {active.length > 0 && (
                <Link href="/machinery" className="flex min-h-11 items-center justify-center text-sm font-semibold text-white/70 hover:text-white">
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

          {!machines.length ? (
            <div className="glass-lite rounded-2xl p-12 text-center text-white/65">
              <Tractor className="mx-auto mb-3 h-8 w-8 text-white/30" />
              {active.length ? "No machines match your search — send us an inquiry and we'll find one for you." : "Our machinery stock is coming soon — send us an inquiry for any machine."}
              <div className="mt-4">
                <Link href="/contact" className="inline-flex min-h-11 items-center rounded-xl bg-[var(--accent)] px-5 text-sm font-bold text-white hover:bg-brand-700">
                  Send an inquiry
                </Link>
              </div>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {machines.map((m) => {
                const price = priceLabel(m);
                const sold = m.status === "sold" || m.status === "shipped";
                const reserved = m.status === "reserved";
                const detail = `/machinery/${encodeURIComponent(m.stock_no)}`;
                const imgs = (m.images?.length ? m.images : m.cover ? [m.cover] : []).map(publicImageUrl);
                const wa = whatsapp(company, `Hello Al Mashriq, please send me a C&F quotation for ${m.stock_no} ${machineTitle(m)}. My destination port is: `);
                return (
                  <article key={m.id} className={`glass-lite glass-hover group flex flex-col overflow-hidden rounded-2xl ${sold ? "opacity-80" : ""}`}>
                    <Link href={detail} className="relative block aspect-[4/3] overflow-hidden bg-black/20" aria-label={`${machineTitle(m)} — ${m.stock_no}`}>
                      {imgs.length ? (
                        <CardPhotos images={imgs} alt={`${machineTitle(m)} ${m.stock_no}`} dim={sold} />
                      ) : (
                        <div className="flex h-full items-center justify-center text-white/25">
                          <Tractor className="h-12 w-12" />
                        </div>
                      )}
                      <span className="absolute left-2.5 top-2.5 rounded-lg bg-black/55 px-2 py-0.5 text-xs font-bold text-white backdrop-blur-sm">{m.stock_no}</span>
                      {m.image_count > 1 && (
                        <span className="absolute right-2.5 top-2.5 inline-flex items-center gap-1 rounded-lg bg-black/55 px-2 py-0.5 text-xs font-semibold text-white backdrop-blur-sm">
                          <Camera className="h-3 w-3" />
                          {m.image_count}
                        </span>
                      )}
                      {(sold || reserved) && (
                        <span className={`absolute inset-x-0 bottom-0 py-1 text-center text-xs font-black uppercase tracking-widest text-white ${sold ? "bg-[var(--accent)]/95" : "bg-amber-500/95"}`}>
                          {sold ? "Sold" : "Reserved"}
                        </span>
                      )}
                    </Link>
                    <div className="flex flex-1 flex-col p-3.5">
                      <Link href={detail} className="line-clamp-1 py-1 text-[15px] font-extrabold group-hover:text-[var(--accent-text)]">
                        {machineTitle(m)}
                      </Link>
                      <div className="flex h-4 items-center justify-between gap-2 text-xs text-white/60">
                        <span className="line-clamp-1">{m.category ?? ""}</span>
                        <ShipsFrom code={m.branch} compact className="shrink-0 text-xs font-semibold text-white/80" />
                      </div>
                      <dl className="mt-2.5 grid grid-cols-2 gap-x-2 gap-y-1.5 text-xs text-white/75">
                        <div className="flex items-center gap-1.5 truncate">
                          <Clock className="h-3.5 w-3.5 shrink-0 text-rose-300" />
                          {m.hours != null ? `${m.hours.toLocaleString()} h` : "—"}
                        </div>
                        <div className="flex items-center gap-1.5 truncate">
                          <Gauge className="h-3.5 w-3.5 shrink-0 text-rose-300" />
                          {m.engine_power_hp != null ? `${Number(m.engine_power_hp).toLocaleString()} hp` : "—"}
                        </div>
                        <div className="flex items-center gap-1.5 truncate">
                          <Weight className="h-3.5 w-3.5 shrink-0 text-rose-300" />
                          {m.operating_weight_kg != null ? `${(Number(m.operating_weight_kg) / 1000).toLocaleString(undefined, { maximumFractionDigits: 1 })} t` : "—"}
                        </div>
                        <div className="truncate capitalize">{m.condition}</div>
                      </dl>
                      <div className="mt-3 flex items-end justify-between gap-2 border-t border-white/10 pt-3">
                        <div>
                          <div className="text-xs font-bold uppercase tracking-wider text-white/60">FOB price</div>
                          {price ? <div className="text-xl font-black leading-tight">{price}</div> : <div className="text-sm font-bold text-white/85">Ask for price</div>}
                        </div>
                        <div className="flex gap-2">
                          {wa && !sold && (
                            <a href={wa} target="_blank" rel="noreferrer" className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#25D366]/15 text-[#4ADE80] ring-1 ring-[#25D366]/40 hover:bg-[#25D366]/25" aria-label={`WhatsApp about ${m.stock_no}`}>
                              <MessageCircle className="h-5 w-5" />
                            </a>
                          )}
                          <Link href={detail} className="inline-flex h-11 items-center rounded-xl bg-[var(--accent)] px-4 text-sm font-bold text-white shadow-lg shadow-brand-900/30 hover:bg-brand-700">
                            Details
                          </Link>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          {pages > 1 && (
            <nav className="mt-8 flex flex-wrap justify-center gap-1.5" aria-label="Pages">
              {Array.from({ length: pages }, (_, i) => i + 1).map((n) => (
                <Link key={n} href={href({ page: n > 1 ? String(n) : undefined })} className={`flex min-h-11 min-w-11 items-center justify-center rounded-xl px-3 text-center text-sm font-bold ${n === page ? "bg-[var(--accent)] text-white shadow-lg shadow-brand-900/40" : "glass-lite hover:bg-white/15"}`}>
                  {n}
                </Link>
              ))}
            </nav>
          )}
        </div>
      </div>
    </div>
  );
}
