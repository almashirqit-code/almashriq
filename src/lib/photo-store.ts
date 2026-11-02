import "server-only";
import { getCloudflareContext } from "@opennextjs/cloudflare";

/*
 * Listing photos (cars, parts, machinery, in-yard, company stamp/logo) live in the Cloudflare R2
 * bucket "almashriq-photos" (Worker binding PHOTOS), served publicly at NEXT_PUBLIC_PHOTO_URL.
 * Paths are the same ones stored in vehicle_images / part_images / machinery_images /
 * vehicle_yard_images, e.g. vehicles/<id>/<file>.webp and thumbs/vehicles/<id>/<file>.webp.
 */

type R2Like = {
  put(key: string, value: ArrayBuffer | ReadableStream, opts?: { httpMetadata?: { contentType?: string; cacheControl?: string } }): Promise<unknown>;
  delete(keys: string | string[]): Promise<void>;
  head(key: string): Promise<unknown | null>;
  list(opts?: { prefix?: string; limit?: number }): Promise<{ objects: { key: string }[] }>;
};

/** Top-level folders staff may write to; anything else is rejected. Site images (blog, reviews, make logos, avatars) live under site-assets/. */
const PHOTO_PATH = /^(?:(?:thumbs\/)?(?:vehicles|yard|parts|machinery|company)|site-assets\/(?:blog|reviews|makes|avatars|portal-avatars))\/[A-Za-z0-9._\-/]+$/;

/** A signed-in user's own avatar: site-assets/avatars/<user id>/… (staff) or site-assets/portal-avatars/<user id>/… (customers). */
const AVATAR_PATH = /^site-assets\/(?:avatars|portal-avatars)\/([0-9a-f-]{36})\/[A-Za-z0-9._-]+$/;

/** User id an avatar path belongs to, or null if it isn't an avatar path. */
export function avatarOwner(path: string) {
  return AVATAR_PATH.exec(path)?.[1] ?? null;
}

export function isPhotoPath(path: string) {
  return PHOTO_PATH.test(path) && !path.includes("..") && !path.includes("//");
}

export async function photoBucket(): Promise<R2Like> {
  const { env } = await getCloudflareContext({ async: true });
  const bucket = (env as unknown as { PHOTOS?: R2Like }).PHOTOS;
  if (!bucket) throw new Error("Photo storage (R2 binding PHOTOS) is not configured");
  return bucket;
}

export async function putPhoto(path: string, body: ArrayBuffer, contentType: string) {
  if (!isPhotoPath(path)) throw new Error("invalid photo path");
  await (await photoBucket()).put(path, body, {
    httpMetadata: { contentType, cacheControl: "public, max-age=31536000, immutable" },
  });
}

/** Deletes photo files (ignores paths outside the photo folders, e.g. legacy "site-assets:" ones). */
export async function deletePhotos(paths: string[]) {
  const keys = paths.filter(isPhotoPath);
  if (!keys.length) return;
  const bucket = await photoBucket();
  // R2 deletes up to 1000 keys per call.
  for (let i = 0; i < keys.length; i += 1000) await bucket.delete(keys.slice(i, i + 1000));
}
