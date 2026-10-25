import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Support chat attachments: private 'support-files' bucket, one folder per thread (migration 0030).
 * Only the server touches the bucket (service key); the send RPCs only accept paths in the
 * sender's own thread folder.
 */
const BUCKET = "support-files";
const EXT: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "application/pdf": "pdf" };
/** Stays under the 4 MB server-action body limit (photos are downscaled in the browser first). */
export const CHAT_FILE_MAX = 3_900_000;

export function readChatFile(formData: FormData): { file?: File; error?: string } {
  const f = formData.get("file");
  if (!(f instanceof File) || f.size === 0) return { error: "Choose a photo or PDF." };
  if (!EXT[f.type]) return { error: "Only photos (JPG, PNG, WebP) and PDFs can be sent." };
  if (f.size > CHAT_FILE_MAX) return { error: "That file is too large. The limit is about 3.9 MB." };
  return { file: f };
}

export async function storeChatFile(threadId: string, file: File): Promise<{ path?: string; error?: string }> {
  const path = `${threadId}/${crypto.randomUUID()}.${EXT[file.type]}`;
  const { error } = await createAdminClient().storage.from(BUCKET).upload(path, file, { contentType: file.type, upsert: false });
  return error ? { error: "The file couldn't be uploaded. Please try again." } : { path };
}

export async function removeChatFile(path: string) {
  await createAdminClient().storage.from(BUCKET).remove([path]);
}

export async function signChatFile(path: string, downloadName?: string) {
  const { data } = await createAdminClient()
    .storage.from(BUCKET)
    .createSignedUrl(path, 60, downloadName ? { download: downloadName } : undefined);
  return data?.signedUrl ?? null;
}

export const fileMeta = (file: File) => ({
  p_file_name: (file.name || "file").slice(0, 200),
  p_file_type: file.type,
  p_file_size: file.size,
});
