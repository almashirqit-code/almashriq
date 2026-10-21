import type { Metadata } from "next";
import Link from "next/link";
import { MessageCircle, Search, Wrench } from "lucide-react";
import { assetUrl, getCompany, getPartFacets, listParts, priceLabel, whatsapp, type PartFilters } from "@/lib/public-site";
import { partFits } from "@/lib/parts";
import { InquiryForm } from "@/components/site/inquiry-form";

export const revalidate = 300;
const SIZE = 24;

export const metadata: Metadata = {
  title: "Japanese used auto parts for export",
  description: "Genuine Japanese used and new spare parts — engines, gearboxes, body parts, lights and more. Shipped worldwide by Al Mashriq Trading.",
  alternates: { canonical: "/parts" },
};

const CONDITION: Record<string, string> = { new: "New", used: "Used", rebuilt: "Rebuilt" };

export default async function PartsPage({ searchParams }: { searchParams: Promise<PartFilters> }) {
  const f = await searchParams;
  const [{ parts, total, page }, facets, company] = await Promise.all([listParts(f, SIZE), getPartFacets(), getCompany()]);
  const pages = Math.max(1, Math.ceil(total / SIZE));
  const href = (patch: Partial<PartFilters>) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries({ ...f, page: undefined, ...patch })) if (v) p.set(k, String(v));
    const s = p.toString();
    return s ? `/parts?${s}` : "/parts";
  };
  const filtered = !!(f.q || f.category || f.make || f.condition);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 lg:px-6">
      <h1 className="border-l-4 border-brand-600 pl-3 text-3xl font-black text-navy-950">Spare parts</h1>
      <p className="mt-1 pl-4 text-slate-500">Quality Japanese used and new auto parts, checked and shipped worldwide. Can&apos;t find a part? Send us an inquiry — we source from Japanese auctions and dismantlers every day.</p>

      <form action="/parts" className="mt-6 flex flex-col gap-2 rounded-xl bg-white p-3 shadow-sm ring-1 ring-slate-200 sm:flex-row" role="search">
        <input name="q" defaultValue={f.q ?? ""} placeholder="Part name, OEM no., model code…" aria-label="Search parts" className="input flex-1" />
        <select name="category" defaultValue={f.category ?? ""} className="input sm:w-44" aria-label="Category">
          <option value="">All categories</option>
          {facets.category.map(([c]) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select name="make" defaultValue={f.make ?? ""} className="input sm:w-40" aria-label="Make">
          <option value="">All makes</option>
          {facets.make.map(([m]) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
        <select name="condition" defaultValue={f.condition ?? ""} className="input sm:w-36" aria-label="Condition">
          <option value="">Any condition</option>
          {Object.entries(CONDITION).map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
        <button className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-navy-800 px-4 py-2.5 text-sm font-bold text-white hover:bg-navy-900">
          <Search className="h-4 w-4" /> Search
        </button>
      </form>

      <div className="mt-6 grid gap-6 lg:grid-cols-[16rem_1fr]">
        <aside className="space-y-5 lg:sticky lg:top-16 lg:self-start">
          {facets.category.length > 0 && (
            <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
              <h2 className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-navy-900">Categories</h2>
              <ul className="space-y-0.5 text-sm">
                <li>
                  <Link href={href({ category: undefined })} className={`flex justify-between rounded-lg px-2 py-1 hover:bg-navy-50 ${!f.category ? "font-bold text-brand-700" : "text-slate-700"}`}>
                    All parts <span className="text-xs text-slate-400">{facets.total}</span>
                  </Link>
                </li>
                {facets.category.map(([c, n]) => (
                  <li key={c}>
                    <Link
                      href={href({ category: c })}
                      className={`flex justify-between rounded-lg px-2 py-1 hover:bg-navy-50 ${f.category?.toLowerCase() === c.toLowerCase() ? "font-bold text-brand-700" : "text-slate-700"}`}
                    >
                      {c} <span className="text-xs text-slate-400">{n}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <h2 className="mb-1 font-black text-navy-950">Looking for a part?</h2>
            <p className="mb-3 text-sm text-slate-500">Tell us the make, model, year and chassis / OEM number and we&apos;ll quote you.</p>
            <InquiryForm source="parts" compact defaultMessage="I'm looking for this part: " />
          </div>
        </aside>

        <div>
          <div className="mb-3 flex items-center justify-between text-sm text-slate-500">
            <span>
              <b className="text-navy-950">{total.toLocaleString()}</b> parts{filtered ? " found" : " in stock"}
            </span>
            {filtered && (
              <Link href="/parts" className="font-semibold text-brand-700 hover:underline">
                Clear filters
              </Link>
            )}
          </div>

          {!parts.length ? (
            <div className="rounded-xl bg-white p-14 text-center text-slate-500 ring-1 ring-slate-200">
              <Wrench className="mx-auto mb-3 h-8 w-8 text-slate-300" />
              {filtered ? "No parts match your search — send us an inquiry and we'll find it for you." : "Our parts list is coming soon — send us an inquiry for any part."}
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {parts.map((p) => {
                const price = priceLabel(p);
                const fits = partFits(p);
                const wa = whatsapp(company, `Hello Al Mashriq, I'm interested in part ${p.part_no} — ${p.name}${fits ? ` for ${fits}` : ""}.`);
                return (
                  <article key={p.id} className="flex flex-col overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
                    <div className="relative aspect-[4/3] bg-navy-50">
                      {p.photo_path ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={assetUrl(p.photo_path)!} alt={p.name} loading="lazy" className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full items-center justify-center text-navy-200">
                          <Wrench className="h-12 w-12" />
                        </div>
                      )}
                      <span className="absolute left-2 top-2 rounded-md bg-navy-900/85 px-2 py-0.5 text-[11px] font-bold text-white">{p.part_no}</span>
                      {p.status === "reserved" && <span className="absolute right-2 top-2 rounded-md bg-amber-500 px-2 py-0.5 text-[11px] font-bold text-white">Reserved</span>}
                    </div>
                    <div className="flex flex-1 flex-col p-4">
                      <div className="flex flex-wrap gap-1.5 text-[11px] font-semibold">
                        {p.category && <span className="rounded bg-navy-50 px-1.5 py-0.5 text-navy-700">{p.category}</span>}
                        <span className={`rounded px-1.5 py-0.5 ${p.condition === "new" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>{CONDITION[p.condition]}</span>
                      </div>
                      <h2 className="mt-2 font-bold text-navy-950">{p.name}</h2>
                      {fits && <p className="text-sm text-slate-600">Fits {fits}</p>}
                      {p.oem_no && <p className="text-xs text-slate-500">OEM {p.oem_no}</p>}
                      {p.description && <p className="mt-1 line-clamp-2 text-sm text-slate-500">{p.description}</p>}
                      <div className="mt-auto flex items-end justify-between gap-2 pt-3">
                        <div>
                          <div className="text-lg font-black text-brand-700">{price ?? "Ask for price"}</div>
                          {p.quantity > 1 && <div className="text-xs text-slate-400">{p.quantity} in stock</div>}
                        </div>
                        {wa ? (
                          <a href={wa} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500 px-3 py-2 text-sm font-bold text-white hover:bg-emerald-600">
                            <MessageCircle className="h-4 w-4" /> Ask
                          </a>
                        ) : (
                          <Link href="/contact" className="rounded-lg bg-brand-600 px-3 py-2 text-sm font-bold text-white hover:bg-brand-700">
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
