import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MessageCircle } from "lucide-react";
import { publicImageUrl } from "@/lib/format";
import { getCompany, getPart, listParts, priceLabel, whatsapp, SITE_URL } from "@/lib/public-site";
import { branchName } from "@/lib/branches";
import { partFits } from "@/lib/parts";
import { Gallery } from "@/components/site/gallery";
import { InquiryForm } from "@/components/site/inquiry-form";
import { JsonLd } from "@/components/site/json-ld";
import { ShipsFrom } from "@/components/site/ships-from";
import { StickyContact } from "@/components/site/sticky-contact";

export const revalidate = 60;

const CONDITION: Record<string, string> = { new: "New", used: "Used", rebuilt: "Rebuilt" };

export async function generateMetadata({ params }: { params: Promise<{ partNo: string }> }): Promise<Metadata> {
  const p = await getPart(decodeURIComponent((await params).partNo));
  if (!p) return { title: "Part not found", robots: { index: false } };
  const fits = partFits(p);
  const title = `${p.name}${fits ? ` — ${fits}` : ""} (${p.part_no})`;
  const price = priceLabel(p);
  const description = [`${CONDITION[p.condition]} ${p.name}`, fits && `for ${fits}`, p.oem_no && `OEM ${p.oem_no}`, `ships from ${branchName(p.branch)}`, price ?? "ask for price"].filter(Boolean).join(" · ");
  const url = `/parts/${encodeURIComponent(p.part_no)}`;
  return { title, description, alternates: { canonical: url }, openGraph: { title, description, url, images: p.images.slice(0, 4).map(publicImageUrl) } };
}

export default async function PartPage({ params }: { params: Promise<{ partNo: string }> }) {
  const [p, company] = await Promise.all([getPart(decodeURIComponent((await params).partNo)), getCompany()]);
  if (!p) notFound();
  const related = (await listParts({ category: p.category ?? undefined }, 9)).parts.filter((x) => x.id !== p.id).slice(0, 4);
  const fits = partFits(p);
  const price = priceLabel(p);
  const images = p.images.map(publicImageUrl);
  const url = `${SITE_URL}/parts/${encodeURIComponent(p.part_no)}`;
  const wa = whatsapp(company, `Hello Al Mashriq, please send me a quotation for part ${p.part_no} — ${p.name}${fits ? ` for ${fits}` : ""}. My destination port is: `);
  const specs: [string, string | number | null][] = [
    ["Part no.", p.part_no],
    ["Category", p.category],
    ["Fits", fits || null],
    ["OEM no.", p.oem_no],
    ["Condition", CONDITION[p.condition]],
    ["In stock", p.quantity],
    ["Ships from", branchName(p.branch)],
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-5 lg:px-6">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Product",
          name: p.name,
          sku: p.part_no,
          mpn: p.oem_no ?? undefined,
          url,
          image: images.slice(0, 10),
          description: p.description ?? undefined,
          category: p.category ?? undefined,
          itemCondition: p.condition === "new" ? "https://schema.org/NewCondition" : p.condition === "rebuilt" ? "https://schema.org/RefurbishedCondition" : "https://schema.org/UsedCondition",
          offers: {
            "@type": "Offer",
            url,
            priceCurrency: p.price_currency || "USD",
            price: price ? Number(p.price) : undefined,
            availability: p.status === "reserved" ? "https://schema.org/LimitedAvailability" : "https://schema.org/InStock",
            seller: { "@type": "AutoPartsStore", name: company.company_name },
          },
        }}
      />
      <nav className="mb-3 text-xs text-slate-500" aria-label="Breadcrumb">
        <Link href="/" className="hover:text-brand-700">Home</Link> / <Link href="/parts" className="hover:text-brand-700">Parts</Link>
        {p.category ? (
          <>
            {" / "}
            <Link href={`/parts?category=${encodeURIComponent(p.category)}`} className="hover:text-brand-700">{p.category}</Link>
          </>
        ) : null}{" "}
        / {p.part_no}
      </nav>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Gallery images={images} alt={`${p.name} ${p.part_no}`} stockNo={p.part_no} ribbon={p.status === "reserved" ? "reserved" : null} />

        <div className="space-y-4">
          <div className="glass-lite rounded-3xl p-5">
            <span className="inline-flex rounded-lg bg-white/10 px-2 py-0.5 text-xs font-bold text-white">Part no. {p.part_no}</span>
            <h1 className="mt-2 text-2xl font-black tracking-tight text-navy-950 sm:text-3xl">{p.name}</h1>
            {fits && <p className="text-slate-500">Fits {fits}</p>}
            <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold text-slate-700">
              <span className="rounded-full bg-slate-100 px-2.5 py-1">{CONDITION[p.condition]}</span>
              {p.category && <span className="rounded-full bg-slate-100 px-2.5 py-1">{p.category}</span>}
              <span className="rounded-full bg-slate-100 px-2.5 py-1">
                <ShipsFrom code={p.branch} />
              </span>
            </div>
            <div className="mt-4 flex items-end justify-between gap-3 rounded-lg bg-navy-50 p-4">
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-navy-500">FOB price</div>
                <div className="text-3xl font-black text-brand-600">{price ?? "Ask for price"}</div>
              </div>
              {wa && (
                <a href={wa} target="_blank" rel="noreferrer" className="inline-flex h-12 items-center gap-2 rounded-xl bg-[#25D366] px-4 text-sm font-bold text-jet-950 shadow-lg shadow-black/25 hover:brightness-110">
                  <MessageCircle className="h-4 w-4" /> WhatsApp
                </a>
              )}
            </div>
            {p.description && <p className="mt-4 whitespace-pre-line text-sm leading-6 text-slate-700">{p.description}</p>}
          </div>

          <div id="quote" className="glass-lite scroll-mt-20 rounded-3xl p-5">
            <h2 className="mb-1 font-black">Get a quotation</h2>
            <p className="mb-3 text-sm text-slate-500">Tell us your destination port and we will send a C&amp;F price.</p>
            <InquiryForm stockNo={p.part_no} source="part" compact defaultMessage={`Please send me a quotation for part ${p.part_no} — ${p.name}. My destination port is: `} />
          </div>
        </div>
      </div>

      <StickyContact price={price} wa={wa} />

      <section className="glass-lite mt-6 overflow-hidden rounded-3xl">
        <h2 className="border-b border-white/10 px-5 py-3.5 font-black">Specifications</h2>
        <dl className="grid sm:grid-cols-2">
          {specs
            .filter(([, v]) => v !== null && v !== "")
            .map(([k, v]) => (
              <div key={k} className="flex justify-between gap-4 border-b border-slate-100 px-5 py-2.5 text-sm">
                <dt className="text-slate-500">{k}</dt>
                <dd className="text-right font-semibold text-navy-900">{v}</dd>
              </div>
            ))}
        </dl>
      </section>

      {related.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-3 text-xl font-black text-navy-950">More {p.category ?? "parts"}</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {related.map((r) => (
              <Link key={r.id} href={`/parts/${encodeURIComponent(r.part_no)}`} className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-200 hover:shadow-md">
                <div className="aspect-[4/3] bg-navy-50">
                  {r.cover && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={publicImageUrl(r.cover)} alt={r.name} loading="lazy" className="h-full w-full object-cover" />
                  )}
                </div>
                <div className="p-3">
                  <div className="line-clamp-1 font-bold text-navy-950">{r.name}</div>
                  <div className="text-sm font-black text-brand-700">{priceLabel(r) ?? "Ask for price"}</div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
