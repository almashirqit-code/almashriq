/*
 * Browser side of the photo store (Cloudflare R2, see src/lib/photo-store.ts). Same shape as the
 * Supabase storage calls it replaces, so call sites keep their { error } handling.
 */

type Result = { error: { message: string } | null };

async function call(input: string, init: RequestInit): Promise<Result> {
  try {
    const res = await fetch(input, { ...init, credentials: "same-origin" });
    if (res.ok) return { error: null };
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    return { error: { message: data.error || `Photo storage error (${res.status})` } };
  } catch (e) {
    return { error: { message: (e as Error).message } };
  }
}

export const photoStorage = {
  /** Stores a photo at `path` (overwrites an existing file with the same path). */
  upload(path: string, body: Blob, opts: { contentType?: string; cacheControl?: string; upsert?: boolean } = {}) {
    return call(`/api/photos?path=${encodeURIComponent(path)}`, {
      method: "PUT",
      headers: { "content-type": opts.contentType || body.type || "image/jpeg" },
      body,
    });
  },
  /** Deletes photo files; missing files are ignored. */
  remove(paths: string[]) {
    return call("/api/photos", { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ paths }) });
  },
};

/** Staff documents in the private document store (remittance and vehicle documents, see src/app/api/docs). */
export const docStorage = {
  upload(bucket: "remittance-docs" | "vehicle-docs", path: string, body: Blob, contentType: string) {
    return call(`/api/docs?bucket=${bucket}&path=${encodeURIComponent(path)}`, { method: "PUT", headers: { "content-type": contentType }, body });
  },
  remove(bucket: "remittance-docs" | "vehicle-docs", paths: string[]) {
    return call("/api/docs", { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ bucket, paths }) });
  },
};
