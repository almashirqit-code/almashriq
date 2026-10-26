"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, ImageIcon, Download, Pause, Play, Archive } from "lucide-react";

const fileName = (base: string, k: number, src: string) => `${base}-${String(k + 1).padStart(2, "0")}.${(src.split("?")[0].match(/\.(\w+)$/)?.[1] ?? "jpg").toLowerCase()}`;

async function saveBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/** Photo gallery: swipe on phones, arrows on larger screens, auto-play, thumbnails, and downloads (one photo or all as a ZIP). */
export function Gallery({ images, alt, stockNo }: { images: string[]; alt: string; stockNo: string }) {
  const [i, setI] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [hover, setHover] = useState(false);
  const [zipping, setZipping] = useState<number | null>(null);
  const touch = useRef<{ x: number; y: number } | null>(null);
  const thumbs = useRef<HTMLDivElement>(null);
  const root = useRef<HTMLDivElement>(null);
  const [onScreen, setOnScreen] = useState(true);

  // Auto-play only while the gallery is visible (no work, and no jumps, once the visitor scrolls past it).
  useEffect(() => {
    const el = root.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([e]) => setOnScreen(e.isIntersecting), { threshold: 0.25 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (images.length < 2 || !playing || hover || !onScreen) return;
    const t = setInterval(() => setI((x) => (x + 1) % images.length), 3500);
    return () => clearInterval(t);
  }, [images.length, playing, hover, onScreen]);

  // Keep the active thumbnail in view by scrolling the thumbnail strip sideways only.
  // (scrollIntoView would also scroll the page and pull a reader back up to the gallery.)
  useEffect(() => {
    const strip = thumbs.current;
    const el = strip?.children[i] as HTMLElement | undefined;
    if (!strip || !el) return;
    const delta = el.getBoundingClientRect().left - strip.getBoundingClientRect().left;
    strip.scrollTo({ left: strip.scrollLeft + delta - (strip.clientWidth - el.clientWidth) / 2, behavior: "smooth" });
  }, [i]);

  if (!images.length)
    return (
      <div className="glass-lite flex aspect-[4/3] items-center justify-center rounded-3xl text-white/25">
        <ImageIcon className="h-14 w-14" />
      </div>
    );
  const go = (d: number) => setI((x) => (x + d + images.length) % images.length);
  const base = stockNo.replace(/[^\w-]+/g, "_");

  async function downloadOne() {
    try {
      const blob = await (await fetch(images[i])).blob();
      await saveBlob(blob, fileName(base, i, images[i]));
    } catch {
      window.open(images[i], "_blank");
    }
  }

  async function downloadAll() {
    setZipping(0);
    try {
      const { default: JSZip } = await import("jszip");
      const zip = new JSZip();
      for (let k = 0; k < images.length; k++) {
        const blob = await (await fetch(images[k])).blob();
        zip.file(fileName(base, k, images[k]), blob);
        setZipping(k + 1);
      }
      await saveBlob(await zip.generateAsync({ type: "blob" }), `${base}-photos.zip`);
    } catch {
      alert("Download failed — please try again.");
    } finally {
      setZipping(null);
    }
  }

  return (
    <div ref={root}>
      <div
        className="glass-lite group relative aspect-[4/3] touch-pan-y overflow-hidden rounded-3xl bg-black/30"
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        onTouchStart={(e) => {
          setPlaying(false);
          touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        }}
        onTouchEnd={(e) => {
          const s = touch.current;
          touch.current = null;
          if (!s) return;
          const dx = e.changedTouches[0].clientX - s.x;
          const dy = e.changedTouches[0].clientY - s.y;
          if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.4) go(dx < 0 ? 1 : -1);
        }}
      >
        {images.map((src, k) =>
          Math.abs(k - i) <= 1 || (i === 0 && k === images.length - 1) ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={src}
              src={src}
              alt={`${alt} — photo ${k + 1}`}
              className={`absolute inset-0 h-full w-full object-contain transition-opacity duration-500 ${k === i ? "opacity-100" : "opacity-0"}`}
              loading={k === 0 ? "eager" : "lazy"}
              fetchPriority={k === 0 ? "high" : "auto"}
              draggable={false}
            />
          ) : null
        )}
        {images.length > 1 && (
          <>
            <button type="button" onClick={() => go(-1)} aria-label="Previous photo" className="absolute left-3 top-1/2 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-black/40 text-white backdrop-blur hover:bg-black/60 sm:flex">
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button type="button" onClick={() => go(1)} aria-label="Next photo" className="absolute right-3 top-1/2 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-black/40 text-white backdrop-blur hover:bg-black/60 sm:flex">
              <ChevronRight className="h-5 w-5" />
            </button>
          </>
        )}
        <div className="absolute inset-x-3 bottom-3 flex items-center justify-between gap-2">
          {images.length > 1 ? (
            <button type="button" onClick={() => setPlaying((p) => !p)} className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-black/55 px-3 text-xs font-semibold text-white backdrop-blur" aria-label={playing ? "Pause slideshow" : "Play slideshow"}>
              {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
              {i + 1} / {images.length}
            </button>
          ) : (
            <span />
          )}
          <button type="button" onClick={downloadOne} className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-black/55 px-3 text-xs font-semibold text-white backdrop-blur hover:bg-black/75" aria-label="Download this photo">
            <Download className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Download photo</span>
          </button>
        </div>
      </div>

      {images.length > 1 && (
        <div ref={thumbs} className="hscroll mt-3 !gap-2 lg:grid lg:grid-cols-6 lg:overflow-visible">
          {images.map((src, k) => (
            <button
              key={src}
              type="button"
              onClick={() => (setI(k), setPlaying(false))}
              className={`aspect-[4/3] w-[4.5rem] overflow-hidden rounded-xl ring-2 transition sm:w-24 lg:w-auto ${k === i ? "ring-[var(--accent)]" : "opacity-70 ring-transparent hover:opacity-100"}`}
              aria-label={`Photo ${k + 1}`}
              aria-current={k === i}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="" loading="lazy" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
      {images.length > 1 && (
        <button
          type="button"
          onClick={downloadAll}
          disabled={zipping !== null}
          className="glass-lite mt-3 inline-flex min-h-11 items-center gap-2 rounded-xl px-4 text-sm font-bold hover:bg-white/15 disabled:opacity-60"
        >
          <Archive className="h-4 w-4" />
          {zipping !== null ? `Preparing… ${zipping}/${images.length}` : `Download all ${images.length} photos (ZIP)`}
        </button>
      )}
    </div>
  );
}
