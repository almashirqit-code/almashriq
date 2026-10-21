"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

/** Horizontal row with previous/next controls while content overflows. */
export function HScrollRow({ children, className = "hscroll" }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);

  const update = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    const overflow = scrollWidth > clientWidth + 4;
    setCanPrev(overflow && scrollLeft > 4);
    setCanNext(overflow && scrollLeft + clientWidth < scrollWidth - 4);
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    update();
    el.addEventListener("scroll", update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    window.addEventListener("resize", update);
    return () => {
      el.removeEventListener("scroll", update);
      ro.disconnect();
      window.removeEventListener("resize", update);
    };
  }, [update, children]);

  const scrollBy = (dir: -1 | 1) => {
    const el = ref.current;
    if (el) el.scrollBy({ left: dir * Math.min(280, el.clientWidth * 0.75), behavior: "smooth" });
  };

  return (
    <div className="relative">
      <div ref={ref} className={className}>{children}</div>
      {(canPrev || canNext) && (
        <>
          <button type="button" aria-label="Scroll previous" disabled={!canPrev} onClick={() => scrollBy(-1)} className="absolute left-0 top-1/2 z-10 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-black/45 text-white backdrop-blur enabled:hover:bg-black/65 disabled:opacity-30 sm:flex lg:hidden">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button type="button" aria-label="Scroll next" disabled={!canNext} onClick={() => scrollBy(1)} className="absolute right-0 top-1/2 z-10 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-black/45 text-white backdrop-blur enabled:hover:bg-black/65 disabled:opacity-30 sm:flex lg:hidden">
            <ChevronRight className="h-5 w-5" />
          </button>
        </>
      )}
    </div>
  );
}
