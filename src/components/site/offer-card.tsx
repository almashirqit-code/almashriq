import Link from "next/link";
import { Tag } from "lucide-react";
import { assetUrl, carTitle, priceLabel, type PublicOffer } from "@/lib/public-site";

const day = (d: string) => new Date(`${d}T00:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

/** One live offer — used on /offers and (compact) in the home page strip. */
export function OfferCard({ offer: o, compact = false }: { offer: PublicOffer; compact?: boolean }) {
  const price = priceLabel({ price: o.special_price, price_currency: o.price_currency });
  return (
    <article className="glass-lite flex h-full flex-col overflow-hidden rounded-2xl">
      {o.banner_path && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={assetUrl(o.banner_path)!} alt="" loading="lazy" className={`w-full object-cover ${compact ? "aspect-[16/9]" : "aspect-[3/1]"}`} />
      )}
      <div className="flex flex-1 flex-col p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-2">
          {o.discount_pct != null && <span className="rounded-full bg-[var(--accent)] px-2.5 py-0.5 text-xs font-black text-white">{Number(o.discount_pct)}% off</span>}
          {price && <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-xs font-bold">Special FOB {price}</span>}
        </div>
        <h3 className={`mt-2 font-black leading-tight ${compact ? "line-clamp-2 text-base" : "text-xl"}`}>{o.title}</h3>
        {o.summary && <p className={`mt-1 text-sm text-white/70 ${compact ? "line-clamp-2" : "whitespace-pre-line"}`}>{o.summary}</p>}
        {!compact && o.cars.length > 0 && (
          <ul className="mt-3 flex flex-wrap gap-2">
            {o.cars.map((c) => (
              <li key={c.stock_no}>
                <Link href={`/cars/${encodeURIComponent(c.stock_no)}`} className="inline-flex min-h-11 items-center gap-1.5 rounded-xl bg-white/5 px-3 text-sm font-semibold ring-1 ring-white/10 hover:text-[var(--accent-text)]">
                  <Tag className="h-3.5 w-3.5" aria-hidden />
                  {carTitle(c)} <span className="text-white/50">· {c.stock_no}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-auto pt-3 text-xs text-white/55">{o.ends_on ? `Ends ${day(o.ends_on)}` : "Limited time"}</p>
      </div>
    </article>
  );
}
