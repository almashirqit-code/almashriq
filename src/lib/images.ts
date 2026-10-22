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
/** Text stamped on every listing photo — same wording and look as the photos from the old website. */
export const WATERMARK_TEXT = "AL MASHRIQ TRADING";
/** Michroma (Google Fonts, SIL Open Font License), the wide geometric face of the old watermark. Bundled in public/fonts. */
const WATERMARK_FONT = "AM Watermark";
const WATERMARK_FONT_URL = "/fonts/michroma.woff2";

let fontReady: Promise<boolean> | null = null;
function loadWatermarkFont() {
  fontReady ??= (async () => {
    try {
      const face = new FontFace(WATERMARK_FONT, `url(${WATERMARK_FONT_URL}) format("woff2")`);
      await face.load();
      document.fonts.add(face);
      return true;
    } catch {
      return false;
    }
  })();
  return fontReady;
}

/**
 * The old site's watermark: "AL MASHRIQ TRADING" centred across ~40% of the photo width, light silver
 * at ~60% opacity with a hairline dark edge (reads as slightly embossed on white and dark cars alike).
 */
async function drawWatermark(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const family = (await loadWatermarkFont()) ? `"${WATERMARK_FONT}", "Segoe UI", Arial, sans-serif` : `"Segoe UI", Arial, sans-serif`;
  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  // Size the text so it spans 40% of the width (60% on tall portrait photos).
  const target = w * (h > w ? 0.6 : 0.4);
  ctx.font = `400 100px ${family}`;
  const size = Math.max(10, Math.floor((100 * target) / ctx.measureText(WATERMARK_TEXT).width));
  ctx.font = `400 ${size}px ${family}`;
  ctx.lineJoin = "round";
  ctx.lineWidth = Math.max(1, size / 22);
  ctx.globalAlpha = 0.6;
  ctx.strokeStyle = "rgba(20,24,30,0.55)";
  ctx.strokeText(WATERMARK_TEXT, w / 2, h / 2);
  ctx.fillStyle = "#e6eaf0";
  ctx.fillText(WATERMARK_TEXT, w / 2, h / 2);
  ctx.restore();
}

/**
 * Prepares a photo for the website: scales it to LISTING_MAX on the longest side, stamps
 * "AL MASHRIQ TRADING" faintly in the centre, and encodes it as WebP (JPEG where the browser can't
 * encode WebP). Falls back to the original file if the browser can't decode it (e.g. HEIC on some devices).
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

    if (opts.watermark !== false) await drawWatermark(ctx, w, h);

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
