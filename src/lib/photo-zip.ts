"use client";

import type JSZipType from "jszip";
import type { SupabaseClient } from "@supabase/supabase-js";
import { IMAGE_EXT, prepareListingPhoto } from "./images";

/**
 * Photos ZIP helpers shared by the vehicle, part and machinery bulk importers.
 * Photos are matched to a record by folder name (A1023/1.jpg) or file-name prefix
 * (A1023_1.jpg, A1023-02.jpg), and ordered by file name (first = cover).
 */
export type ZipFile = { path: string; name: string; entry: JSZipType.JSZipObject };

const SEP = /^[_\-\s\.\(\[#]/;

export function mimeFor(name: string) {
  const ext = name.split(".").pop()?.toLowerCase();
  return ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : ext === "gif" ? "image/gif" : "image/jpeg";
}

/** Find the longest known identifier that `s` equals or starts with (followed by a separator). */
export function matchKey(s: string, keys: string[]): string | null {
  const v = s.toLowerCase();
  let best: string | null = null;
  for (const k of keys) {
    if (!k) continue;
    if (v === k || (v.startsWith(k) && SEP.test(v.slice(k.length)))) {
      if (!best || k.length > best.length) best = k;
    }
  }
  return best;
}

/** All image files in a ZIP (skips folders, macOS metadata and hidden files). */
export async function readZipImages(file: File): Promise<ZipFile[]> {
  const JSZip = (await import("jszip")).default;
  const zip = await JSZip.loadAsync(file);
  const files: ZipFile[] = [];
  zip.forEach((path, entry) => {
    if (entry.dir) return;
    const parts = path.split("/");
    const name = parts[parts.length - 1];
    if (path.startsWith("__MACOSX") || name.startsWith(".") || !IMAGE_EXT.test(name)) return;
    files.push({ path, name, entry });
  });
  return files;
}

/** Groups photos by the (lower-cased) identifier they belong to; the rest are reported as unmatched. */
export function groupZipImages(files: ZipFile[], keys: Iterable<string>) {
  const keyList = [...new Set([...keys].map((k) => k.toLowerCase()).filter(Boolean))];
  const groups = new Map<string, ZipFile[]>();
  const unmatched = new Set<string>();
  for (const f of files) {
    const parts = f.path.split("/");
    let key: string | null = null;
    // Folder names, nearest first
    for (let i = parts.length - 2; i >= 0 && !key; i--) key = matchKey(parts[i], keyList);
    if (!key) key = matchKey(f.name.replace(/\.[^.]+$/, ""), keyList);
    if (key) {
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(f);
    } else {
      unmatched.add(parts.length > 1 ? parts[parts.length - 2] : f.name.replace(/\.[^.]+$/, ""));
    }
  }
  for (const list of groups.values()) list.sort((a, b) => a.path.localeCompare(b.path, undefined, { numeric: true }));
  return { groups, unmatched: [...unmatched] };
}

export type PhotoTable = {
  table: "vehicle_images" | "part_images" | "machinery_images" | "vehicle_yard_images";
  fk: "vehicle_id" | "part_id" | "machinery_id";
  folder: "vehicles" | "parts" | "machinery" | "yard";
};
export const PART_PHOTOS: PhotoTable = { table: "part_images", fk: "part_id", folder: "parts" };
export const MACHINE_PHOTOS: PhotoTable = { table: "machinery_images", fk: "machinery_id", folder: "machinery" };
/** In-yard photos of a car (shown on the public car page under "In-yard photos"). */
export const YARD_PHOTOS: PhotoTable = { table: "vehicle_yard_images", fk: "vehicle_id", folder: "yard" };

/** Uploads one photo to the vehicle-images bucket and records it in the given images table. */
export async function uploadStockPhoto(supabase: SupabaseClient, t: PhotoTable, ownerId: string, file: Blob, name: string, sortOrder: number, resize = true) {
  let body: Blob = file.type ? file : new Blob([file], { type: mimeFor(name) });
  if (resize) body = await prepareListingPhoto(body);
  const ext = body.type === "image/png" ? "png" : body.type === "image/webp" ? "webp" : body.type === "image/gif" ? "gif" : "jpg";
  const path = `${t.folder}/${ownerId}/${Date.now()}-${sortOrder}-${Math.random().toString(36).slice(2, 7)}.${ext}`;
  const up = await supabase.storage.from("vehicle-images").upload(path, body, { contentType: body.type || mimeFor(name), cacheControl: "31536000" });
  if (up.error) throw new Error(up.error.message);
  const ins = await supabase.from(t.table).insert({ [t.fk]: ownerId, path, sort_order: sortOrder });
  if (ins.error) {
    await supabase.storage.from("vehicle-images").remove([path]);
    throw new Error(ins.error.message);
  }
  return path;
}

/** Storage paths of photos in the vehicle-images bucket (skips legacy "site-assets:" ones). */
export const bucketPaths = (paths: string[]) => paths.filter((p) => !p.startsWith("site-assets:"));
