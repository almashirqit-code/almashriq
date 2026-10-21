"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ImagePlus, Star, Trash2, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { uploadVehicleImage, pool } from "@/lib/images";
import { publicImageUrl } from "@/lib/format";
import { useT } from "@/lib/i18n/client";
import type { VehicleImage } from "@/lib/types";
import { deleteImage, setCoverImage, refreshVehicle } from "../actions";

export function ImageManager({
  vehicleId,
  images,
  canEdit,
}: {
  vehicleId: string;
  images: VehicleImage[];
  canEdit: boolean;
}) {
  const { t } = useT();
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState<{ done: number; total: number } | null>(null);
  const [error, setError] = useState("");
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [pending, start] = useTransition();

  async function onFiles(files: FileList | null) {
    if (!files?.length) return;
    setError("");
    const list = Array.from(files).sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
    const supabase = createClient();
    const base = images.length ? Math.max(...images.map((i) => i.sort_order)) + 1 : 0;
    setUploading({ done: 0, total: list.length });
    let done = 0;
    await pool(list, 3, async (file, idx) => {
      try {
        await uploadVehicleImage(supabase, vehicleId, file, file.name, base + idx);
      } catch (e) {
        setError((e as Error).message);
      }
      setUploading({ done: ++done, total: list.length });
    });
    setUploading(null);
    if (input.current) input.current.value = "";
    await refreshVehicle(vehicleId);
    router.refresh();
  }

  return (
    <section className="card">
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
        <h2 className="text-sm font-semibold">
          {t("stock_images")} <span className="text-slate-400">({images.length})</span>
        </h2>
        {canEdit && (
          <>
            <input
              ref={input}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => onFiles(e.target.files)}
            />
            <button className="btn-secondary" onClick={() => input.current?.click()} disabled={!!uploading}>
              <ImagePlus className="h-4 w-4" />
              {uploading ? `${uploading.done}/${uploading.total}` : t("stock_upload_images")}
            </button>
          </>
        )}
      </div>
      <div className="p-5">
        {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
        {images.length === 0 ? (
          <p className="text-sm text-slate-500">{t("stock_no_images")}</p>
        ) : (
          <div className={`grid grid-cols-2 gap-3 sm:grid-cols-3 ${pending ? "opacity-60" : ""}`}>
            {images.map((img, i) => (
              <div key={img.id} className="group relative aspect-[4/3] overflow-hidden rounded-lg bg-slate-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={publicImageUrl(img.path)}
                  alt=""
                  loading="lazy"
                  className="h-full w-full cursor-zoom-in object-cover"
                  onClick={() => setLightbox(publicImageUrl(img.path))}
                />
                {i === 0 && (
                  <span className="absolute left-2 top-2 rounded bg-brand-600 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                    COVER
                  </span>
                )}
                {canEdit && (
                  <div className="absolute right-2 top-2 flex gap-1 opacity-0 transition group-hover:opacity-100">
                    {i !== 0 && (
                      <button
                        title={t("stock_make_cover")}
                        className="rounded bg-white/90 p-1.5 text-slate-700 shadow hover:bg-white"
                        onClick={() => start(() => setCoverImage(img.id, vehicleId))}
                      >
                        <Star className="h-3.5 w-3.5" />
                      </button>
                    )}
                    <button
                      title={t("stock_delete_image")}
                      className="rounded bg-white/90 p-1.5 text-red-600 shadow hover:bg-white"
                      onClick={() => {
                        if (confirm(t("confirm_delete"))) start(() => deleteImage(img.id, vehicleId));
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      {lightbox && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={() => setLightbox(null)}>
          <button className="absolute right-4 top-4 text-white" aria-label="Close">
            <X className="h-6 w-6" />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={lightbox} alt="" className="max-h-full max-w-full rounded-lg" />
        </div>
      )}
    </section>
  );
}
