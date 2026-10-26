"use client";

import { useEffect, useRef, useState } from "react";
import { ImageIcon } from "lucide-react";
import { thumbUrl } from "@/lib/format";

/**
 * Card photo that rotates through the car's first photos:
 * slowly on its own while visible, quickly while hovered.
 */
export function CardPhotos({ images, alt }: { images: string[]; alt: string }) {
  const [i, setI] = useState(0);
  const [hover, setHover] = useState(false);
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { threshold: 0.4 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // A thumbnail that failed before React took over never fired onError: swap those to the full photo now.
  useEffect(() => {
    ref.current?.querySelectorAll<HTMLImageElement>("img[data-full]").forEach((img) => {
      if (img.complete && img.naturalWidth === 0 && img.dataset.full && img.src !== img.dataset.full) img.src = img.dataset.full;
    });
  }, []);

  useEffect(() => {
    if (images.length < 2 || (!visible && !hover)) return;
    // Stagger cards so they don't all change at once.
    const base = hover ? 900 : 3200 + (alt.length % 7) * 350;
    const t = setInterval(() => setI((x) => (x + 1) % images.length), base);
    return () => clearInterval(t);
  }, [images.length, visible, hover, alt.length]);

  if (!images.length)
    return (
      <div ref={ref} className="flex h-full items-center justify-center text-slate-300">
        <ImageIcon className="h-10 w-10" />
      </div>
    );

  return (
    <div ref={ref} className="relative h-full w-full" onMouseEnter={() => setHover(true)} onMouseLeave={() => (setHover(false), setI(0))}>
      {images.map((src, k) =>
        // Only mount the current and next photo, so a long list doesn't download everything.
        k === i || k === (i + 1) % images.length ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={src}
            // The small card thumbnail; if it hasn't been made yet, switch to the full photo once.
            src={thumbUrl(src)}
            data-full={src}
            onError={(e) => {
              if (e.currentTarget.src !== src) e.currentTarget.src = src;
            }}
            // Every photo gets a description; the faded-out one is hidden from screen readers.
            alt={k === 0 ? alt : `${alt} — photo ${k + 1}`}
            aria-hidden={k !== i}
            loading="lazy"
            decoding="async"
            className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ${k === i ? "opacity-100" : "opacity-0"}`}
          />
        ) : null
      )}
      {images.length > 1 && (
        <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-1">
          {images.map((src, k) => (
            <span key={src} className={`h-1.5 rounded-full transition-all ${k === i ? "w-4 bg-white" : "w-1.5 bg-white/60"}`} />
          ))}
        </div>
      )}
    </div>
  );
}
