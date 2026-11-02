import "server-only";
import { removePrivateFile, signPrivateFile, storePrivateFile } from "@/lib/private-files";

/**
 * Support chat attachments: private document store under 'support-files', one folder per thread
 * (migration 0030). Only the server touches it; the send RPCs only accept paths in the sender's own
 * thread folder.
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

export const storeChatFile = (threadId: string, file: File) => storePrivateFile(BUCKET, threadId, file);
export const removeChatFile = (path: string) => removePrivateFile(BUCKET, path);
export const signChatFile = (path: string, downloadName?: string) => signPrivateFile(BUCKET, path, downloadName);

export const fileMeta = (file: File) => ({
  p_file_name: (file.name || "file").slice(0, 200),
  p_file_type: file.type,
  p_file_size: file.size,
});
