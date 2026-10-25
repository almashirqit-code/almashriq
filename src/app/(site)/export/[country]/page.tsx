import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Anchor, Ship, Navigation, MessageCircle, Send } from "lucide-react";
import { carTitle, getCompany, getMakeTiles, listCars, whatsapp, SITE_URL } from "@/lib/public-site";
import { MARKETS, marketBySlug } from "@/lib/markets";
import { BUY_STEPS } from "@/components/site/buy-steps";
import { JsonLd } from "@/components/site/json-ld";
import { CarCard } from "../../car-card";

export const revalidate = 300;
export function generateStaticParams() {
  return MARKETS.map((m) => ({ country: m.slug }));
}
// Only the countries above have pages.
export const dynamicParams = false;

export async function generateMetadata({ params }: { params: Promise<{ country: string }> }): Promise<Metadata> {
  const m = marketBySlug((await params).country);
  if (!m) return { title: "Country not found", robots: { index: false } };
  return {
    title: `Japanese used cars for sale ${m.inName} — shipped to ${m.ports[0].split(" (")[0]}`,
    description: `Buy quality Japanese used cars from Japan for ${m.name}: full photos, FOB prices and C&F quotations to ${m.ports.join(" / ")}. Exporter based in Japan, shipping by RoRo and container.`,
    alternates: { canonical: `/export/${m.slug}` },
  };
}

export default async function MarketPage({ params }: { params: Promise<{ country: string }> }) {
  const m = marketBySlug((await params).country);
  if (!m) notFound();
  const [company, latest, makes] = await Promise.all([getCompany(), listCars({ sort: "new" }, 8), getMakeTiles()]);
  const port = m.ports[0].split(" (")[0];
  const wa = whatsapp(company, `Hello Al Mashriq, I'm ${m.inName} and would like a C&F quotation to ${port}.`);
  const others = MARKETS.filter((x) => x.slug !== m.slug);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 lg:px-6">
      <JsonLd
        data={[
          {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Home", item: `${SITE_URL}/` },
              { "@type": "ListItem", position: 2, name: "Countries we export to", item: `${SITE_URL}/export` },
              { "@type": "ListItem", position: 3, name: m.name, item: `${SITE_URL}/export/${m.slug}` },
            ],
          },
          { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: m.faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) },
        ]}
      />

      <nav aria-label="Breadcrumb" className="text-sm text-slate-500">
        <Link href="/" className="hover:underline">Home</Link> / <Link href="/export" className="hover:underline">Countries</Link> / <span>{m.name}</span>
      </nav>

      <header className="mt-3 flex items-start gap-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`/flags/${m.code}.svg`} alt="" className="mt-1.5 h-8 w-12 shrink-0 rounded object-cover ring-1 ring-black/10" />
        <div>
          <h1 className="text-3xl font-black leading-tight text-navy-950">Japanese used cars for sale {m.inName}</h1>
          <p className="mt-2 max-w-3xl text-slate-600">{m.intro}</p>
        </div>
      </header>

      <dl className="mt-6 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
          <dt className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500"><Anchor aria-hidden className="h-4 w-4 text-brand-600" /> Destination port</dt>
          <dd className="mt-1 font-bold text-navy-950">{m.ports.join(" · ")}</dd>
        </div>
        <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
          <dt className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500"><Ship aria-hidden className="h-4 w-4 text-brand-600" /> Shipping</dt>
          <dd className="mt-1 font-bold text-navy-950">{m.shipping[0].toUpperCase() + m.shipping.slice(1)}</dd>
        </div>
        <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
          <dt className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500"><Navigation aria-hidden className="h-4 w-4 text-brand-600" /> Traffic drives on the</dt>
          <dd className="mt-1 font-bold text-navy-950">
            {m.drives === "left" ? "Left — Japanese right-hand-drive cars match" : "Right — check right-hand-drive rules first"}
          </dd>
        </div>
      </dl>

      <div className="mt-6 flex flex-wrap gap-3">
        {wa && (
          <a href={wa} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-[#25D366] px-5 font-bold text-jet-950 hover:brightness-110">
            <MessageCircle className="h-4 w-4" /> Ask for a C&amp;F price to {port}
          </a>
        )}
        <Link href="/contact" className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-brand-600 px-5 font-bold text-white hover:bg-brand-700">
          <Send className="h-4 w-4" /> Send an inquiry
        </Link>
      </div>

      <section className="mt-10">
        <div className="flex items-end justify-between gap-3">
          <h2 className="border-l-4 border-brand-600 pl-3 text-2xl font-black text-navy-950">Latest stock ready to ship {m.inName}</h2>
          <Link href="/cars" className="shrink-0 text-sm font-bold text-brand-700 hover:underline">All stock →</Link>
        </div>
        <p className="mt-1 pl-4 text-sm text-slate-500">Buyers {m.inName} often ask us for {m.popular}.</p>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {latest.cars.map((c) => (
            <CarCard key={c.id} c={c} wa={whatsapp(company, `Hello, I'm ${m.inName} and interested in ${c.stock_no} ${carTitle(c)}. Please quote C&F ${port}.`)} />
          ))}
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {makes.slice(0, 8).map((mk) => (
            <Link key={mk.slug} href={`/makes/${mk.slug}`} className="rounded-full bg-white px-3 py-1.5 text-sm font-semibold text-navy-900 ring-1 ring-slate-200 hover:ring-brand-600">
              Used {mk.label}
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-12 grid gap-8 lg:grid-cols-2">
        <div>
          <h2 className="border-l-4 border-brand-600 pl-3 text-2xl font-black text-navy-950">How to buy from Japan {m.inName}</h2>
          <ol className="mt-4 space-y-3">
            {BUY_STEPS.map((s, i) => (
              <li key={s.title} className="flex gap-3 rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-navy-800 font-black text-white">{i + 1}</span>
                <div>
                  <h3 className="font-bold text-navy-950">{s.title}</h3>
                  <p className="text-sm text-slate-600">{s.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
        <div>
          <h2 className="border-l-4 border-brand-600 pl-3 text-2xl font-black text-navy-950">Questions from {m.name}</h2>
          <div className="mt-4 divide-y divide-slate-200 rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
            {m.faq.map((f) => (
              <details key={f.q} className="group p-5" open>
                <summary className="cursor-pointer list-none font-bold text-navy-900 group-open:text-brand-700">{f.q}</summary>
                <p className="mt-2 text-slate-600">{f.a}</p>
              </details>
            ))}
          </div>
          <p className="mt-4 text-sm text-slate-500">
            New to importing? Read <Link href="/blog/how-to-import-used-car-from-japan" className="font-semibold text-brand-700 hover:underline">how to import a used car from Japan</Link> and{" "}
            <Link href="/blog/fob-cnf-cif-prices-japanese-used-cars" className="font-semibold text-brand-700 hover:underline">FOB, C&amp;F and CIF explained</Link>.
          </p>
        </div>
      </section>

      <section className="mt-12">
        <h2 className="text-lg font-black text-navy-950">We also export to</h2>
        <ul className="mt-3 flex flex-wrap gap-2">
          {others.map((o) => (
            <li key={o.slug}>
              <Link href={`/export/${o.slug}`} className="inline-flex min-h-11 items-center gap-2 rounded-full bg-white px-3 text-sm font-semibold text-navy-900 ring-1 ring-slate-200 hover:ring-brand-600">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/flags/${o.code}.svg`} alt="" className="h-4 w-6 rounded-sm object-cover ring-1 ring-black/10" loading="lazy" />
                {o.name}
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
