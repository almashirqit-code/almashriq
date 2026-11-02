import type { Metadata } from "next";
import Link from "next/link";
import { Search, FileText, ClipboardCheck, Banknote, Ship, PackageCheck, MessageCircle, Send, ChevronDown, ArrowRight } from "lucide-react";
import { BUY_STEPS } from "@/components/site/buy-steps";
import { JsonLd } from "@/components/site/json-ld";
import { getCompany, whatsapp } from "@/lib/public-site";
import { MARKETS } from "@/lib/markets";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "How to buy a used car from Japan",
  description: "Step-by-step: choose a car, get a C&F quotation, pay by TT, and receive your Japanese used car by RoRo or container with export documents.",
  alternates: { canonical: "/how-to-buy" },
};

const FAQ = [
  { q: "What does FOB, C&F and CIF mean?", a: "FOB is the price of the car delivered to the ship in Japan. C&F adds ocean freight to your port. CIF adds marine insurance on top of C&F." },
  { q: "How do I pay?", a: "By bank transfer (TT) to our company account in Japan, using the proforma invoice we send. Please send us a copy of the remittance slip." },
  { q: "RoRo or container?", a: "RoRo is usually cheaper for single cars. Containers are better for several cars, parts, or destinations RoRo doesn't serve. We'll quote both where possible." },
  { q: "When do I get the documents?", a: "After the car ships we send the original Bill of Lading, export certificate and invoice by courier (DHL / FedEx) and give you the tracking number." },
  { q: "Can you find a car that isn't in your stock?", a: "Yes. Tell us the model, year, mileage and budget — we buy at Japanese auctions every day." },
];

// One icon per BUY_STEPS entry, in the same order.
const STEP_ICONS = [Search, FileText, ClipboardCheck, Banknote, Ship, PackageCheck];

// FOB → C&F → CIF: each term adds one cost on top of the previous one.
const TERMS = [
  { code: "FOB", name: "Free on board", adds: "Car on the ship in Japan", w: "w-[55%]" },
  { code: "C&F", name: "Cost & freight", adds: "+ ocean freight to your port", w: "w-[82%]" },
  { code: "CIF", name: "Cost, insurance & freight", adds: "+ marine insurance", w: "w-full" },
];

export default async function HowToBuy() {
  const company = await getCompany();
  const wa = whatsapp(company, "Hello Al Mashriq, I'd like to buy a car from Japan. My destination port is: ");

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 lg:px-6 lg:py-8">
      <JsonLd
        data={[
          { "@context": "https://schema.org", "@type": "HowTo", name: "How to buy a used car from Japan", step: BUY_STEPS.map((s, i) => ({ "@type": "HowToStep", position: i + 1, name: s.title, text: s.body })) },
          { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: FAQ.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) },
        ]}
      />

      {/* Hero: what the page promises + the price terms buyers ask about most */}
      <section className="grid gap-4 lg:grid-cols-[1.2fr_1fr] lg:gap-6">
        <div className="glass relative overflow-hidden rounded-3xl p-6 sm:p-8">
          <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-[var(--accent)]/20 blur-3xl" />
          <h1 className="relative text-3xl font-black leading-tight tracking-tight sm:text-4xl">
            How to buy a used car <span className="text-gradient">from Japan</span>
          </h1>
          <p className="relative mt-3 max-w-xl text-white/75">
            Importing a car is simpler than it looks. Buying from us takes six steps — we handle the export inspection, shipping and documents, and you clear the car at your port.
          </p>
          <div className="relative mt-5 flex flex-wrap gap-2">
            <Link href="/cars" className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-[var(--accent)] px-5 text-sm font-bold text-white shadow-lg shadow-brand-900/40 hover:bg-brand-700">
              <Search className="h-4 w-4" /> Browse stock
            </Link>
            {wa && (
              <a href={wa} target="_blank" rel="noreferrer" className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-[#25D366] px-5 text-sm font-bold text-jet-950 hover:brightness-110">
                <MessageCircle className="h-4 w-4" /> Ask on WhatsApp
              </a>
            )}
          </div>
        </div>

        <div className="glass-lite rounded-3xl p-5 sm:p-6">
          <h2 className="text-lg font-black">FOB, C&amp;F and CIF explained</h2>
          <p className="mt-1 text-sm text-white/65">Our listed prices are FOB. Your quotation adds the costs to your port.</p>
          <ul className="mt-4 space-y-3">
            {TERMS.map((t) => (
              <li key={t.code}>
                <div className="text-sm">
                  <b className="font-black">{t.code}</b> <span className="text-white/60">· {t.name}</span>
                </div>
                <div className="mt-1 h-8 overflow-hidden rounded-lg bg-white/5 ring-1 ring-white/10">
                  <div className={`on-dark flex h-full items-center rounded-lg bg-gradient-to-r from-[var(--accent)] to-rose-400 px-2.5 text-xs font-bold text-white ${t.w}`}>
                    <span className="truncate">{t.adds}</span>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* The six steps */}
      <section className="mt-10">
        <h2 className="mb-4 flex items-center gap-2 text-xl font-black sm:text-2xl">
          <span className="h-6 w-1 rounded-full bg-gradient-to-b from-[var(--accent)] to-rose-300" />
          Six steps from Japan to your port
        </h2>
        <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 lg:gap-4">
          {BUY_STEPS.map((s, i) => {
            const I = STEP_ICONS[i] ?? Search;
            return (
              <li key={s.title} className="glass-lite relative overflow-hidden rounded-2xl p-5">
                <span aria-hidden className="pointer-events-none absolute -right-1 -top-4 select-none text-7xl font-black text-white/5">
                  {i + 1}
                </span>
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--accent)] shadow-lg shadow-brand-900/40">
                    <I aria-hidden className="h-5 w-5 text-white" />
                  </span>
                  <div>
                    <div className="text-[11px] font-bold uppercase tracking-wider text-white/55">Step {i + 1}</div>
                    <h3 className="font-extrabold leading-tight">{s.title}</h3>
                  </div>
                </div>
                <p className="mt-3 text-sm leading-6 text-white/75">
                  {s.body}
                  {i === 3 && (
                    <>
                      {" "}
                      <Link href="/payment" className="font-semibold text-[var(--accent-text)] hover:underline">
                        Payment details
                      </Link>
                    </>
                  )}
                </p>
              </li>
            );
          })}
        </ol>
      </section>

      {/* FAQ */}
      <section className="mt-10 grid gap-6 lg:grid-cols-[1fr_20rem]">
        <div>
          <h2 className="mb-4 flex items-center gap-2 text-xl font-black sm:text-2xl">
            <span className="h-6 w-1 rounded-full bg-gradient-to-b from-[var(--accent)] to-rose-300" />
            Frequently asked questions
          </h2>
          <div className="glass-lite divide-y divide-white/10 overflow-hidden rounded-2xl">
            {FAQ.map((f) => (
              <details key={f.q} className="group">
                <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 px-5 py-3 font-bold group-open:text-[var(--accent-text)] [&::-webkit-details-marker]:hidden">
                  {f.q}
                  <ChevronDown aria-hidden className="h-4 w-4 shrink-0 transition group-open:rotate-180" />
                </summary>
                <p className="px-5 pb-4 text-sm leading-6 text-white/75">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
        <aside className="glass-lite self-start rounded-2xl p-5">
          <h2 className="font-black">Shipping guides by country</h2>
          <p className="mt-1 text-sm text-white/65">Ports, shipping options and buying tips for your market.</p>
          <ul className="mt-3 grid grid-cols-2 gap-x-3 lg:grid-cols-1">
            {MARKETS.map((m) => (
              <li key={m.slug}>
                <Link href={`/export/${m.slug}`} className="flex min-h-11 items-center gap-2 text-sm font-semibold hover:underline">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`/flags/${m.code}.svg`} alt="" className="h-4 w-6 rounded-sm object-cover ring-1 ring-black/10" loading="lazy" />
                  {m.name}
                </Link>
              </li>
            ))}
          </ul>
        </aside>
      </section>

      {/* CTA */}
      <section className="mt-10">
        <div className="glass relative flex flex-col items-start justify-between gap-5 overflow-hidden rounded-3xl p-6 sm:p-8 md:flex-row md:items-center">
          <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-[var(--accent)]/25 blur-3xl" />
          <div className="relative">
            <h2 className="text-xl font-black sm:text-2xl">Ready for a quotation?</h2>
            <p className="mt-1 text-white/75">Send the stock ID and your destination port — we reply within 24 hours with a full C&amp;F price.</p>
          </div>
          <div className="relative flex w-full flex-wrap gap-2 md:w-auto">
            <Link href="/contact" className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-[var(--accent)] px-6 font-bold text-white shadow-lg shadow-brand-900/40 hover:bg-brand-700 md:flex-none">
              <Send className="h-4 w-4" /> Send an inquiry
            </Link>
            <Link href="/cars" className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-white/10 px-6 font-bold ring-1 ring-white/20 hover:bg-white/15 md:flex-none">
              Browse stock <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
