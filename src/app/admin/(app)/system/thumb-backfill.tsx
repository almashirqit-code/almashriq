"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ImageIcon, Pause, Play } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { pool, uploadThumb } from "@/lib/images";
import { publicImageUrl } from "@/lib/format";

type Status = { total: number; missing: number };

/**
 * Admin → System: creates card thumbnails for photos uploaded before thumbnails existed.
 * Runs in this browser with the admin's own session; safe to pause, close and resume later
 * (it only picks photos that still have no thumbnail).
 */
export function ThumbBackfill() {
  const [status, setStatus] = useState<Status | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [run, setRun] = useState({ done: 0, failed: 0 });
  const stop = useRef(false);

  const refresh = useCallback(async () => {
    const { data, error } = await createClient().rpc("staff_photo_thumbs_status");
    if (error) return setError(error.message);
    const row = (data as { total: number; missing: number }[])?.[0];
    setStatus(row ? { total: Number(row.total), missing: Number(row.missing) } : null);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function start() {
    const supabase = createClient();
    stop.current = false;
    setRunning(true);
    setError(null);
    setRun({ done: 0, failed: 0 });
    let after = "";
    try {
      while (!stop.current) {
        const { data, error } = await supabase.rpc("staff_photo_thumbs_missing", { p_after: after, p_limit: 40 });
        if (error) throw new Error(error.message);
        const paths = ((data as { path: string }[]) ?? []).map((r) => r.path);
        if (!paths.length) break;
        after = paths[paths.length - 1];
        await pool(paths, 4, async (path) => {
          if (stop.current) return;
          let ok = false;
          try {
            const res = await fetch(publicImageUrl(path));
            if (res.ok) ok = await uploadThumb(supabase, path, await res.blob());
          } catch {
            ok = false;
          }
          setRun((r) => (ok ? { ...r, done: r.done + 1 } : { ...r, failed: r.failed + 1 }));
          if (ok) setStatus((s) => (s ? { ...s, missing: Math.max(0, s.missing - 1) } : s));
        });
      }
    } catch (e) {
      setError((e as Error).message);
    }
    setRunning(false);
    refresh();
  }

  const pct = status && status.total ? Math.round(((status.total - status.missing) / status.total) * 100) : 0;

  return (
    <section className="card px-5 py-4 text-sm">
      <h2 className="card-title mb-2">
        <ImageIcon className="h-4 w-4" />
        Photo thumbnails for cards
      </h2>
      <p className="text-slate-600">
        Stock lists show a small copy of each photo (about 30 KB instead of 120 KB), so pages load faster on phones. New uploads get one automatically; this creates
        them for older photos. It runs in this browser, so keep this tab open — you can pause and continue later.
      </p>
      {status && (
        <div className="mt-3">
          <div className="flex justify-between text-xs font-semibold text-slate-600">
            <span>
              {(status.total - status.missing).toLocaleString()} of {status.total.toLocaleString()} photos have a thumbnail
            </span>
            <span>{pct}%</span>
          </div>
          <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${pct}%` }} />
          </div>
        </div>
      )}
      {(running || run.done + run.failed > 0) && (
        <div className="mt-2 text-xs text-slate-500">
          This run: {run.done.toLocaleString()} created{run.failed ? ` · ${run.failed.toLocaleString()} failed (photo missing or unreadable; cards keep the full photo)` : ""}
        </div>
      )}
      {error && <div className="mt-2 text-xs font-semibold text-red-700">{error}</div>}
      <div className="mt-3">
        {running ? (
          <button type="button" className="btn-secondary" onClick={() => (stop.current = true)}>
            <Pause className="h-4 w-4" /> Pause
          </button>
        ) : (
          <button type="button" className="btn-primary" onClick={start} disabled={!status || status.missing === 0}>
            <Play className="h-4 w-4" /> {status?.missing === 0 ? "All thumbnails created" : "Create missing thumbnails"}
          </button>
        )}
      </div>
    </section>
  );
}
