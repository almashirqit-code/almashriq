"use client";

import { useEffect, useState } from "react";
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

/** Car photo gallery: auto-play, thumbnails, and direct downloads (one photo or all as a ZIP). */
export function Gallery({ images, alt, ribbon, stockNo }: { images: string[]; alt: string; ribbon?: "sold" | "reserved" | null; stockNo: string }) {
  const [i, setI] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [hover, setHover] = useState(false);
  const [zipping, setZipping] = useState<number | null>(null);

  useEffect(() => {
    if (images.length < 2 || !playing || hover) return;
    const t = setInterval(() => setI((x) => (x + 1) % images.length), 3500);
    return () => clearInterval(t);
  }, [images.length, playing, hover]);

  if (!images.length)
    return (
      <div className="flex aspect-[4/3] items-center justify-center rounded-3xl bg-gradient-to-br from-slate-100 to-slate-200 text-slate-300">
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
    <div>
      <div className="group relative aspect-[4/3] overflow-hidden rounded-3xl bg-navy-950 shadow-lg" onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>
        {images.map((src, k) =>
          Math.abs(k - i) <= 1 || (i === 0 && k === images.length - 1) ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={src}
              src={src}
              alt={`${alt} — photo ${k + 1}`}
              className={`absolute inset-0 h-full w-full object-contain transition-opacity duration-500 ${k === i ? "opacity-100" : "opacity-0"}`}
              loading={k === 0 ? "eager" : "lazy"}
            />
          ) : null
        )}
        {images.length > 1 && (
          <>
            <button type="button" onClick={() => go(-1)} aria-label="Previous photo" className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-white/85 p-2 text-navy-900 shadow-lg hover:bg-white">
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button type="button" onClick={() => go(1)} aria-label="Next photo" className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-white/85 p-2 text-navy-900 shadow-lg hover:bg-white">
              <ChevronRight className="h-5 w-5" />
            </button>
          </>
        )}
        <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between gap-2">
          {images.length > 1 ? (
            <button type="button" onClick={() => setPlaying((p) => !p)} className="inline-flex items-center gap-1 rounded-lg bg-black/60 px-2 py-1 text-xs font-semibold text-white backdrop-blur">
              {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
              {i + 1} / {images.length}
            </button>
          ) : (
            <span />
          )}
          <button type="button" onClick={downloadOne} className="inline-flex items-center gap-1 rounded-lg bg-black/60 px-2 py-1 text-xs font-semibold text-white backdrop-blur hover:bg-black/75">
            <Download className="h-3.5 w-3.5" />
            Download photo
          </button>
        </div>
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
      <div className="mt-3 flex items-start gap-2">
        <div className="grid flex-1 grid-cols-5 gap-2 sm:grid-cols-6">
          {images.map((src, k) => (
            <button
              key={src}
              type="button"
              onClick={() => (setI(k), setPlaying(false))}
              className={`aspect-[4/3] overflow-hidden rounded-xl ring-2 transition ${k === i ? "ring-brand-500" : "ring-transparent opacity-70 hover:opacity-100"}`}
              aria-label={`Photo ${k + 1}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="" loading="lazy" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      </div>
      {images.length > 1 && (
        <button
          type="button"
          onClick={downloadAll}
          disabled={zipping !== null}
          className="mt-3 inline-flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-sm font-bold text-navy-800 shadow-sm ring-1 ring-slate-200 hover:bg-navy-50 disabled:opacity-60"
        >
          <Archive className="h-4 w-4" />
          {zipping !== null ? `Preparing… ${zipping}/${images.length}` : `Download all ${images.length} photos (ZIP)`}
        </button>
      )}
    </div>
  );
}
