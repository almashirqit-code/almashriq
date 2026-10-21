import Link from "next/link";
import { ImageIcon, Gauge, Fuel, Cog, Camera, MessageCircle } from "lucide-react";
import { publicImageUrl } from "@/lib/format";
import { carTitle, priceLabel, type PublicCard } from "@/lib/public-site";

export function CarCard({ c, base, wa }: { c: PublicCard; base: string; wa: string | null }) {
  const href = `${base}/cars/${encodeURIComponent(c.stock_no)}`;
  const price = priceLabel(c);
  const sold = c.status === "sold";
  const reserved = c.status === "reserved";
  return (
    <div className={`group flex flex-col overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200/80 transition hover:-translate-y-1 hover:shadow-xl ${sold ? "opacity-80" : ""}`}>
      <Link href={href} className="relative block aspect-[4/3] overflow-hidden bg-gradient-to-br from-slate-100 to-slate-200">
        {c.cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={publicImageUrl(c.cover)} alt={carTitle(c)} loading="lazy" className={`h-full w-full object-cover transition duration-500 group-hover:scale-105 ${sold ? "grayscale-[40%]" : ""}`} />
        ) : (
          <div className="flex h-full items-center justify-center text-slate-300">
            <ImageIcon className="h-10 w-10" />
          </div>
        )}
        <span className="absolute left-3 top-3 rounded-lg bg-white/95 px-2 py-1 text-[11px] font-bold text-slate-800 shadow">{c.stock_no}</span>
        {c.image_count > 1 && (
          <span className="absolute bottom-3 right-3 inline-flex items-center gap-1 rounded-lg bg-black/55 px-2 py-0.5 text-[11px] font-semibold text-white backdrop-blur">
            <Camera className="h-3 w-3" />
            {c.image_count}
          </span>
        )}
        {(sold || reserved) && (
          <span
            className={`absolute right-[-38px] top-4 w-36 rotate-45 py-1 text-center text-[11px] font-black uppercase tracking-widest text-white shadow-lg ${
              sold ? "bg-gradient-to-r from-rose-600 to-brand-700" : "bg-gradient-to-r from-amber-400 to-orange-500"
            }`}
          >
            {sold ? "Sold" : "Reserved"}
          </span>
        )}
        {c.for_parts && <span className="absolute bottom-3 left-3 rounded-lg bg-rose-600 px-2 py-0.5 text-[11px] font-bold text-white">Parts car</span>}
      </Link>
      <div className="flex flex-1 flex-col p-4">
        <Link href={href} className="line-clamp-1 text-[15px] font-extrabold tracking-tight text-slate-900 hover:text-brand-700">
          {carTitle(c)}
        </Link>
        {c.grade && <div className="line-clamp-1 text-xs text-slate-500">{c.grade}</div>}
        <div className="mt-3 grid grid-cols-3 gap-1.5 text-[11px] text-slate-600">
          <span className="inline-flex items-center gap-1 truncate rounded-lg bg-slate-50 px-1.5 py-1">
            <Gauge className="h-3 w-3 shrink-0 text-rose-500" />
            {c.mileage != null ? `${c.mileage.toLocaleString()} km` : "—"}
          </span>
          <span className="inline-flex items-center gap-1 truncate rounded-lg bg-slate-50 px-1.5 py-1">
            <Cog className="h-3 w-3 shrink-0 text-violet-500" />
            {[c.engine_cc ? `${c.engine_cc.toLocaleString()}cc` : null, c.transmission].filter(Boolean).join(" ") || "—"}
          </span>
          <span className="inline-flex items-center gap-1 truncate rounded-lg bg-slate-50 px-1.5 py-1">
            <Fuel className="h-3 w-3 shrink-0 text-sky-500" />
            {c.fuel ?? "—"}
          </span>
        </div>
        <div className="mt-auto flex items-end justify-between gap-2 pt-4">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">FOB price</div>
            {price ? <div className="text-lg font-black text-brand-700">{price}</div> : <div className="text-sm font-bold text-slate-700">Ask for price</div>}
          </div>
          <div className="flex gap-1.5">
            {wa && !sold && (
              <a href={wa} target="_blank" rel="noreferrer" className="rounded-xl bg-emerald-50 p-2 text-emerald-600 ring-1 ring-emerald-200 hover:bg-emerald-100" aria-label="WhatsApp">
                <MessageCircle className="h-4 w-4" />
              </a>
            )}
            <Link href={href} className="rounded-xl bg-gradient-to-r from-brand-600 to-rose-500 px-3 py-2 text-xs font-bold text-white shadow-sm hover:shadow-md">
              Details
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
