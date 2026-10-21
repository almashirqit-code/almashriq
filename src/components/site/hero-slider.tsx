"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

export type Slide = { image: string | null; title: string; subtitle: string; href: string; tag?: string };

/** Auto-rotating hero banner built from featured cars. */
export function HeroSlider({ slides }: { slides: Slide[] }) {
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    if (slides.length < 2 || paused) return;
    const t = setInterval(() => setI((x) => (x + 1) % slides.length), 5000);
    return () => clearInterval(t);
  }, [slides.length, paused]);
  if (!slides.length) return null;
  const go = (d: number) => setI((x) => (x + d + slides.length) % slides.length);

  return (
    <div className="relative aspect-[4/3] w-full overflow-hidden rounded-3xl bg-navy-900 sm:aspect-[16/10] lg:aspect-auto lg:h-full lg:min-h-[24rem]" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
      {slides.map((s, k) => (
        <Link
          key={k}
          href={s.href}
          className={`absolute inset-0 transition-opacity duration-1000 ${k === i ? "opacity-100" : "pointer-events-none opacity-0"}`}
          aria-hidden={k !== i}
          tabIndex={k === i ? 0 : -1}
        >
          {s.image && (
            <>
              {/* Blurred copy fills the frame; the real photo is shown whole (no cropping). */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={s.image} alt="" aria-hidden className="absolute inset-0 h-full w-full scale-110 object-cover opacity-60 blur-2xl" loading={k === 0 ? "eager" : "lazy"} />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={s.image} alt={s.title} className="relative h-full w-full object-contain" loading={k === 0 ? "eager" : "lazy"} />
            </>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-navy-950/90 via-navy-950/30 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 p-6 text-white sm:p-8">
            {s.tag && <span className="mb-2 inline-block rounded-md bg-brand-600 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider">{s.tag}</span>}
            <div className="text-2xl font-black tracking-tight sm:text-3xl">{s.title}</div>
            <div className="mt-1 text-sm text-white/80">{s.subtitle}</div>
          </div>
        </Link>
      ))}
      {slides.length > 1 && (
        <>
          <button type="button" aria-label="Previous" onClick={() => go(-1)} className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-white/80 p-2 text-navy-900 shadow hover:bg-white">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button type="button" aria-label="Next" onClick={() => go(1)} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-white/80 p-2 text-navy-900 shadow hover:bg-white">
            <ChevronRight className="h-5 w-5" />
          </button>
          <div className="absolute right-5 top-5 flex gap-1.5">
            {slides.map((_, k) => (
              <button key={k} type="button" aria-label={`Slide ${k + 1}`} onClick={() => setI(k)} className={`h-2 rounded-full transition-all ${k === i ? "w-6 bg-white" : "w-2 bg-white/50"}`} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
