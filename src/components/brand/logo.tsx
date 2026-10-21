/*
 * Al Mashriq Trading logo (car + speedometer, "Car & Spare Parts"), transparent PNGs in public/brand:
 *  - logo.png        original colours, for light backgrounds (invoices, auction sheets, print)
 *  - logo-light.png  chrome-white lettering + brighter red, for dark backgrounds (website, admin sidebar, login)
 * Both are 927 × 371 (2.5 : 1). App icons (src/app/icon.png, apple-icon.png) use the emblem on a jet-black tile.
 */

const SIZES = { sm: "h-11", md: "h-14", lg: "h-24" } as const;

/** `tone="dark"` = for dark backgrounds, `"light"` = for light backgrounds. */
export function Logo({ tone = "dark", size = "md", className = "", alt = "Al Mashriq Trading — Car & Spare Parts" }: { tone?: "dark" | "light"; size?: keyof typeof SIZES; className?: string; alt?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={tone === "dark" ? "/brand/logo-light.png" : "/brand/logo.png"} alt={alt} width={927} height={371} className={`${SIZES[size]} w-auto max-w-full object-contain ${className}`} />
  );
}
