import type { Metadata } from "next";
import Link from "next/link";
import { Camera, MessageCircle, Wrench } from "lucide-react";
import { publicImageUrl } from "@/lib/format";
import { getBranches, getCompany, getPartFacets, listParts, priceLabel, whatsapp, type PartFilters } from "@/lib/public-site";
import { partFits } from "@/lib/parts";
import { InquiryForm } from "@/components/site/inquiry-form";
import { CardPhotos } from "@/components/site/card-photos";
import { ShipsFrom } from "@/components/site/ships-from";
import { FilterPanel, FilterSubmit, FilterToolbar } from "@/components/site/filter-sheet";

export const revalidate = 300;
const SIZE = 24;
const FIELD = "h-12 w-full rounded-xl px-3 text-sm font-semibold";
const FLABEL = "mb-1 block text-[11px] font-bold uppercase tracking-wider text-white/60";

export const metadata: Metadata = {
  title: "Japanese used auto parts for export",
  description: "Genuine used and new spare parts from Japan, Singapore, Taiwan and Thailand — engines, gearboxes, body parts, lights and more. Shipped worldwide by Al Mashriq Trading.",
  alternates: { canonical: "/parts" },
};

const CONDITION: Record<string, string> = { new: "New", used: "Used", rebuilt: "Rebuilt" };

export default async function PartsPage({ searchParams }: { searchParams: Promise<PartFilters> }) {
  const f = await searchParams;
  const [{ parts, total, page }, facets, company, branches] = await Promise.all([listParts(f, SIZE), getPartFacets(), getCompany(), getBranches()]);
  const pages = Math.max(1, Math.ceil(total / SIZE));
  const href = (patch: Partial<PartFilters>) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries({ ...f, page: undefined, ...patch })) if (v) p.set(k, String(v));
    const s = p.toString();
    return s ? `/parts?${s}` : "/parts";
  };
  const active = (["q", "category", "make", "condition", "branch"] as const).filter((k) => f[k]).length;
  const filtered = active > 0;
  const stocked = branches.filter((b) => b.n_parts > 0 || b.code === f.branch?.toUpperCase());

  return (
    <div className="mx-auto max-w-7xl px-4 py-5 lg:px-6 lg:py-8">
      <h1 className="flex items-center gap-2.5 text-2xl font-black sm:text-3xl">
        <span className="h-7 w-1 rounded-full bg-gradient-to-b from-[var(--accent)] to-rose-300" />
        Spare parts
      </h1>
      <p className="mt-1.5 text-sm text-white/65 sm:text-base">Quality used and new auto parts, checked and shipped worldwide. Can&apos;t find a part? Send us an inquiry — we source from dismantlers every day.</p>

      {/* category chips (phones) */}
      {facets.category.length > 0 && (
        <div className="hscroll mt-4 lg:hidden">
          <Link href={href({ category: undefined })} className={`inline-flex min-h-10 items-center whitespace-nowrap rounded-full px-4 text-sm font-bold ${!f.category ? "bg-[var(--accent)] text-white" : "glass-lite"}`}>
            All <span className="ml-1.5 opacity-70">{facets.total}</span>
          </Link>
          {facets.category.map(([c, n]) => (
            <Link key={c} href={href({ category: c })} className={`inline-flex min-h-10 items-center whitespace-nowrap rounded-full px-4 text-sm font-bold ${f.category?.toLowerCase() === c.toLowerCase() ? "bg-[var(--accent)] text-white" : "glass-lite"}`}>
              {c} <span className="ml-1.5 opacity-70">{n}</span>
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
            <form action="/parts" className="space-y-3" role="search">
              <input name="q" defaultValue={f.q ?? ""} placeholder="Part name, OEM no., model code…" aria-label="Search parts" className={FIELD} enterKeyHint="search" />
              {stocked.length > 1 && (
                <div>
                  <label className={FLABEL}>Ships from</label>
                  <select name="branch" defaultValue={f.branch?.toUpperCase() ?? ""} className={FIELD} aria-label="Ships from">
                    <option value="">Any country</option>
                    {stocked.map((b) => (
                      <option key={b.code} value={b.code}>
                        {b.name} ({b.n_parts})
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <label className={FLABEL}>Category</label>
                <select name="category" defaultValue={f.category ?? ""} className={FIELD} aria-label="Category">
                  <option value="">All categories</option>
                  {facets.category.map(([c]) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={FLABEL}>Make</label>
                <select name="make" defaultValue={f.make ?? ""} className={FIELD} aria-label="Make">
                  <option value="">All makes</option>
                  {facets.make.map(([m]) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={FLABEL}>Condition</label>
                <select name="condition" defaultValue={f.condition ?? ""} className={FIELD} aria-label="Condition">
                  <option value="">Any condition</option>
                  {Object.entries(CONDITION).map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </select>
              </div>
              <FilterSubmit label="Show parts" />
              {filtered && (
                <Link href="/parts" className="flex min-h-11 items-center justify-center text-sm font-semibold text-white/70 hover:text-white">
                  Clear all filters
                </Link>
              )}
            </form>
          </FilterPanel>

          {facets.category.length > 0 && (
            <div className="glass-lite hidden rounded-2xl p-4 lg:block">
              <h2 className="mb-2 text-xs font-bold uppercase tracking-[0.18em]">Categories</h2>
              <ul className="space-y-0.5 text-sm">
                <li>
                  <Link href={href({ category: undefined })} className={`flex justify-between rounded-lg px-2 py-1.5 hover:bg-white/10 ${!f.category ? "font-bold text-[var(--accent-text)]" : "text-white/80"}`}>
                    All parts <span className="text-xs text-white/40">{facets.total}</span>
                  </Link>
                </li>
                {facets.category.map(([c, n]) => (
                  <li key={c}>
                    <Link
                      href={href({ category: c })}
                      className={`flex justify-between rounded-lg px-2 py-1.5 hover:bg-white/10 ${f.category?.toLowerCase() === c.toLowerCase() ? "font-bold text-[var(--accent-text)]" : "text-white/80"}`}
                    >
                      {c} <span className="text-xs text-white/40">{n}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div className="glass-lite rounded-2xl p-5">
            <h2 className="mb-1 font-black">Looking for a part?</h2>
            <p className="mb-3 text-sm text-white/65">Tell us the make, model, year and chassis / OEM number and we&apos;ll quote you.</p>
            <InquiryForm source="parts" compact defaultMessage="I'm looking for this part: " />
          </div>
        </aside>

        <div id="results" className="order-1 lg:order-2">
          <div className="mb-3 flex items-center justify-between text-sm text-white/65">
            <span>
              <b className="text-white">{total.toLocaleString()}</b> parts{filtered ? " found" : " in stock"}
            </span>
            {filtered && (
              <Link href="/parts" className="inline-flex min-h-10 items-center font-semibold text-[var(--accent-text)] hover:underline">
                Clear filters
              </Link>
            )}
          </div>

          {!parts.length ? (
            <div className="glass-lite rounded-2xl p-12 text-center text-white/65">
              <Wrench className="mx-auto mb-3 h-8 w-8 text-white/30" />
              {filtered ? "No parts match your search — send us an inquiry and we'll find it for you." : "Our parts list is coming soon — send us an inquiry for any part."}
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {parts.map((p) => {
                const price = priceLabel(p);
                const fits = partFits(p);
                const detail = `/parts/${encodeURIComponent(p.part_no)}`;
                const imgs = (p.images?.length ? p.images : p.cover ? [p.cover] : []).map(publicImageUrl);
                const wa = whatsapp(company, `Hello Al Mashriq, I'm interested in part ${p.part_no} — ${p.name}${fits ? ` for ${fits}` : ""}.`);
                return (
                  <article key={p.id} className="glass-lite glass-hover flex flex-col overflow-hidden rounded-2xl">
                    <Link href={detail} className="relative block aspect-[4/3] bg-black/20" aria-label={`${p.name} — ${p.part_no}`}>
                      {imgs.length ? (
                        <CardPhotos images={imgs} alt={`${p.name} ${p.part_no}`} />
                      ) : (
                        <div className="flex h-full items-center justify-center text-white/25">
                          <Wrench className="h-12 w-12" />
                        </div>
                      )}
                      <span className="absolute left-2.5 top-2.5 rounded-lg bg-black/55 px-2 py-0.5 text-[11px] font-bold text-white backdrop-blur-sm">{p.part_no}</span>
                      {p.image_count > 1 && (
                        <span className="absolute right-2.5 top-2.5 inline-flex items-center gap-1 rounded-lg bg-black/55 px-2 py-0.5 text-[11px] font-semibold text-white backdrop-blur-sm">
                          <Camera className="h-3 w-3" />
                          {p.image_count}
                        </span>
                      )}
                      {p.status === "reserved" && <span className="absolute inset-x-0 bottom-0 bg-amber-500/95 py-1 text-center text-xs font-black uppercase tracking-widest text-white">Reserved</span>}
                    </Link>
                    <div className="flex flex-1 flex-col p-4">
                      <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-semibold">
                        {p.category && <span className="rounded-md bg-white/10 px-1.5 py-0.5 text-white/80">{p.category}</span>}
                        <span className={`rounded-md px-1.5 py-0.5 ${p.condition === "new" ? "bg-emerald-400/20 text-emerald-300" : "bg-white/10 text-white/70"}`}>{CONDITION[p.condition]}</span>
                        <ShipsFrom code={p.branch} compact className="ml-auto text-white/80" />
                      </div>
                      <Link href={detail} className="mt-2 font-bold hover:text-[var(--accent-text)]">
                        {p.name}
                      </Link>
                      {fits && <p className="text-sm text-white/70">Fits {fits}</p>}
                      {p.oem_no && <p className="text-xs text-white/50">OEM {p.oem_no}</p>}
                      {p.description && <p className="mt-1 line-clamp-2 text-sm text-white/55">{p.description}</p>}
                      <div className="mt-auto flex items-end justify-between gap-2 pt-3">
                        <div>
                          <div className="text-xl font-black">{price ?? <span className="text-sm font-bold text-white/85">Ask for price</span>}</div>
                          {p.quantity > 1 && <div className="text-xs text-white/45">{p.quantity} in stock</div>}
                        </div>
                        {wa ? (
                          <a href={wa} target="_blank" rel="noreferrer" className="inline-flex h-11 items-center gap-1.5 rounded-xl bg-[#25D366] px-4 text-sm font-bold text-white hover:brightness-110">
                            <MessageCircle className="h-4 w-4" /> Ask
                          </a>
                        ) : (
                          <Link href="/contact" className="inline-flex h-11 items-center rounded-xl bg-[var(--accent)] px-4 text-sm font-bold text-white hover:bg-red-600">
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
                <Link key={n} href={href({ page: n > 1 ? String(n) : undefined })} className={`flex min-h-11 min-w-11 items-center justify-center rounded-xl px-3 text-center text-sm font-bold ${n === page ? "bg-[var(--accent)] text-white shadow-lg shadow-red-900/40" : "glass-lite hover:bg-white/15"}`}>
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
