"use client";

import { useRef, useState } from "react";
import { Globe, Play, Pause, RotateCcw, CheckCircle2, AlertTriangle, ImageIcon, Car } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { pool } from "@/lib/images";
import { IconChip } from "@/components/ui";
import { siteListPage, siteStatusTags, importSiteCar, finishSiteImport } from "./actions";

type Phase = "idle" | "scanning" | "importing" | "paused" | "done";
type Counts = { created: number; updated: number; skipped: number; failed: number; photos: number; photoBytes: number };

/** Re-encode a photo as WebP (fallback JPEG), max 1280px — about half the size of the website originals. */
async function compress(blob: Blob): Promise<Blob> {
  try {
    const bmp = await createImageBitmap(blob);
    const scale = Math.min(1, 1280 / Math.max(bmp.width, bmp.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bmp.width * scale);
    canvas.height = Math.round(bmp.height * scale);
    canvas.getContext("2d")!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
    bmp.close();
    const webp = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/webp", 0.78));
    const out = webp && webp.type === "image/webp" ? webp : await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", 0.8));
    return out && out.size < blob.size ? out : blob;
  } catch {
    return blob;
  }
}

export function SiteImporter() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [maxPhotos, setMaxPhotos] = useState(6);
  const [update, setUpdate] = useState(false);
  const [limit, setLimit] = useState(0); // 0 = all
  const [pages, setPages] = useState({ done: 0, total: 0 });
  const [cars, setCars] = useState({ done: 0, total: 0 });
  const [counts, setCounts] = useState<Counts>({ created: 0, updated: 0, skipped: 0, failed: 0, photos: 0, photoBytes: 0 });
  const [log, setLog] = useState<string[]>([]);
  const paused = useRef(false);
  const queue = useRef<string[]>([]);
  const tags = useRef<Record<string, "sold" | "reserved">>({});
  const done = useRef(0);

  const add = (k: keyof Counts, n = 1) => setCounts((c) => ({ ...c, [k]: c[k] + n }));
  const note = (s: string) => setLog((l) => [s, ...l].slice(0, 60));

  async function scan() {
    setPhase("scanning");
    tags.current = await siteStatusTags();
    const first = await siteListPage(1);
    if (first.error) {
      note(`Couldn't open the website: ${first.error}`);
      setPhase("idle");
      return false;
    }
    const total = first.maxPage || 1;
    setPages({ done: 1, total });
    const links = new Set(first.links);
    const rest = Array.from({ length: total - 1 }, (_, i) => i + 2);
    await pool(rest, 4, async (p) => {
      for (let attempt = 0; attempt < 3; attempt++) {
        const r = await siteListPage(p);
        if (!r.error) {
          r.links.forEach((l) => links.add(l));
          break;
        }
        if (attempt === 2) note(`Page ${p} failed: ${r.error}`);
      }
      setPages((x) => ({ ...x, done: x.done + 1 }));
    });
    queue.current = [...links].slice(0, limit > 0 ? limit : undefined);
    done.current = 0;
    setCars({ done: 0, total: queue.current.length });
    return true;
  }

  async function copyPhotos(vehicleId: string, urls: string[], stock: string) {
    const supabase = createClient();
    const pick = maxPhotos > 0 ? urls.slice(0, maxPhotos) : urls;
    await pool(pick, 3, async (u, i) => {
      try {
        const r = await fetch(`/api/site-image?u=${encodeURIComponent(u)}`);
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const body = await compress(await r.blob());
        const ext = body.type === "image/webp" ? "webp" : "jpg";
        const path = `vehicles/${vehicleId}/site-${i}-${Math.random().toString(36).slice(2, 7)}.${ext}`;
        const up = await supabase.storage.from("vehicle-images").upload(path, body, { contentType: body.type || "image/jpeg", cacheControl: "31536000" });
        if (up.error) throw up.error;
        const ins = await supabase.from("vehicle_images").insert({ vehicle_id: vehicleId, path, sort_order: i });
        if (ins.error) {
          await supabase.storage.from("vehicle-images").remove([path]);
          throw ins.error;
        }
        add("photos");
        add("photoBytes", body.size);
      } catch (e) {
        note(`${stock} photo ${i + 1}: ${(e as Error).message}`);
      }
    });
  }

  async function runQueue() {
    setPhase("importing");
    paused.current = false;
    const items = queue.current;
    let next = done.current;
    const worker = async () => {
      while (!paused.current && next < items.length) {
        const url = items[next++];
        const id = url.match(/\/(\d+)$/)?.[1] ?? "";
        const r = await importSiteCar(url, { update, tag: tags.current[id] ?? null });
        add(r.outcome === "created" ? "created" : r.outcome === "updated" ? "updated" : r.outcome === "skipped" ? "skipped" : "failed");
        if (r.error) note(r.error);
        if (r.vehicleId && r.images.length) await copyPhotos(r.vehicleId, r.images, r.stockNo ?? id);
        done.current++;
        setCars((c) => ({ ...c, done: done.current }));
      }
    };
    await Promise.all([worker(), worker(), worker()]);
    if (paused.current) {
      setPhase("paused");
      return;
    }
    await finishSiteImport();
    setPhase("done");
  }

  async function start() {
    setCounts({ created: 0, updated: 0, skipped: 0, failed: 0, photos: 0, photoBytes: 0 });
    setLog([]);
    if (await scan()) await runQueue();
  }

  const pct = (a: number, b: number) => (b ? Math.round((a / b) * 100) : 0);
  const busy = phase === "scanning" || phase === "importing";
  const mb = (counts.photoBytes / 1048576).toFixed(0);
  const perPhoto = counts.photos ? counts.photoBytes / counts.photos : 70_000;
  const estMb = Math.round((cars.total * (maxPhotos || 8) * perPhoto) / 1048576);

  return (
    <div className="space-y-5">
      <section className="card p-5">
        <div className="flex flex-wrap items-start gap-4">
          <IconChip tone="sky">
            <Globe />
          </IconChip>
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-bold text-slate-900">almashriqtrading.site → ERP</h2>
            <p className="mt-0.5 text-sm text-slate-500">
              Copies every car (specs, features, price, Sold/Reserve) and its photos as <b>third-party</b> vehicles shown on the public website. Safe to run again: cars already
              imported are skipped (or updated if you tick the box), and missing photos are filled in.
            </p>
          </div>
        </div>
        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label className="label">Photos per car</label>
            <select className="input" value={maxPhotos} onChange={(e) => setMaxPhotos(Number(e.target.value))} disabled={busy}>
              {[3, 4, 6, 8, 10].map((n) => (
                <option key={n} value={n}>
                  {n} photos
                </option>
              ))}
              <option value={0}>All photos</option>
            </select>
          </div>
          <div>
            <label className="label">How many cars</label>
            <select className="input" value={limit} onChange={(e) => setLimit(Number(e.target.value))} disabled={busy}>
              <option value={10}>Test: first 10 cars</option>
              <option value={100}>First 100 cars</option>
              <option value={0}>All cars</option>
            </select>
          </div>
          <label className="flex items-end gap-2 pb-2 text-sm font-medium text-slate-700">
            <input type="checkbox" className="h-4 w-4 accent-brand-600" checked={update} onChange={(e) => setUpdate(e.target.checked)} disabled={busy} />
            Update cars already imported (price, specs, Sold/Reserve)
          </label>
        </div>
        <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-800">
          Keep this tab open while it runs (about 2–3 seconds per car, roughly an hour for all cars). You can pause and continue. Photos are compressed to about half size; the
          free Supabase plan holds 1 GB of files.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {phase === "idle" || phase === "done" ? (
            <button type="button" className="btn-primary" onClick={start}>
              {phase === "done" ? <RotateCcw className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              {phase === "done" ? "Run again" : "Start import"}
            </button>
          ) : phase === "paused" ? (
            <button type="button" className="btn-primary" onClick={runQueue}>
              <Play className="h-4 w-4" />
              Continue
            </button>
          ) : (
            <button type="button" className="btn-secondary" onClick={() => (paused.current = true)} disabled={phase === "scanning"}>
              <Pause className="h-4 w-4" />
              {phase === "scanning" ? "Reading website…" : "Pause"}
            </button>
          )}
        </div>
      </section>

      {phase !== "idle" && (
        <section className="card p-5">
          <Bar label={`Reading website pages · ${pages.done} / ${pages.total || "…"}`} value={pct(pages.done, pages.total)} grad="from-cerulean-400 to-cerulean-700" />
          <div className="mt-4">
            <Bar label={`Importing cars · ${cars.done} / ${cars.total || "…"}`} value={pct(cars.done, cars.total)} grad="from-rose-500 to-brand-600" />
          </div>
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-5">
            <Count icon={<Car className="h-4 w-4" />} label="New" n={counts.created} tone="text-emerald-600" />
            <Count icon={<RotateCcw className="h-4 w-4" />} label="Updated" n={counts.updated} tone="text-sky-600" />
            <Count icon={<CheckCircle2 className="h-4 w-4" />} label="Already there" n={counts.skipped} tone="text-slate-600" />
            <Count icon={<AlertTriangle className="h-4 w-4" />} label="Failed" n={counts.failed} tone="text-red-600" />
            <Count icon={<ImageIcon className="h-4 w-4" />} label={`Photos · ${mb} MB`} n={counts.photos} tone="text-violet-600" />
          </div>
          {cars.total > 0 && (
            <p className="mt-3 text-xs text-slate-500">
              Estimated photo storage for this run: about <b>{estMb} MB</b>.
            </p>
          )}
          {phase === "done" && (
            <p className="mt-4 flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">
              <CheckCircle2 className="h-4 w-4" /> Import finished. Re-run any time to pick up new cars or fill in failed photos.
            </p>
          )}
          {log.length > 0 && (
            <details className="mt-4" open={phase === "done"}>
              <summary className="cursor-pointer text-xs font-semibold text-slate-500">Messages ({log.length})</summary>
              <ul className="mt-2 max-h-56 space-y-1 overflow-y-auto rounded-xl bg-slate-50 p-3 font-mono text-[11px] text-slate-600">
                {log.map((l, i) => (
                  <li key={i}>{l}</li>
                ))}
              </ul>
            </details>
          )}
        </section>
      )}
    </div>
  );
}

function Bar({ label, value, grad }: { label: string; value: number; grad: string }) {
  return (
    <div>
      <div className="mb-1.5 flex justify-between text-xs font-semibold text-slate-600">
        <span>{label}</span>
        <span>{value}%</span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
        <div className={`h-full rounded-full bg-gradient-to-r ${grad} transition-all`} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

function Count({ icon, label, n, tone }: { icon: React.ReactNode; label: string; n: number; tone: string }) {
  return (
    <div className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-100">
      <div className={`flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide ${tone}`}>
        {icon}
        {label}
      </div>
      <div className="mt-1 text-xl font-bold tabular-nums text-slate-900">{n.toLocaleString()}</div>
    </div>
  );
}
