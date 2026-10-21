import type { Metadata } from "next";
import { Quote } from "lucide-react";
import { assetUrl, getCompany, getReviews, SITE_URL } from "@/lib/public-site";
import { Stars } from "@/components/site/stars";
import { JsonLd } from "@/components/site/json-ld";
import { InquiryForm } from "@/components/site/inquiry-form";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Customer reviews",
  description: "Read what our customers around the world say about buying Japanese used cars from Al Mashriq Trading.",
  alternates: { canonical: "/reviews" },
};

export default async function ReviewsPage() {
  const [{ reviews, avg, count }, company] = await Promise.all([getReviews(200), getCompany()]);
  const dist = [5, 4, 3, 2, 1].map((s) => ({ s, n: reviews.filter((r) => Math.round(r.rating) === s).length }));

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 lg:px-6">
      {count > 0 && (
        <JsonLd
          data={{
            "@context": "https://schema.org",
            "@type": "AutoDealer",
            name: company.company_name,
            url: SITE_URL,
            aggregateRating: { "@type": "AggregateRating", ratingValue: avg.toFixed(1), reviewCount: count, bestRating: 5, worstRating: 1 },
            review: reviews.slice(0, 20).map((r) => ({
              "@type": "Review",
              author: { "@type": "Person", name: r.customer_name },
              datePublished: r.review_date,
              reviewBody: r.body,
              name: r.title ?? undefined,
              reviewRating: { "@type": "Rating", ratingValue: r.rating, bestRating: 5 },
            })),
          }}
        />
      )}
      <h1 className="border-l-4 border-brand-600 pl-3 text-3xl font-black text-navy-950">Customer reviews</h1>

      <div className="mt-6 grid gap-6 lg:grid-cols-[18rem_1fr]">
        <aside className="space-y-5 lg:sticky lg:top-16 lg:self-start">
          <div className="rounded-xl bg-white p-5 text-center shadow-sm ring-1 ring-slate-200">
            <div className="text-5xl font-black text-navy-950">{count ? avg.toFixed(1) : "—"}</div>
            <Stars value={avg} size="h-5 w-5" />
            <div className="mt-1 text-sm text-slate-500">{count} reviews</div>
            <div className="mt-4 space-y-1.5">
              {dist.map(({ s, n }) => (
                <div key={s} className="flex items-center gap-2 text-xs text-slate-600">
                  <span className="w-3">{s}</span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full bg-amber-400" style={{ width: `${count ? (n / count) * 100 : 0}%` }} />
                  </div>
                  <span className="w-5 text-right">{n}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <h2 className="mb-1 font-black text-navy-950">Bought a car from us?</h2>
            <p className="mb-3 text-sm text-slate-500">Tell us how it went — we publish reviews after checking them with the order.</p>
            <InquiryForm source="review" compact defaultMessage="My review: " />
          </div>
        </aside>

        <div className="grid content-start gap-4 md:grid-cols-2">
          {!reviews.length && <div className="rounded-xl bg-white p-10 text-center text-slate-500 ring-1 ring-slate-200 md:col-span-2">Reviews are coming soon.</div>}
          {reviews.map((r) => (
            <figure key={r.id} className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
              <div className="flex items-center gap-3">
                {r.photo_path ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={assetUrl(r.photo_path)!} alt="" className="h-12 w-12 rounded-full object-cover" loading="lazy" />
                ) : (
                  <span className="flex h-12 w-12 items-center justify-center rounded-full bg-navy-800 text-lg font-black text-white">{r.customer_name.slice(0, 1)}</span>
                )}
                <div className="min-w-0 flex-1">
                  <figcaption className="font-bold text-navy-950">{r.customer_name}</figcaption>
                  <div className="text-xs text-slate-500">{[r.country, r.vehicle].filter(Boolean).join(" · ")}</div>
                </div>
                <time className="text-xs text-slate-400" dateTime={r.review_date}>
                  {new Date(r.review_date).toLocaleDateString("en-GB", { month: "short", year: "numeric" })}
                </time>
              </div>
              <Stars value={r.rating} size="mt-3 h-4 w-4" />
              {r.title && <div className="mt-2 font-bold text-navy-900">{r.title}</div>}
              <blockquote className="mt-1 whitespace-pre-line text-sm leading-6 text-slate-700">
                <Quote className="mr-1 inline h-3.5 w-3.5 text-brand-500" />
                {r.body}
              </blockquote>
            </figure>
          ))}
        </div>
      </div>
    </div>
  );
}
