import type { Metadata } from "next";
import Link from "next/link";
import { getOffers } from "@/lib/public-site";
import { OfferCard } from "@/components/site/offer-card";

export const revalidate = 600;

export const metadata: Metadata = {
  title: "Offers & deals",
  description: "Current offers on Japanese used cars from Al Mashriq Trading — discounts and special FOB prices for a limited time.",
  alternates: { canonical: "/offers" },
};

export default async function OffersPage() {
  const offers = await getOffers(50);
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 lg:px-6">
      <h1 className="border-l-4 border-brand-600 pl-3 text-3xl font-black text-navy-950">Offers &amp; deals</h1>
      <p className="mt-2 max-w-2xl text-white/70">Limited-time discounts and special FOB prices. Ask us on WhatsApp or the contact form to reserve.</p>
      {offers.length ? (
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {offers.map((o) => (
            <OfferCard key={o.id} offer={o} />
          ))}
        </div>
      ) : (
        <div className="glass-lite mt-6 rounded-2xl p-10 text-center">
          <p className="font-bold">No offers running right now.</p>
          <p className="mt-1 text-sm text-white/65">
            New deals are added often — meanwhile, browse the{" "}
            <Link href="/cars" className="font-semibold text-[var(--accent-text)] underline">
              full stock list
            </Link>
            .
          </p>
        </div>
      )}
    </div>
  );
}
