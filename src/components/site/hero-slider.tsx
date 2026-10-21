"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

export type Slide = { image: string | null; title: string; subtitle: string; href: string; tag?: string };

/** Auto-rotating hero banner built from featured cars. Swipe on phones, arrows on larger screens. */
export function HeroSlider({ slides }: { slides: Slide[] }) {
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const touch = useRef<{ x: number; y: number } | null>(null);
  useEffect(() => {
    if (slides.length < 2 || paused) return;
    const t = setInterval(() => setI((x) => (x + 1) % slides.length), 5000);
    return () => clearInterval(t);
  }, [slides.length, paused]);
  if (!slides.length) return null;
  const go = (d: number) => setI((x) => (x + d + slides.length) % slides.length);

  return (
    <div
      className="glass-lite relative aspect-[4/3] w-full overflow-hidden rounded-3xl sm:aspect-[16/10] lg:aspect-auto lg:h-full lg:min-h-[24rem]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={(e) => {
        setPaused(true);
        touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      }}
      onTouchEnd={(e) => {
        const s = touch.current;
        touch.current = null;
        if (!s) return;
        const dx = e.changedTouches[0].clientX - s.x;
        const dy = e.changedTouches[0].clientY - s.y;
        if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.5) go(dx < 0 ? 1 : -1);
      }}
    >
      {slides.map((s, k) => (
        <Link
          key={k}
          href={s.href}
          className={`absolute inset-0 transition-opacity duration-700 ${k === i ? "opacity-100" : "pointer-events-none opacity-0"}`}
          aria-hidden={k !== i}
          tabIndex={k === i ? 0 : -1}
        >
          {s.image && (
            <>
              {/* Blurred copy fills the frame; the real photo is shown whole (no cropping). */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={s.image} alt="" aria-hidden className="absolute inset-0 h-full w-full scale-110 object-cover opacity-60 blur-2xl" loading={k === 0 ? "eager" : "lazy"} />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={s.image} alt={s.title} className="relative h-full w-full object-contain" loading={k === 0 ? "eager" : "lazy"} fetchPriority={k === 0 ? "high" : "auto"} />
            </>
          )}
          <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-[#0a0a0c]/90 via-[#0a0a0c]/35 to-transparent" />
          {/* glass title panel */}
          <div className="absolute inset-x-2.5 bottom-2.5 rounded-2xl border border-white/15 bg-black/35 px-3.5 py-2.5 text-white backdrop-blur-md sm:inset-x-5 sm:bottom-5 sm:p-5">
            <div className="flex items-center gap-2">
              {s.tag && <span className="hidden shrink-0 rounded-md bg-[var(--accent)] px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider sm:inline sm:text-[11px]">{s.tag}</span>}
              <div className="line-clamp-1 text-base font-black leading-tight tracking-tight sm:text-3xl sm:line-clamp-2">{s.title}</div>
            </div>
            <div className="mt-0.5 line-clamp-1 text-xs text-white/80 sm:text-sm">{s.subtitle}</div>
          </div>
        </Link>
      ))}
      {slides.length > 1 && (
        <>
          <button type="button" aria-label="Previous" onClick={() => go(-1)} className="absolute left-3 top-1/2 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-black/35 text-white backdrop-blur hover:bg-black/55 sm:flex">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button type="button" aria-label="Next" onClick={() => go(1)} className="absolute right-3 top-1/2 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-black/35 text-white backdrop-blur hover:bg-black/55 sm:flex">
            <ChevronRight className="h-5 w-5" />
          </button>
          <div className="absolute right-4 top-4 flex gap-1.5">
            {slides.map((_, k) => (
              <button key={k} type="button" aria-label={`Slide ${k + 1}`} onClick={() => setI(k)} className="flex h-6 items-center">
                <span className={`block h-1.5 rounded-full transition-all ${k === i ? "w-6 bg-white" : "w-1.5 bg-white/55"}`} />
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
