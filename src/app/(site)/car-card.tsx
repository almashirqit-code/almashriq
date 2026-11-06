import Link from "next/link";
import { Gauge, Fuel, Cog, Camera, MessageCircle, CalendarDays } from "lucide-react";
import { publicImageUrl } from "@/lib/format";
import { carTitle, priceLabel, type PublicCard } from "@/lib/public-site";
import { CardPhotos } from "@/components/site/card-photos";
import { ShipsFrom } from "@/components/site/ships-from";
import { FavoriteButton } from "@/components/site/favorite-button";

const NEW_DAYS = 7;

export function CarCard({ c, wa }: { c: PublicCard; wa: string | null }) {
  const href = `/cars/${encodeURIComponent(c.stock_no)}`;
  const price = priceLabel(c);
  const imgs = (c.images?.length ? c.images : c.cover ? [c.cover] : []).map(publicImageUrl);
  // Badges only from the real stock status / listing date
  const badge =
    c.status === "sold" || c.status === "shipped"
      ? { t: "Sold", c: "bg-slate-200 text-slate-800" }
      : c.status === "reserved"
        ? { t: "Reserved", c: "bg-amber-100 text-amber-900" }
        : Date.now() - new Date(c.created_at).getTime() < NEW_DAYS * 864e5
          ? { t: "New arrival", c: "bg-[var(--red)] text-white" }
          : null;
  return (
    // Phones: a compact row (photo left, details right) so several cars fit on one screen; a tall card from sm up.
    <article className="glass-lite glass-hover group flex flex-row overflow-hidden rounded-2xl sm:flex-col">
      <Link href={href} // Phones: a 4:3 frame (the photos' own shape) inset in the row, not stretched to the card's height, so the car isn't cropped
            className="relative my-2 ml-2 block aspect-[4/3] w-[40%] shrink-0 self-center overflow-hidden rounded-xl bg-slate-200 sm:m-0 sm:w-auto sm:self-auto sm:rounded-none" aria-label={`${carTitle(c)} — ${c.stock_no}`}>
        <CardPhotos images={imgs} alt={`${carTitle(c)} ${c.stock_no}`} />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-[#1a1714]/50 to-transparent" />
        <span className="absolute left-1.5 top-1.5 rounded-lg bg-black/55 px-1.5 py-0.5 text-[11px] font-bold text-white backdrop-blur-sm sm:left-2.5 sm:top-2.5 sm:px-2 sm:text-xs">{c.stock_no}</span>
        {c.image_count > 1 && (
          <span className="absolute bottom-1.5 right-1.5 inline-flex items-center gap-1 rounded-lg bg-black/55 px-1.5 py-0.5 text-[11px] font-semibold text-white backdrop-blur-sm sm:bottom-auto sm:right-2.5 sm:top-2.5 sm:px-2 sm:text-xs">
            <Camera className="h-3 w-3" />
            {c.image_count}
          </span>
        )}
        {c.for_parts ? (
          <span className="absolute bottom-2 left-2.5 rounded-lg bg-[var(--accent)] px-2 py-0.5 text-xs font-bold text-white">Parts car</span>
        ) : (
          badge && <span className={`absolute bottom-1.5 left-1.5 rounded-lg px-1.5 py-0.5 text-[11px] font-bold sm:bottom-2.5 sm:left-2.5 sm:px-2 sm:text-xs ${badge.c}`}>{badge.t}</span>
        )}
      </Link>
      <div className="flex min-w-0 flex-1 flex-col p-2.5 sm:p-3.5">
        <Link href={href} className="line-clamp-2 text-sm font-extrabold leading-snug text-white group-hover:text-[var(--accent-text)] sm:line-clamp-1 sm:py-1 sm:text-[15px]">
          {carTitle(c)}
        </Link>
        <div className="hidden h-4 items-center justify-between gap-2 text-xs text-white/60 sm:flex">
          <span className="line-clamp-1">{c.grade ?? ""}</span>
          <ShipsFrom code={c.branch} compact className="shrink-0 text-xs font-semibold text-white/80" />
        </div>
        <dl className="mt-1.5 grid grid-cols-2 gap-x-2 gap-y-1 text-[11px] text-white/75 sm:mt-2.5 sm:gap-y-1.5 sm:text-xs">
          {/* each row is a dt (icon + label for screen readers) and a dd (the value) */}
          <div className="flex min-w-0 items-center gap-1.5">
            <dt className="shrink-0">
              <CalendarDays aria-hidden className="h-3.5 w-3.5 text-brand-600" />
              <span className="sr-only">Year</span>
            </dt>
            <dd className="truncate">{c.year ?? "—"}</dd>
          </div>
          <div className="flex min-w-0 items-center gap-1.5">
            <dt className="shrink-0">
              <Gauge aria-hidden className="h-3.5 w-3.5 text-brand-600" />
              <span className="sr-only">Mileage</span>
            </dt>
            <dd className="truncate">{c.mileage != null ? `${c.mileage.toLocaleString()} km` : "—"}</dd>
          </div>
          <div className="flex min-w-0 items-center gap-1.5">
            <dt className="shrink-0">
              <Cog aria-hidden className="h-3.5 w-3.5 text-brand-600" />
              <span className="sr-only">Engine</span>
            </dt>
            <dd className="truncate">{[c.engine_cc ? `${c.engine_cc.toLocaleString()}cc` : null, c.transmission].filter(Boolean).join(" ") || "—"}</dd>
          </div>
          <div className="flex min-w-0 items-center gap-1.5">
            <dt className="shrink-0">
              <Fuel aria-hidden className="h-3.5 w-3.5 text-brand-600" />
              <span className="sr-only">Fuel</span>
            </dt>
            <dd className="truncate">{c.fuel ?? "—"}</dd>
          </div>
        </dl>
        <div className="mt-auto flex items-end justify-between gap-2 border-t border-white/10 pt-2 sm:mt-3 sm:pt-3">
          <div className="min-w-0">
            <div className="text-[11px] font-bold uppercase tracking-wider text-white/60 sm:text-xs">FOB price</div>
            {price ? <div className="text-lg font-extrabold leading-tight tabular-nums text-[var(--accent)] sm:text-[1.35rem]">{price}</div> : <div className="text-sm font-bold leading-tight text-white/85">Ask for price</div>}
          </div>
          <div className="flex shrink-0 gap-1.5 sm:gap-2">
            <FavoriteButton item={{ kind: "vehicle", id: c.id, stock: c.stock_no, title: carTitle(c), image: imgs[0] ?? null, price }} />
            {wa && (
              <a href={wa} target="_blank" rel="noopener nofollow" className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#25D366]/15 text-emerald-700 ring-1 ring-[#25D366]/40 hover:bg-[#25D366]/25" aria-label={`WhatsApp about ${c.stock_no}`}>
                <MessageCircle className="h-5 w-5" />
              </a>
            )}
            <Link href={href} className="hidden h-11 items-center rounded-xl sm:inline-flex bg-[var(--accent)] px-4 text-sm font-bold text-white shadow-lg shadow-brand-900/30 hover:bg-brand-700">
              Details
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}
