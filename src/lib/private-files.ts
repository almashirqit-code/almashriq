import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { SITE_URL } from "@/lib/public-site";

/*
 * Private documents (payment slips, expense receipts, support chat files, remittance and vehicle
 * documents) live in the private Cloudflare R2 bucket "almashriq-docs" (Worker binding DOCS), which has
 * no public address. Keys are "<bucket>/<path>", where <bucket> is the old Supabase bucket name and
 * <path> is what the database stores. Callers check access (RLS / RPC) first, then hand out a short-lived
 * signed link to /api/files/<token>, which serves the file.
 */

export type PrivateBucket = "payment-slips" | "expense-receipts" | "support-files" | "remittance-docs" | "vehicle-docs";

type R2Object = { body: ReadableStream; httpMetadata?: { contentType?: string } };
type R2Like = {
  put(key: string, value: ArrayBuffer | ReadableStream | Blob, opts?: { httpMetadata?: { contentType?: string } }): Promise<unknown>;
  get(key: string): Promise<R2Object | null>;
  delete(keys: string | string[]): Promise<void>;
};

const EXT: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "application/pdf": "pdf" };

export async function docsBucket(): Promise<R2Like> {
  const { env } = await getCloudflareContext({ async: true });
  const bucket = (env as unknown as { DOCS?: R2Like }).DOCS;
  if (!bucket) throw new Error("Document storage (R2 binding DOCS) is not configured");
  return bucket;
}

const keyFor = (bucket: PrivateBucket, path: string) => `${bucket}/${path}`;

/** Stores a file under <folder>/<random>.<ext> and returns that path. */
export async function storePrivateFile(bucket: PrivateBucket, folder: string, file: File): Promise<{ path?: string; error?: string }> {
  const path = `${folder}/${crypto.randomUUID()}.${EXT[file.type]}`;
  try {
    await putPrivateFile(bucket, path, await file.arrayBuffer(), file.type);
    return { path };
  } catch {
    return { error: "The file couldn't be uploaded. Please try again." };
  }
}

export async function putPrivateFile(bucket: PrivateBucket, path: string, body: ArrayBuffer, contentType: string) {
  await (await docsBucket()).put(keyFor(bucket, path), body, { httpMetadata: { contentType } });
}

export async function removePrivateFile(bucket: PrivateBucket, paths: string | string[]) {
  const keys = (Array.isArray(paths) ? paths : [paths]).filter(Boolean).map((p) => keyFor(bucket, p));
  if (!keys.length) return;
  const docs = await docsBucket();
  for (let i = 0; i < keys.length; i += 1000) await docs.delete(keys.slice(i, i + 1000));
}

// --- Signed links --------------------------------------------------------------------------------

type Grant = { b: PrivateBucket; p: string; n?: string; e: number };

/** Server-only signing key; the service key never leaves the server. */
const signingKey = () => `private-files:${process.env.SUPABASE_SERVICE_ROLE_KEY ?? ""}`;
const sign = (payload: string) => createHmac("sha256", signingKey()).update(payload).digest("base64url");

/** Link that serves the file for `ttlSeconds`; with `downloadName` it downloads under that name. */
export async function signPrivateFile(bucket: PrivateBucket, path: string, downloadName?: string, ttlSeconds = 60) {
  const grant: Grant = { b: bucket, p: path, ...(downloadName ? { n: downloadName } : {}), e: Math.floor(Date.now() / 1000) + ttlSeconds };
  const payload = Buffer.from(JSON.stringify(grant)).toString("base64url");
  return `${SITE_URL}/api/files/${payload}.${sign(payload)}`;
}

/** The grant inside a signed link, or null if it was tampered with or has expired. */
export function readSignedFile(token: string): Grant | null {
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;
  const want = Buffer.from(sign(payload));
  const got = Buffer.from(sig);
  if (want.length !== got.length || !timingSafeEqual(want, got)) return null;
  try {
    const g = JSON.parse(Buffer.from(payload, "base64url").toString()) as Grant;
    return g.e >= Math.floor(Date.now() / 1000) ? g : null;
  } catch {
    return null;
  }
}

export async function getPrivateFile(bucket: PrivateBucket, path: string) {
  return (await docsBucket()).get(keyFor(bucket, path));
}
