"use client";

import type { SupabaseClient } from "@supabase/supabase-js";
import { resizeImage } from "./images";
import { DOC_MAX_BYTES, isAllowedDoc } from "./remittance-docs";
import type { VehicleDocKind } from "./types";

/** Uploads shipping / courier documents (PDF or images) to the private "vehicle-docs" bucket. */
export async function uploadVehicleDocs(supabase: SupabaseClient, vehicleId: string, kind: VehicleDocKind, files: File[]) {
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
      const path = `vehicles/${vehicleId}/${kind}/${Date.now()}-${Math.random().toString(36).slice(2, 7)}-${safe}`;
      const contentType = body.type || file.type || (/\.pdf$/i.test(name) ? "application/pdf" : "application/octet-stream");
      const up = await supabase.storage.from("vehicle-docs").upload(path, body, { contentType });
      if (up.error) throw up.error;
      const ins = await supabase.from("vehicle_documents").insert({
        vehicle_id: vehicleId,
        kind,
        path,
        file_name: name,
        mime_type: contentType,
        size_bytes: body.size,
      });
      if (ins.error) {
        await supabase.storage.from("vehicle-docs").remove([path]);
        throw ins.error;
      }
    } catch {
      failed.push(file.name);
    }
  }
  return failed;
}
