import type { Metadata } from "next";
import Link from "next/link";
import { BUY_STEPS } from "@/components/site/buy-steps";
import { JsonLd } from "@/components/site/json-ld";

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

export default function HowToBuy() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-8 lg:px-6">
      <JsonLd
        data={[
          { "@context": "https://schema.org", "@type": "HowTo", name: "How to buy a used car from Japan", step: BUY_STEPS.map((s, i) => ({ "@type": "HowToStep", position: i + 1, name: s.title, text: s.body })) },
          { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: FAQ.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) },
        ]}
      />
      <h1 className="border-l-4 border-brand-600 pl-3 text-3xl font-black text-navy-950">How to buy from Japan</h1>
      <p className="mt-1 pl-4 text-slate-500">Buying a car from us takes six simple steps.</p>
      <ol className="relative mt-8 space-y-4 border-l-2 border-navy-200 pl-8">
        {BUY_STEPS.map((s, i) => (
          <li key={s.title} className="relative rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <span className="absolute -left-[3.05rem] top-4 flex h-10 w-10 items-center justify-center rounded-full bg-navy-800 text-lg font-black text-white ring-4 ring-slate-100">{i + 1}</span>
            <h2 className="text-lg font-bold text-navy-950">{s.title}</h2>
            <p className="mt-1 text-slate-600">{s.body}</p>
          </li>
        ))}
      </ol>
      <h2 className="mt-12 border-l-4 border-brand-600 pl-3 text-2xl font-black text-navy-950">Frequently asked questions</h2>
      <div className="mt-4 divide-y divide-slate-200 rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
        {FAQ.map((f) => (
          <details key={f.q} className="group p-5">
            <summary className="cursor-pointer list-none font-bold text-navy-900 group-open:text-brand-700">{f.q}</summary>
            <p className="mt-2 text-slate-600">{f.a}</p>
          </details>
        ))}
      </div>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link href="/cars" className="rounded-lg bg-navy-800 px-5 py-3 font-bold text-white hover:bg-navy-900">Browse stock</Link>
        <Link href="/contact" className="rounded-lg bg-brand-600 px-5 py-3 font-bold text-white hover:bg-brand-700">Send an inquiry</Link>
      </div>
    </div>
  );
}
