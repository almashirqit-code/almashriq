import type { Metadata } from "next";
import Link from "next/link";
import { MARKETS } from "@/lib/markets";

export const metadata: Metadata = {
  title: "Countries we export Japanese used cars to",
  description: `Al Mashriq Trading exports Japanese used cars, parts and machinery worldwide, including ${MARKETS.map((m) => m.name).join(", ")}. RoRo and container shipping from Japan.`,
  alternates: { canonical: "/export" },
};

export default function ExportIndex() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-8 lg:px-6">
      <h1 className="border-l-4 border-brand-600 pl-3 text-3xl font-black text-navy-950">Countries we export to</h1>
      <p className="mt-1 pl-4 text-slate-500">
        We ship Japanese used cars, spare parts and machinery worldwide by RoRo and container. Choose your country for ports, shipping and buying details — or{" "}
        <Link href="/contact" className="font-semibold text-brand-700 hover:underline">ask us</Link> about any other destination.
      </p>
      <ul className="mt-6 grid gap-3 sm:grid-cols-2">
        {MARKETS.map((m) => (
          <li key={m.slug}>
            <Link href={`/export/${m.slug}`} className="flex items-center gap-4 rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200 hover:ring-brand-600">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/flags/${m.code}.svg`} alt="" className="h-8 w-12 shrink-0 rounded object-cover ring-1 ring-black/10" />
              <span>
                <span className="block font-bold text-navy-950">Japanese used cars {m.inName}</span>
                <span className="block text-sm text-slate-500">Shipped to {m.ports.join(" · ")}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
