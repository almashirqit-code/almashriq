import Link from "next/link";
import { Gauge, Fuel, Cog, Camera, MessageCircle, CalendarDays } from "lucide-react";
import { publicImageUrl } from "@/lib/format";
import { carTitle, priceLabel, type PublicCard } from "@/lib/public-site";
import { CardPhotos } from "@/components/site/card-photos";

export function CarCard({ c, wa }: { c: PublicCard; wa: string | null }) {
  const href = `/cars/${encodeURIComponent(c.stock_no)}`;
  const price = priceLabel(c);
  const sold = c.status === "sold" || c.status === "shipped";
  const reserved = c.status === "reserved";
  const imgs = (c.images?.length ? c.images : c.cover ? [c.cover] : []).map(publicImageUrl);
  return (
    <article className={`group flex flex-col overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-200 transition hover:shadow-lg hover:ring-navy-300 ${sold ? "opacity-80" : ""}`}>
      <Link href={href} className="relative block aspect-[4/3] overflow-hidden bg-slate-200">
        <CardPhotos images={imgs} alt={`${carTitle(c)} ${c.stock_no}`} dim={sold} />
        <span className="absolute left-2 top-2 rounded bg-navy-900/90 px-1.5 py-0.5 text-[11px] font-bold text-white">{c.stock_no}</span>
        {c.image_count > 1 && (
          <span className="absolute right-2 top-2 inline-flex items-center gap-1 rounded bg-black/55 px-1.5 py-0.5 text-[11px] font-semibold text-white">
            <Camera className="h-3 w-3" />
            {c.image_count}
          </span>
        )}
        {(sold || reserved) && (
          <span className={`absolute inset-x-0 bottom-0 py-1 text-center text-xs font-black uppercase tracking-widest text-white ${sold ? "bg-brand-600/95" : "bg-amber-500/95"}`}>
            {sold ? "Sold" : "Reserved"}
          </span>
        )}
        {c.for_parts && !sold && !reserved && <span className="absolute bottom-2 left-2 rounded bg-brand-600 px-1.5 py-0.5 text-[11px] font-bold text-white">Parts car</span>}
      </Link>
      <div className="flex flex-1 flex-col p-3">
        <Link href={href} className="line-clamp-1 text-[14px] font-extrabold text-navy-900 hover:text-brand-700">
          {carTitle(c)}
        </Link>
        <div className="line-clamp-1 h-4 text-xs text-slate-500">{c.grade ?? ""}</div>
        <dl className="mt-2 grid grid-cols-2 gap-x-2 gap-y-1 text-[11.5px] text-slate-600">
          <div className="flex items-center gap-1 truncate">
            <CalendarDays className="h-3 w-3 shrink-0 text-navy-400" />
            {c.year ?? "—"}
          </div>
          <div className="flex items-center gap-1 truncate">
            <Gauge className="h-3 w-3 shrink-0 text-navy-400" />
            {c.mileage != null ? `${c.mileage.toLocaleString()} km` : "—"}
          </div>
          <div className="flex items-center gap-1 truncate">
            <Cog className="h-3 w-3 shrink-0 text-navy-400" />
            {[c.engine_cc ? `${c.engine_cc.toLocaleString()}cc` : null, c.transmission].filter(Boolean).join(" ") || "—"}
          </div>
          <div className="flex items-center gap-1 truncate">
            <Fuel className="h-3 w-3 shrink-0 text-navy-400" />
            {c.fuel ?? "—"}
          </div>
        </dl>
        <div className="mt-auto flex items-end justify-between gap-2 border-t border-slate-100 pt-2.5 mt-3">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">FOB price</div>
            {price ? <div className="text-lg font-black leading-tight text-brand-600">{price}</div> : <div className="text-sm font-bold text-navy-800">Ask for price</div>}
          </div>
          <div className="flex gap-1.5">
            {wa && !sold && (
              <a href={wa} target="_blank" rel="noreferrer" className="rounded-lg bg-emerald-50 p-2 text-emerald-600 ring-1 ring-emerald-200 hover:bg-emerald-100" aria-label={`WhatsApp about ${c.stock_no}`}>
                <MessageCircle className="h-4 w-4" />
              </a>
            )}
            <Link href={href} className="rounded-lg bg-navy-800 px-3 py-2 text-xs font-bold text-white hover:bg-navy-900">
              Details
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}
