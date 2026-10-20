"use client";

import type { SupabaseClient } from "@supabase/supabase-js";
import { resizeImage } from "./images";

export const DOC_ACCEPT = "application/pdf,image/*,.pdf,.jpg,.jpeg,.png,.webp,.heic,.heif";
export const DOC_MAX_BYTES = 15 * 1024 * 1024;

export function isAllowedDoc(file: File) {
  return file.type === "application/pdf" || file.type.startsWith("image/") || /\.(pdf|jpe?g|png|webp|heic|heif)$/i.test(file.name);
}

/**
 * Uploads TT documents (PDF or images) to the private bucket and records them.
 * Large photos are scaled down to 2400px (still sharp enough to read a TT slip).
 * HEIC files the browser can't decode are uploaded as-is.
 */
export async function uploadRemittanceDocs(supabase: SupabaseClient, remittanceId: number, files: File[]) {
  const failed: string[] = [];
  for (const file of files) {
    try {
      if (!isAllowedDoc(file)) throw new Error("type");
      let body: Blob = file;
      let name = file.name;
      if (file.type.startsWith("image/") && file.size > 1_500_000) {
        const resized = await resizeImage(file, 2400, 0.88);
        if (resized !== file) {
          body = resized;
          name = name.replace(/\.[^.]+$/, "") + ".jpg";
        }
      }
      if (body.size > DOC_MAX_BYTES) throw new Error("size");
      const safe = name.replace(/[^\w.\-]+/g, "_").slice(-80);
      const path = `remittances/${remittanceId}/${Date.now()}-${Math.random().toString(36).slice(2, 7)}-${safe}`;
      const contentType = body.type || file.type || (/\.pdf$/i.test(name) ? "application/pdf" : "application/octet-stream");
      const up = await supabase.storage.from("remittance-docs").upload(path, body, { contentType });
      if (up.error) throw up.error;
      const ins = await supabase.from("remittance_documents").insert({
        remittance_id: remittanceId,
        path,
        file_name: name,
        mime_type: contentType,
        size_bytes: body.size,
      });
      if (ins.error) {
        await supabase.storage.from("remittance-docs").remove([path]);
        throw ins.error;
      }
    } catch {
      failed.push(file.name);
    }
  }
  return failed;
}
