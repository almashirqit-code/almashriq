/**
 * Avatars from DiceBear (open-source avatar library, https://www.dicebear.com).
 * "initials" is CC0; the illustrated styles are free to use with attribution in the docs.
 */
export const AVATAR_STYLES = ["initials", "notionists-neutral", "avataaars-neutral", "lorelei-neutral", "thumbs", "bottts-neutral"] as const;
export type AvatarStyle = (typeof AVATAR_STYLES)[number];

const BG = "1b2f5a,233c73,d71920,b5141a,0e7490,7c3aed,047857";

export function dicebear(seed: string, style: AvatarStyle = "initials") {
  const p = new URLSearchParams({ seed: seed || "?", backgroundColor: BG, backgroundType: "solid" });
  if (style === "initials") p.set("fontWeight", "700");
  return `https://api.dicebear.com/9.x/${style}/svg?${p}`;
}

/** Stored avatar (uploaded path or DiceBear URL) → image URL, falling back to initials. */
export function avatarSrc(stored: string | null | undefined, name: string) {
  if (!stored) return dicebear(name);
  if (stored.startsWith("http")) return stored;
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/site-assets/${stored}`;
}
