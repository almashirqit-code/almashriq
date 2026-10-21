import type { Metadata } from "next";
import Link from "next/link";
import { Camera, Clock, Gauge, MessageCircle, Search, SlidersHorizontal, Tractor, Weight, X } from "lucide-react";
import { publicImageUrl } from "@/lib/format";
import { getBranches, getCompany, getMachineryFacets, listMachinery, priceLabel, whatsapp, type MachineFilters } from "@/lib/public-site";
import { branchName } from "@/lib/branches";
import { machineTitle } from "@/lib/machinery";
import { CardPhotos } from "@/components/site/card-photos";
import { ShipsFrom } from "@/components/site/ships-from";
import { SortSelect } from "../sort-select";

export const revalidate = 300;
const SIZE = 24;
const FIELD = "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-navy-500 focus:ring-2 focus:ring-navy-500/15";
const LABEL: Record<string, string> = { q: "Search", category: "Type", make: "Make", branch: "Ships from", min_price: "Min price", max_price: "Max price", min_year: "From year", max_year: "To year" };

export const metadata: Metadata = {
  title: "Used heavy machinery for export — excavators, loaders, cranes, forklifts",
  description: "Used construction and heavy machinery from Japan, Singapore, Taiwan and Thailand — excavators, wheel loaders, bulldozers, cranes, forklifts. Export worldwide with Al Mashriq Trading.",
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

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 lg:px-6">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="border-l-4 border-brand-600 pl-3 text-3xl font-black text-navy-950">Heavy machinery</h1>
          <p className="mt-1 pl-4 text-sm text-slate-500">{total.toLocaleString()} machines found — inspected, photographed and shipped worldwide.</p>
        </div>
        <SortSelect value={f.sort || "new"} />
      </div>

      {facets.category.length > 0 && (
        <div className="mb-5 flex flex-wrap gap-2">
          <Link href={href({ category: undefined, page: undefined })} className={`rounded-full px-3.5 py-1.5 text-sm font-bold ring-1 ${!f.category ? "bg-navy-800 text-white ring-navy-800" : "bg-white text-navy-800 ring-slate-200 hover:bg-navy-50"}`}>
            All <span className="opacity-60">{facets.total}</span>
          </Link>
          {facets.category.map(([c, n]) => (
            <Link
              key={c}
              href={href({ category: c, page: undefined })}
              className={`rounded-full px-3.5 py-1.5 text-sm font-bold ring-1 ${f.category?.toLowerCase() === c.toLowerCase() ? "bg-navy-800 text-white ring-navy-800" : "bg-white text-navy-800 ring-slate-200 hover:bg-navy-50"}`}
            >
              {c} <span className="opacity-60">{n}</span>
            </Link>
          ))}
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-[16rem_1fr]">
        <aside>
          <form action="/machinery" className="space-y-3 rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200 lg:sticky lg:top-16">
            <div className="-mx-4 -mt-4 mb-1 flex items-center gap-2 rounded-t-xl bg-navy-800 px-4 py-2.5 text-sm font-extrabold text-white">
              <SlidersHorizontal className="h-4 w-4" /> Search filters
            </div>
            <input name="q" defaultValue={f.q ?? ""} placeholder="Model, stock ID, type…" className={FIELD} aria-label="Keyword" />
            {stocked.length > 1 && (
              <div>
                <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-slate-500">Ships from</label>
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
                <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-slate-500">{label as string}</label>
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
            <button className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-brand-600 py-2.5 text-sm font-bold text-white hover:bg-brand-700">
              <Search className="h-4 w-4" /> Search
            </button>
            {active.length > 0 && (
              <Link href="/machinery" className="block text-center text-xs font-semibold text-slate-500 hover:text-brand-700">
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
                  {LABEL[k]}: {k === "branch" ? branchName(f[k]!.toUpperCase()) : f[k]}
                  <X className="h-3 w-3" />
                </Link>
              ))}
            </div>
          )}

          {!machines.length ? (
            <div className="rounded-xl bg-white p-14 text-center text-slate-500 ring-1 ring-slate-200">
              <Tractor className="mx-auto mb-3 h-8 w-8 text-slate-300" />
              {active.length ? "No machines match your search — send us an inquiry and we'll find one for you." : "Our machinery stock is coming soon — send us an inquiry for any machine."}
              <div className="mt-4">
                <Link href="/contact" className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-bold text-white hover:bg-brand-700">
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
                  <article key={m.id} className={`group flex flex-col overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-200 transition hover:shadow-lg ${sold ? "opacity-80" : ""}`}>
                    <Link href={detail} className="relative block aspect-[4/3] overflow-hidden bg-slate-200">
                      {imgs.length ? (
                        <CardPhotos images={imgs} alt={`${machineTitle(m)} ${m.stock_no}`} dim={sold} />
                      ) : (
                        <div className="flex h-full items-center justify-center text-slate-400">
                          <Tractor className="h-12 w-12" />
                        </div>
                      )}
                      <span className="absolute left-2 top-2 rounded bg-navy-900/90 px-1.5 py-0.5 text-[11px] font-bold text-white">{m.stock_no}</span>
                      {m.image_count > 1 && (
                        <span className="absolute right-2 top-2 inline-flex items-center gap-1 rounded bg-black/55 px-1.5 py-0.5 text-[11px] font-semibold text-white">
                          <Camera className="h-3 w-3" />
                          {m.image_count}
                        </span>
                      )}
                      {(sold || reserved) && (
                        <span className={`absolute inset-x-0 bottom-0 py-1 text-center text-xs font-black uppercase tracking-widest text-white ${sold ? "bg-brand-600/95" : "bg-amber-500/95"}`}>
                          {sold ? "Sold" : "Reserved"}
                        </span>
                      )}
                    </Link>
                    <div className="flex flex-1 flex-col p-3">
                      <Link href={detail} className="line-clamp-1 text-[15px] font-extrabold text-navy-900 hover:text-brand-700">
                        {machineTitle(m)}
                      </Link>
                      <div className="flex h-4 items-center justify-between gap-2 text-xs text-slate-500">
                        <span className="line-clamp-1">{m.category ?? ""}</span>
                        <ShipsFrom code={m.branch} compact className="shrink-0 text-[11px] font-semibold text-navy-700" />
                      </div>
                      <dl className="mt-2 grid grid-cols-2 gap-x-2 gap-y-1 text-[11.5px] text-slate-600">
                        <div className="flex items-center gap-1 truncate">
                          <Clock className="h-3 w-3 shrink-0 text-navy-400" />
                          {m.hours != null ? `${m.hours.toLocaleString()} h` : "—"}
                        </div>
                        <div className="flex items-center gap-1 truncate">
                          <Gauge className="h-3 w-3 shrink-0 text-navy-400" />
                          {m.engine_power_hp != null ? `${Number(m.engine_power_hp).toLocaleString()} hp` : "—"}
                        </div>
                        <div className="flex items-center gap-1 truncate">
                          <Weight className="h-3 w-3 shrink-0 text-navy-400" />
                          {m.operating_weight_kg != null ? `${(Number(m.operating_weight_kg) / 1000).toLocaleString(undefined, { maximumFractionDigits: 1 })} t` : "—"}
                        </div>
                        <div className="truncate capitalize">{m.condition}</div>
                      </dl>
                      <div className="mt-3 flex items-end justify-between gap-2 border-t border-slate-100 pt-2.5">
                        <div>
                          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">FOB price</div>
                          {price ? <div className="text-lg font-black leading-tight text-brand-600">{price}</div> : <div className="text-sm font-bold text-navy-800">Ask for price</div>}
                        </div>
                        <div className="flex gap-1.5">
                          {wa && !sold && (
                            <a href={wa} target="_blank" rel="noreferrer" className="rounded-lg bg-emerald-50 p-2 text-emerald-600 ring-1 ring-emerald-200 hover:bg-emerald-100" aria-label={`WhatsApp about ${m.stock_no}`}>
                              <MessageCircle className="h-4 w-4" />
                            </a>
                          )}
                          <Link href={detail} className="rounded-lg bg-navy-800 px-3 py-2 text-xs font-bold text-white hover:bg-navy-900">
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
                <Link key={n} href={href({ page: n > 1 ? String(n) : undefined })} className={`min-w-10 rounded-lg px-3 py-2 text-center text-sm font-bold ${n === page ? "bg-navy-800 text-white" : "bg-white ring-1 ring-slate-200"}`}>
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
