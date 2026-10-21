"use client";

import type { SupabaseClient } from "@supabase/supabase-js";

export const IMAGE_EXT = /\.(jpe?g|png|webp|gif|heic)$/i;

/** Downscale to `max` px on the longest side and re-encode as JPEG. Falls back to the original. */
export async function resizeImage(blob: Blob, max = 1600, quality = 0.85): Promise<Blob> {
  try {
    const bitmap = await createImageBitmap(blob);
    const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
    if (scale === 1 && blob.size < 600_000) {
      bitmap.close();
      return blob;
    }
    const w = Math.round(bitmap.width * scale);
    const h = Math.round(bitmap.height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return blob;
    ctx.drawImage(bitmap, 0, 0, w, h);
    bitmap.close();
    const out = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/jpeg", quality));
    return out && out.size < blob.size ? out : blob;
  } catch {
    return blob;
  }
}

// ---------------------------------------------------------------------------
// Listing photos (cars, parts, machinery): resize + Al Mashriq watermark + compress
// ---------------------------------------------------------------------------

/** Longest side of a listing photo; plenty for a full-screen gallery, ~150–300 KB as WebP. */
export const LISTING_MAX = 1600;
const LISTING_QUALITY = 0.82;
const WATERMARK_SRC = "/brand/logo-light.png?v=2";

let watermark: Promise<ImageBitmap | null> | null = null;
function loadWatermark() {
  watermark ??= fetch(WATERMARK_SRC)
    .then((r) => (r.ok ? r.blob() : null))
    .then((b) => (b ? createImageBitmap(b) : null))
    .catch(() => null);
  return watermark;
}

/**
 * Prepares a photo for the website: scales it to LISTING_MAX on the longest side, stamps the
 * Al Mashriq logo faintly in the centre (with a soft shadow so it shows on white and black cars),
 * and encodes it as WebP (JPEG where the browser can't encode WebP). Falls back to the original
 * file if the browser can't decode it (e.g. HEIC on some devices).
 */
export async function prepareListingPhoto(blob: Blob, opts: { watermark?: boolean } = {}): Promise<Blob> {
  try {
    const bitmap = await createImageBitmap(blob);
    const scale = Math.min(1, LISTING_MAX / Math.max(bitmap.width, bitmap.height));
    const w = Math.round(bitmap.width * scale);
    const h = Math.round(bitmap.height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return blob;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(bitmap, 0, 0, w, h);
    bitmap.close();

    const mark = opts.watermark === false ? null : await loadWatermark();
    if (mark) {
      const mw = Math.round(w * 0.42);
      const mh = Math.round((mark.height / mark.width) * mw);
      ctx.save();
      ctx.globalAlpha = 0.32;
      ctx.shadowColor = "rgba(0,0,0,0.45)";
      ctx.shadowBlur = Math.max(2, Math.round(w / 400));
      ctx.drawImage(mark, Math.round((w - mw) / 2), Math.round((h - mh) / 2), mw, mh);
      ctx.restore();
    }

    const encode = (type: string) => new Promise<Blob | null>((res) => canvas.toBlob(res, type, LISTING_QUALITY));
    let out = await encode("image/webp");
    // Some browsers (older Safari) silently return PNG for unsupported types.
    if (!out || out.type !== "image/webp") out = await encode("image/jpeg");
    return out ?? blob;
  } catch {
    return blob;
  }
}

function extFor(blob: Blob, name: string) {
  if (blob.type === "image/jpeg") return "jpg";
  if (blob.type === "image/png") return "png";
  if (blob.type === "image/webp") return "webp";
  const m = name.match(/\.([a-z0-9]+)$/i);
  return (m?.[1] ?? "jpg").toLowerCase();
}

function mimeFor(ext: string) {
  return ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : ext === "gif" ? "image/gif" : "image/jpeg";
}

/** Uploads a photo to storage and records it in vehicle_images. */
export async function uploadVehicleImage(
  supabase: SupabaseClient,
  vehicleId: string,
  file: Blob,
  name: string,
  sortOrder: number,
  resize = true
) {
  const body = resize ? await prepareListingPhoto(file) : file;
  const ext = extFor(body, name);
  const path = `vehicles/${vehicleId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error: upErr } = await supabase.storage
    .from("vehicle-images")
    .upload(path, body, { contentType: body.type || mimeFor(ext), upsert: false, cacheControl: "31536000" });
  if (upErr) throw new Error(upErr.message);
  const { error: dbErr } = await supabase.from("vehicle_images").insert({ vehicle_id: vehicleId, path, sort_order: sortOrder });
  if (dbErr) {
    await supabase.storage.from("vehicle-images").remove([path]);
    throw new Error(dbErr.message);
  }
  return path;
}

/** Run async tasks with limited concurrency. */
export async function pool<T>(items: T[], limit: number, fn: (item: T, index: number) => Promise<void>) {
  let i = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (i < items.length) {
      const idx = i++;
      await fn(items[idx], idx);
    }
  });
  await Promise.all(workers);
}
