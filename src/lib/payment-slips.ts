import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Customer payment slips: private 'payment-slips' bucket, one folder per customer (migration 0033).
 * Only the server touches the bucket (service key); portal_submit_slip only accepts paths in the
 * customer's own folder. File checks are the same as support chat attachments (readChatFile).
 */
const BUCKET = "payment-slips";
const EXT: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "application/pdf": "pdf" };
export const SLIP_CURRENCIES = ["USD", "JPY", "EUR", "GBP"] as const;

export async function storeSlipFile(customerId: string, file: File): Promise<{ path?: string; error?: string }> {
  const path = `${customerId}/${crypto.randomUUID()}.${EXT[file.type]}`;
  const { error } = await createAdminClient().storage.from(BUCKET).upload(path, file, { contentType: file.type, upsert: false });
  return error ? { error: "The file couldn't be uploaded. Please try again." } : { path };
}

export async function removeSlipFile(path: string) {
  await createAdminClient().storage.from(BUCKET).remove([path]);
}

export async function signSlipFile(path: string, downloadName?: string) {
  const { data } = await createAdminClient()
    .storage.from(BUCKET)
    .createSignedUrl(path, 60, downloadName ? { download: downloadName } : undefined);
  return data?.signedUrl ?? null;
}
