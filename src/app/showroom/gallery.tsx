"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, ImageIcon } from "lucide-react";

export function Gallery({ images, alt, ribbon }: { images: string[]; alt: string; ribbon?: "sold" | "reserved" | null }) {
  const [i, setI] = useState(0);
  if (!images.length)
    return (
      <div className="flex aspect-[4/3] items-center justify-center rounded-3xl bg-gradient-to-br from-slate-100 to-slate-200 text-slate-300">
        <ImageIcon className="h-14 w-14" />
      </div>
    );
  const go = (d: number) => setI((x) => (x + d + images.length) % images.length);
  return (
    <div>
      <div className="relative aspect-[4/3] overflow-hidden rounded-3xl bg-slate-900 shadow-lg">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={images[i]} alt={`${alt} — photo ${i + 1}`} className="h-full w-full object-contain" />
        {images.length > 1 && (
          <>
            <button type="button" onClick={() => go(-1)} aria-label="Previous photo" className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-white/85 p-2 text-slate-800 shadow-lg hover:bg-white">
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button type="button" onClick={() => go(1)} aria-label="Next photo" className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-white/85 p-2 text-slate-800 shadow-lg hover:bg-white">
              <ChevronRight className="h-5 w-5" />
            </button>
            <span className="absolute bottom-3 right-3 rounded-lg bg-black/60 px-2 py-0.5 text-xs font-semibold text-white">
              {i + 1} / {images.length}
            </span>
          </>
        )}
        {ribbon && (
          <span
            className={`absolute right-[-44px] top-6 w-44 rotate-45 py-1.5 text-center text-xs font-black uppercase tracking-widest text-white shadow-lg ${
              ribbon === "sold" ? "bg-gradient-to-r from-rose-600 to-brand-700" : "bg-gradient-to-r from-amber-400 to-orange-500"
            }`}
          >
            {ribbon === "sold" ? "Sold" : "Reserved"}
          </span>
        )}
      </div>
      {images.length > 1 && (
        <div className="mt-3 grid grid-cols-5 gap-2 sm:grid-cols-6">
          {images.map((src, k) => (
            <button
              key={src}
              type="button"
              onClick={() => setI(k)}
              className={`aspect-[4/3] overflow-hidden rounded-xl ring-2 transition ${k === i ? "ring-brand-500" : "ring-transparent opacity-70 hover:opacity-100"}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="" loading="lazy" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
