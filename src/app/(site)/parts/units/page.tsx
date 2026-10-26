import type { Metadata } from "next";
import Link from "next/link";
import { Camera, Car, MessageCircle } from "lucide-react";
import { publicImageUrl } from "@/lib/format";
import { getCompany, getPartFacets, getPartUnitFacets, listPartUnits, whatsapp, type UnitFilters } from "@/lib/public-site";
import { UNIT_CONDITION_LABEL, UNIT_CUTS, UNIT_PARTS, UNIT_PART_LABEL, type UnitCondition, type UnitPart } from "@/lib/part-units";
import { InquiryForm } from "@/components/site/inquiry-form";
import { CardPhotos } from "@/components/site/card-photos";
import { ShipsFrom } from "@/components/site/ships-from";
import { FilterPanel, FilterSubmit, FilterToolbar } from "@/components/site/filter-sheet";
import { PartsTabs } from "@/components/site/parts-tabs";

export const revalidate = 300;
const SIZE = 24;
const FIELD = "h-12 w-full rounded-xl px-3 text-sm font-semibold";
const FLABEL = "mb-1 block text-xs font-bold uppercase tracking-wider text-white/60";

export const metadata: Metadata = {
  title: "Half cuts, nose cuts & complete units for parts",
  description: "Japanese cars bought for parts: half cuts, nose cuts, rear cuts, engines, gearboxes, batteries and doors from complete units, shipped worldwide by Al Mashriq Trading.",
  alternates: { canonical: "/parts/units" },
};

export default async function PartUnitsPage({ searchParams }: { searchParams: Promise<UnitFilters> }) {
  const f = await searchParams;
  const [{ units, total, page }, facets, partFacets, company] = await Promise.all([listPartUnits(f, SIZE), getPartUnitFacets(), getPartFacets(), getCompany()]);
  const pages = Math.max(1, Math.ceil(total / SIZE));
  const href = (patch: Partial<UnitFilters>) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries({ ...f, page: undefined, ...patch })) if (v) p.set(k, String(v));
    const s = p.toString();
    return s ? `/parts/units?${s}` : "/parts/units";
  };
  const active = (["q", "make", "part"] as const).filter((k) => f[k]).length;
  const filtered = active > 0;
  // Only offer parts that at least one unit has.
  const partsOnOffer = UNIT_PARTS.filter((p) => facets.part.has(p));

  return (
    <div className="mx-auto max-w-7xl px-4 py-5 lg:px-6 lg:py-8">
      <h1 className="flex items-center gap-2.5 text-2xl font-black sm:text-3xl">
        <span className="h-7 w-1 rounded-full bg-gradient-to-b from-[var(--accent)] to-rose-300" />
        Complete units for parts
      </h1>
      <p className="mt-1.5 max-w-3xl text-sm text-white/65 sm:text-base">
        Cars we buy to dismantle. Order the whole half cut, nose cut or rear cut, or single parts from the unit: engine, gearbox, battery, doors and more.
      </p>
      <PartsTabs active="units" parts={partFacets.total} units={facets.total} />

      {/* cut / part chips */}
      {partsOnOffer.length > 0 && (
        <div className="hscroll mt-4 lg:flex-wrap lg:overflow-visible">
          <Link href={href({ part: undefined })} className={`inline-flex min-h-10 items-center whitespace-nowrap rounded-full px-4 text-sm font-bold ${!f.part ? "bg-[var(--accent)] text-white" : "glass-lite"}`}>
            All <span className="ml-1.5 rounded-md bg-white/15 px-1.5 py-0.5 text-xs tabular-nums">{facets.total}</span>
          </Link>
          {partsOnOffer.map((p) => (
            <Link key={p} href={href({ part: p })} className={`inline-flex min-h-10 items-center whitespace-nowrap rounded-full px-4 text-sm font-bold ${f.part === p ? "bg-[var(--accent)] text-white" : "glass-lite"}`}>
              {UNIT_PART_LABEL[p]} <span className="ml-1.5 rounded-md bg-white/15 px-1.5 py-0.5 text-xs tabular-nums">{facets.part.get(p)}</span>
            </Link>
          ))}
        </div>
      )}

      <div className="mt-4 lg:mt-6">
        <FilterToolbar count={active} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[16rem_1fr]">
        <aside className="order-2 space-y-5 lg:order-1 lg:self-start">
          <FilterPanel>
            <form action="/parts/units" className="space-y-3" role="search">
              <input name="q" defaultValue={f.q ?? ""} placeholder="Model, model code, stock ID…" aria-label="Search complete units" className={FIELD} enterKeyHint="search" />
              <div>
                <label className={FLABEL}>Make</label>
                <select name="make" defaultValue={f.make ?? ""} className={FIELD} aria-label="Make">
                  <option value="">All makes</option>
                  {facets.make.map(([m, n]) => (
                    <option key={m} value={m}>
                      {m} ({n})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={FLABEL}>I need</label>
                <select name="part" defaultValue={f.part ?? ""} className={FIELD} aria-label="Cut or part">
                  <option value="">Any cut or part</option>
                  {partsOnOffer.map((p) => (
                    <option key={p} value={p}>
                      {UNIT_PART_LABEL[p]}
                    </option>
                  ))}
                </select>
              </div>
              <FilterSubmit label="Show units" />
              {filtered && (
                <Link href="/parts/units" className="flex min-h-11 items-center justify-center text-sm font-semibold text-white/70 hover:text-white">
                  Clear all filters
                </Link>
              )}
            </form>
          </FilterPanel>
          <div className="glass-lite rounded-2xl p-5">
            <h2 className="mb-1 font-black">Need a cut or part?</h2>
            <p className="mb-3 text-sm text-white/65">Tell us the model, year, model code and what you need (half cut, engine…) and we&apos;ll quote you.</p>
            <InquiryForm source="parts" compact defaultMessage="I'm looking for a half cut / part for: " />
          </div>
        </aside>

        <div id="results" className="order-1 lg:order-2">
          <div className="mb-3 flex items-center justify-between text-sm text-white/65">
            <span>
              <b className="text-white">{total.toLocaleString()}</b> {total === 1 ? "unit" : "units"}
              {filtered ? " found" : " available"}
            </span>
            {filtered && (
              <Link href="/parts/units" className="inline-flex min-h-10 items-center font-semibold text-[var(--accent-text)] hover:underline">
                Clear filters
              </Link>
            )}
          </div>

          {!units.length ? (
            <div className="glass-lite rounded-2xl p-12 text-center text-white/65">
              <Car className="mx-auto mb-3 h-8 w-8 text-white/30" />
              {filtered ? "No units match — send us an inquiry and we'll find one for you." : "New units arrive every week — send us an inquiry for the model you need."}
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {units.map((u) => {
                const title = [u.year, u.make, u.model].filter(Boolean).join(" ");
                const detail = `/parts/units/${encodeURIComponent(u.stock_no)}`;
                const imgs = (u.images?.length ? u.images : u.cover ? [u.cover] : []).map(publicImageUrl);
                const cuts = u.unit_parts.filter((p) => UNIT_CUTS.includes(p as UnitPart));
                const others = u.unit_parts.filter((p) => !UNIT_CUTS.includes(p as UnitPart));
                const wa = whatsapp(company, `Hello Al Mashriq, I'm interested in parts from unit ${u.stock_no} ${title}${u.model_code ? ` (${u.model_code})` : ""}. I need: `);
                return (
                  <article key={u.id} className="glass-lite glass-hover flex flex-col overflow-hidden rounded-2xl">
                    <Link href={detail} className="relative block aspect-[4/3] bg-black/20" aria-label={`${title} — ${u.stock_no}`}>
                      {imgs.length ? (
                        <CardPhotos images={imgs} alt={`${title} for parts ${u.stock_no}`} />
                      ) : (
                        <div className="flex h-full flex-col items-center justify-center gap-2 opacity-40">
                          <Car className="h-10 w-10" />
                          <span className="text-xs font-semibold">Photos on request</span>
                        </div>
                      )}
                      <span className="absolute left-2.5 top-2.5 rounded-lg bg-black/55 px-2 py-0.5 text-xs font-bold text-white backdrop-blur-sm">{u.stock_no}</span>
                      {u.image_count > 1 && (
                        <span className="absolute right-2.5 top-2.5 inline-flex items-center gap-1 rounded-lg bg-black/55 px-2 py-0.5 text-xs font-semibold text-white backdrop-blur-sm">
                          <Camera className="h-3 w-3" />
                          {u.image_count}
                        </span>
                      )}
                      <span className="absolute bottom-2 left-2.5 rounded-lg bg-[var(--accent)] px-2 py-0.5 text-xs font-bold text-white">Parts car</span>
                    </Link>
                    <div className="flex flex-1 flex-col p-4">
                      <div className="flex flex-wrap items-center gap-1.5 text-xs font-semibold">
                        {u.unit_condition && (
                          <span className="rounded-md bg-white/10 px-1.5 py-0.5 text-white/85">{UNIT_CONDITION_LABEL[u.unit_condition as UnitCondition] ?? u.unit_condition}</span>
                        )}
                        <ShipsFrom code={u.branch} compact className="ml-auto text-white/80" />
                      </div>
                      <Link href={detail} className="mt-2 font-bold hover:text-[var(--accent-text)]">
                        {title}
                      </Link>
                      <p className="text-sm text-white/65">{[u.model_code, u.engine_cc ? `${u.engine_cc}cc` : null, u.transmission, u.fuel].filter(Boolean).join(" · ")}</p>
                      {(cuts.length > 0 || others.length > 0) && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {cuts.map((p) => (
                            <span key={p} className="rounded-md bg-brand-50 px-1.5 py-0.5 text-xs font-bold text-brand-700 ring-1 ring-brand-200">
                              {UNIT_PART_LABEL[p as UnitPart]}
                            </span>
                          ))}
                          {others.slice(0, 4).map((p) => (
                            <span key={p} className="rounded-md bg-white/10 px-1.5 py-0.5 text-xs font-semibold text-white/75">
                              {UNIT_PART_LABEL[p as UnitPart] ?? p}
                            </span>
                          ))}
                          {others.length > 4 && <span className="px-1 text-xs text-white/55">+{others.length - 4} more</span>}
                        </div>
                      )}
                      <div className="mt-auto flex items-center justify-between gap-2 pt-3">
                        <Link href={detail} className="text-sm font-bold text-[var(--accent-text)] hover:underline">
                          View unit
                        </Link>
                        {wa ? (
                          <a href={wa} target="_blank" rel="noreferrer" className="inline-flex h-11 items-center gap-1.5 rounded-xl bg-[#25D366] px-4 text-sm font-bold text-jet-950 hover:brightness-110">
                            <MessageCircle className="h-4 w-4" /> Ask for parts
                          </a>
                        ) : (
                          <Link href={detail} className="inline-flex h-11 items-center rounded-xl bg-[var(--accent)] px-4 text-sm font-bold text-white hover:bg-brand-700">
                            Inquire
                          </Link>
                        )}
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
