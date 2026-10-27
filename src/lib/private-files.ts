import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Private storage buckets that only the server touches (service key): payment slips, expense receipts.
 * Files are photos or PDFs; callers check access (RLS / RPC) before signing a 60-second URL.
 */
const EXT: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "application/pdf": "pdf" };

export async function storePrivateFile(bucket: string, folder: string, file: File): Promise<{ path?: string; error?: string }> {
  const path = `${folder}/${crypto.randomUUID()}.${EXT[file.type]}`;
  const { error } = await createAdminClient().storage.from(bucket).upload(path, file, { contentType: file.type, upsert: false });
  return error ? { error: "The file couldn't be uploaded. Please try again." } : { path };
}

export async function removePrivateFile(bucket: string, path: string) {
  await createAdminClient().storage.from(bucket).remove([path]);
}

export async function signPrivateFile(bucket: string, path: string, downloadName?: string) {
  const { data } = await createAdminClient()
    .storage.from(bucket)
    .createSignedUrl(path, 60, downloadName ? { download: downloadName } : undefined);
  return data?.signedUrl ?? null;
}
