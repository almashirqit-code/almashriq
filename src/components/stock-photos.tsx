"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { ImagePlus, Star, Trash2, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { pool } from "@/lib/images";
import { publicImageUrl, withThumbs } from "@/lib/format";
import { bucketPaths, uploadStockPhoto, type PhotoTable } from "@/lib/photo-zip";

export type StockPhoto = { id: string; path: string; sort_order: number };

/**
 * Photo gallery editor for parts and machinery (vehicles keep their own ImageManager):
 * add several photos, set the cover (first photo), delete. Writes through the browser
 * client (RLS: admin/manager), then calls `onChanged` so the page can refresh.
 */
export function StockPhotos({
  table,
  ownerId,
  photos: initial,
  canEdit,
  onChanged,
}: {
  table: PhotoTable;
  ownerId: string;
  photos: StockPhoto[];
  canEdit: boolean;
  onChanged?: () => Promise<void> | void;
}) {
  const supabase = useMemo(() => createClient(), []);
  const input = useRef<HTMLInputElement>(null);
  const [photos, setPhotos] = useState(() => [...initial].sort((a, b) => a.sort_order - b.sort_order));
  const [uploading, setUploading] = useState<{ done: number; total: number } | null>(null);
  const [error, setError] = useState("");
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [pending, start] = useTransition();

  async function reload() {
    const { data } = await supabase.from(table.table).select("id, path, sort_order").eq(table.fk, ownerId).order("sort_order").order("created_at");
    setPhotos((data ?? []) as StockPhoto[]);
    await onChanged?.();
  }

  async function onFiles(files: FileList | null) {
    if (!files?.length) return;
    setError("");
    const list = Array.from(files).sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
    const base = photos.length ? Math.max(...photos.map((p) => p.sort_order)) + 1 : 0;
    setUploading({ done: 0, total: list.length });
    let done = 0;
    await pool(list, 3, async (file, idx) => {
      try {
        await uploadStockPhoto(supabase, table, ownerId, file, file.name, base + idx);
      } catch (e) {
        setError((e as Error).message);
      }
      setUploading({ done: ++done, total: list.length });
    });
    setUploading(null);
    if (input.current) input.current.value = "";
    await reload();
  }

  const makeCover = (id: string) =>
    start(async () => {
      const ordered = [id, ...photos.map((p) => p.id).filter((x) => x !== id)];
      await Promise.all(ordered.map((pid, i) => supabase.from(table.table).update({ sort_order: i }).eq("id", pid)));
      await reload();
    });

  const remove = (p: StockPhoto) =>
    start(async () => {
      const { error: e } = await supabase.from(table.table).delete().eq("id", p.id);
      if (e) return setError(e.message);
      const paths = bucketPaths([p.path]);
      if (paths.length) await supabase.storage.from("vehicle-images").remove(withThumbs(paths));
      await reload();
    });

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <span className="label mb-0">
          Photos <span className="text-slate-400">({photos.length})</span>
        </span>
        {canEdit && (
          <>
            <input ref={input} type="file" accept="image/*" multiple className="hidden" onChange={(e) => onFiles(e.target.files)} />
            <button type="button" className="btn-secondary py-1.5 text-xs" onClick={() => input.current?.click()} disabled={!!uploading}>
              <ImagePlus className="h-4 w-4" />
              {uploading ? `${uploading.done}/${uploading.total}` : "Add photos"}
            </button>
          </>
        )}
      </div>
      {error && <p className="mb-2 text-sm text-red-600">{error}</p>}
      {photos.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-200 px-3 py-4 text-center text-sm text-slate-500">No photos yet. The first photo is the cover.</p>
      ) : (
        <div className={`grid grid-cols-3 gap-2 sm:grid-cols-4 ${pending ? "opacity-60" : ""}`}>
          {photos.map((p, i) => (
            <div key={p.id} className="group relative aspect-[4/3] overflow-hidden rounded-lg bg-slate-100">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={publicImageUrl(p.path)} alt="" loading="lazy" className="h-full w-full cursor-zoom-in object-cover" onClick={() => setLightbox(publicImageUrl(p.path))} />
              {i === 0 && <span className="absolute left-1.5 top-1.5 rounded bg-brand-600 px-1.5 py-0.5 text-[10px] font-semibold text-white">COVER</span>}
              {canEdit && (
                <div className="absolute right-1.5 top-1.5 flex gap-1 opacity-0 transition group-hover:opacity-100">
                  {i !== 0 && (
                    <button type="button" title="Set as cover" className="rounded bg-white/90 p-1 text-slate-700 shadow hover:bg-white" onClick={() => makeCover(p.id)}>
                      <Star className="h-3.5 w-3.5" />
                    </button>
                  )}
                  <button type="button" title="Delete photo" className="rounded bg-white/90 p-1 text-red-600 shadow hover:bg-white" onClick={() => confirm("Delete this photo?") && remove(p)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      {lightbox && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4" onClick={() => setLightbox(null)}>
          <button type="button" className="absolute right-4 top-4 text-white" aria-label="Close">
            <X className="h-6 w-6" />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={lightbox} alt="" className="max-h-full max-w-full rounded-lg" />
        </div>
      )}
    </div>
  );
}
