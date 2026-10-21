import Link from "next/link";
import { Gauge, Fuel, Cog, Camera, MessageCircle, CalendarDays } from "lucide-react";
import { publicImageUrl } from "@/lib/format";
import { carTitle, priceLabel, type PublicCard } from "@/lib/public-site";
import { CardPhotos } from "@/components/site/card-photos";
import { ShipsFrom } from "@/components/site/ships-from";

export function CarCard({ c, wa }: { c: PublicCard; wa: string | null }) {
  const href = `/cars/${encodeURIComponent(c.stock_no)}`;
  const price = priceLabel(c);
  const sold = c.status === "sold" || c.status === "shipped";
  const reserved = c.status === "reserved";
  const imgs = (c.images?.length ? c.images : c.cover ? [c.cover] : []).map(publicImageUrl);
  return (
    <article className={`glass-lite glass-hover group flex flex-col overflow-hidden rounded-2xl ${sold ? "opacity-80" : ""}`}>
      <Link href={href} className="relative block aspect-[4/3] overflow-hidden bg-black/20" aria-label={`${carTitle(c)} — ${c.stock_no}`}>
        <CardPhotos images={imgs} alt={`${carTitle(c)} ${c.stock_no}`} dim={sold} />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[#0a0a0c]/70 to-transparent" />
        <span className="absolute left-2.5 top-2.5 rounded-lg bg-black/55 px-2 py-0.5 text-xs font-bold text-white backdrop-blur-sm">{c.stock_no}</span>
        {c.image_count > 1 && (
          <span className="absolute right-2.5 top-2.5 inline-flex items-center gap-1 rounded-lg bg-black/55 px-2 py-0.5 text-xs font-semibold text-white backdrop-blur-sm">
            <Camera className="h-3 w-3" />
            {c.image_count}
          </span>
        )}
        {(sold || reserved) && (
          <span className={`absolute inset-x-0 bottom-0 py-1 text-center text-xs font-black uppercase tracking-widest text-white ${sold ? "bg-[var(--accent)]/95" : "bg-amber-500/95"}`}>
            {sold ? "Sold" : "Reserved"}
          </span>
        )}
        {c.for_parts && !sold && !reserved && <span className="absolute bottom-2 left-2.5 rounded-lg bg-[var(--accent)] px-2 py-0.5 text-xs font-bold text-white">Parts car</span>}
      </Link>
      <div className="flex flex-1 flex-col p-3.5">
        <Link href={href} className="line-clamp-1 py-1 text-[15px] font-extrabold text-white group-hover:text-[var(--accent-text)]">
          {carTitle(c)}
        </Link>
        <div className="flex h-4 items-center justify-between gap-2 text-xs text-white/60">
          <span className="line-clamp-1">{c.grade ?? ""}</span>
          <ShipsFrom code={c.branch} compact className="shrink-0 text-xs font-semibold text-white/80" />
        </div>
        <dl className="mt-2.5 grid grid-cols-2 gap-x-2 gap-y-1.5 text-xs text-white/75">
          <div className="flex items-center gap-1.5 truncate">
            <CalendarDays className="h-3.5 w-3.5 shrink-0 text-rose-300" />
            {c.year ?? "—"}
          </div>
          <div className="flex items-center gap-1.5 truncate">
            <Gauge className="h-3.5 w-3.5 shrink-0 text-rose-300" />
            {c.mileage != null ? `${c.mileage.toLocaleString()} km` : "—"}
          </div>
          <div className="flex items-center gap-1.5 truncate">
            <Cog className="h-3.5 w-3.5 shrink-0 text-rose-300" />
            {[c.engine_cc ? `${c.engine_cc.toLocaleString()}cc` : null, c.transmission].filter(Boolean).join(" ") || "—"}
          </div>
          <div className="flex items-center gap-1.5 truncate">
            <Fuel className="h-3.5 w-3.5 shrink-0 text-rose-300" />
            {c.fuel ?? "—"}
          </div>
        </dl>
        <div className="mt-3 flex items-end justify-between gap-2 border-t border-white/10 pt-3">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-white/60">FOB price</div>
            {price ? <div className="text-xl font-black leading-tight text-white">{price}</div> : <div className="text-sm font-bold text-white/85">Ask for price</div>}
          </div>
          <div className="flex gap-2">
            {wa && !sold && (
              <a href={wa} target="_blank" rel="noreferrer" className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#25D366]/15 text-[#4ADE80] ring-1 ring-[#25D366]/40 hover:bg-[#25D366]/25" aria-label={`WhatsApp about ${c.stock_no}`}>
                <MessageCircle className="h-5 w-5" />
              </a>
            )}
            <Link href={href} className="inline-flex h-11 items-center rounded-xl bg-[var(--accent)] px-4 text-sm font-bold text-white shadow-lg shadow-brand-900/30 hover:bg-brand-700">
              Details
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}
