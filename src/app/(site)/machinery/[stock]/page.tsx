import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MessageCircle } from "lucide-react";
import { publicImageUrl } from "@/lib/format";
import { getCompany, getMachine, listMachinery, priceLabel, whatsapp, SITE_URL } from "@/lib/public-site";
import { branchName } from "@/lib/branches";
import { machineTitle } from "@/lib/machinery";
import { Gallery } from "@/components/site/gallery";
import { InquiryForm } from "@/components/site/inquiry-form";
import { JsonLd } from "@/components/site/json-ld";
import { ShipsFrom } from "@/components/site/ships-from";
import { StickyContact } from "@/components/site/sticky-contact";
import { FavoriteButton } from "@/components/site/favorite-button";

export const revalidate = 60;
// Nothing is built up front: each page is rendered on its first visit, then served from cache until it revalidates.
export async function generateStaticParams() {
  return [];
}

export async function generateMetadata({ params }: { params: Promise<{ stock: string }> }): Promise<Metadata> {
  const m = await getMachine(decodeURIComponent((await params).stock));
  if (!m) return { title: "Machine not found", robots: { index: false } };
  const title = `${machineTitle(m)}${m.category ? ` ${m.category}` : ""} — ${m.stock_no}`;
  const price = priceLabel(m);
  const description = [
    `Used ${machineTitle(m)} for sale from ${branchName(m.branch)}`,
    m.hours != null ? `${m.hours.toLocaleString()} hours` : null,
    m.operating_weight_kg ? `${(Number(m.operating_weight_kg) / 1000).toLocaleString()} t` : null,
    price ? `FOB ${price}` : "Ask for price",
  ]
    .filter(Boolean)
    .join(" · ");
  const url = `/machinery/${encodeURIComponent(m.stock_no)}`;
  return { title, description, alternates: { canonical: url }, openGraph: { title, description, url, images: m.images.slice(0, 4).map(publicImageUrl) } };
}

export default async function MachinePage({ params }: { params: Promise<{ stock: string }> }) {
  const [m, company] = await Promise.all([getMachine(decodeURIComponent((await params).stock)), getCompany()]);
  if (!m) notFound();
  const related = (await listMachinery({ category: m.category ?? undefined }, 9)).machines.filter((x) => x.id !== m.id).slice(0, 4);
  const title = machineTitle(m);
  const price = priceLabel(m);
  const sold = m.status === "sold" || m.status === "shipped";
  const images = m.images.map(publicImageUrl);
  const url = `${SITE_URL}/machinery/${encodeURIComponent(m.stock_no)}`;
  const wa = whatsapp(company, `Hello, please send me a C&F quotation for ${m.stock_no} ${title}. My destination port is: `);
  const specs: [string, string | number | null][] = [
    ["Stock ID", m.stock_no],
    ["Type", m.category],
    ["Make", m.make],
    ["Model", m.model],
    ["Year", m.year],
    ["Working hours", m.hours != null ? `${m.hours.toLocaleString()} h` : null],
    ["Serial no.", m.serial_no],
    ["Operating weight", m.operating_weight_kg != null ? `${Number(m.operating_weight_kg).toLocaleString()} kg` : null],
    ["Engine power", m.engine_power_hp != null ? `${Number(m.engine_power_hp).toLocaleString()} hp` : null],
    ["Bucket capacity", m.bucket_capacity_m3 != null ? `${m.bucket_capacity_m3} m³` : null],
    ["Attachments", m.attachments],
    ["Condition", m.condition[0].toUpperCase() + m.condition.slice(1)],
    ["Location", m.location],
    ["Ships from", branchName(m.branch)],
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-5 lg:px-6">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Product",
          name: title,
          sku: m.stock_no,
          url,
          image: images.slice(0, 10),
          brand: { "@type": "Brand", name: m.make },
          model: m.model,
          category: m.category ?? "Heavy machinery",
          description: m.description ?? undefined,
          itemCondition: m.condition === "new" ? "https://schema.org/NewCondition" : m.condition === "rebuilt" ? "https://schema.org/RefurbishedCondition" : "https://schema.org/UsedCondition",
          offers: {
            "@type": "Offer",
            url,
            priceCurrency: m.price_currency || "USD",
            price: price ? Number(m.price) : undefined,
            availability: sold ? "https://schema.org/SoldOut" : m.status === "reserved" ? "https://schema.org/LimitedAvailability" : "https://schema.org/InStock",
            seller: { "@type": "Organization", name: company.company_name },
          },
        }}
      />
      <nav className="mb-3 text-xs text-slate-500" aria-label="Breadcrumb">
        <Link href="/" className="hover:text-brand-700">Home</Link> / <Link href="/machinery" className="hover:text-brand-700">Machinery</Link>
        {m.category ? (
          <>
            {" / "}
            <Link href={`/machinery?category=${encodeURIComponent(m.category)}`} className="hover:text-brand-700">{m.category}</Link>
          </>
        ) : null}{" "}
        / {m.stock_no}
      </nav>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Gallery images={images} alt={title} stockNo={m.stock_no} />

        <div className="space-y-4">
          <div className="glass-lite rounded-3xl p-5">
            <div className="flex items-center justify-between gap-3">
              <span className="inline-flex rounded-lg bg-white/10 px-2 py-0.5 text-xs font-bold text-white">Stock ID {m.stock_no}</span>
              <FavoriteButton variant="pill" item={{ kind: "machine", id: m.id, stock: m.stock_no, title, image: images[0] ?? null, price: price ?? null }} />
            </div>
            <h1 className="mt-2 text-2xl font-black tracking-tight text-navy-950 sm:text-3xl">{title}</h1>
            {m.category && <p className="text-slate-500">{m.category}</p>}
            <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold text-slate-700">
              {m.hours != null && <span className="rounded-full bg-slate-100 px-2.5 py-1">{m.hours.toLocaleString()} h</span>}
              {m.engine_power_hp != null && <span className="rounded-full bg-slate-100 px-2.5 py-1">{Number(m.engine_power_hp).toLocaleString()} hp</span>}
              {m.operating_weight_kg != null && <span className="rounded-full bg-slate-100 px-2.5 py-1">{(Number(m.operating_weight_kg) / 1000).toLocaleString(undefined, { maximumFractionDigits: 1 })} t</span>}
              <span className="rounded-full bg-slate-100 px-2.5 py-1">
                <ShipsFrom code={m.branch} />
              </span>
            </div>
            <div className="mt-4 flex items-end justify-between gap-3 rounded-lg bg-navy-50 p-4">
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-navy-500">FOB price</div>
                <div className="text-3xl font-black text-brand-600">{price ?? "Ask for price"}</div>
              </div>
              {wa && (
                <a href={wa} target="_blank" rel="noreferrer" className="inline-flex h-12 items-center gap-2 rounded-xl bg-[#25D366] px-4 text-sm font-bold text-jet-950 shadow-lg shadow-black/25 hover:brightness-110">
                  <MessageCircle className="h-4 w-4" /> WhatsApp
                </a>
              )}
            </div>
            {m.description && <p className="mt-4 whitespace-pre-line text-sm leading-6 text-slate-700">{m.description}</p>}
          </div>

          <div id="quote" className="glass-lite scroll-mt-20 rounded-3xl p-5">
            <h2 className="mb-1 font-black">Get a C&amp;F quotation</h2>
            <p className="mb-3 text-sm text-slate-500">Tell us your destination port and we will send you the total price.</p>
            <InquiryForm stockNo={m.stock_no} source="machinery" compact defaultMessage={`Please send me a C&F quotation for ${m.stock_no} ${title}. My destination port is: `} />
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
          <h2 className="mb-3 text-xl font-black text-navy-950">More {m.category ?? "machinery"}</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {related.map((r) => (
              <Link key={r.id} href={`/machinery/${encodeURIComponent(r.stock_no)}`} className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-200 hover:shadow-md">
                <div className="aspect-[4/3] bg-slate-200">
                  {r.cover && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={publicImageUrl(r.cover)} alt={machineTitle(r)} loading="lazy" className="h-full w-full object-cover" />
                  )}
                </div>
                <div className="p-3">
                  <div className="line-clamp-1 font-bold text-navy-950">{machineTitle(r)}</div>
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
