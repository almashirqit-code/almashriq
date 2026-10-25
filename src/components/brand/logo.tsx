/*
 * Al Mashriq Trading logo (car + speedometer, "Car & Spare Parts"), transparent PNGs in public/brand:
 *  - logo.png        original colours, for light backgrounds (invoices, auction sheets, print)
 *  - logo-light.png  chrome-white lettering + brighter red, for dark backgrounds (website, admin sidebar, login)
 * Both are 927 × 371 (2.5 : 1). App icons (src/app/icon.png, apple-icon.png) use the emblem on a jet-black tile.
 * logo.webp / logo-light.webp are 480 px wide copies (~40 KB instead of ~250 KB) used on screen by <Logo>;
 * regenerate them from the PNGs (sharp, width 480, quality 80) whenever the PNGs change.
 *
 * /brand/* is cached by browsers for 7 days (next.config.mjs), so ALWAYS use these constants and
 * bump LOGO_VERSION whenever the logo files change — otherwise returning visitors keep the old logo.
 */
const LOGO_VERSION = 2;
export const LOGO_SRC = `/brand/logo.png?v=${LOGO_VERSION}`;
export const LOGO_LIGHT_SRC = `/brand/logo-light.png?v=${LOGO_VERSION}`;
const WEB_SRC = { light: `/brand/logo.webp?v=${LOGO_VERSION}`, dark: `/brand/logo-light.webp?v=${LOGO_VERSION}` };

// sm = phone top bar (≈ 140 px wide, clear of the 68 px bar's edges), md = desktop header / admin sidebar (≈ 200 px), lg = footer, xl = login
const SIZES = { sm: "h-14", md: "h-20", lg: "h-24", xl: "h-32" } as const;

/** `tone="dark"` = for dark backgrounds, `"light"` = for light backgrounds. */
export function Logo({ tone = "dark", size = "md", className = "", alt = "Al Mashriq Trading — Car & Spare Parts" }: { tone?: "dark" | "light"; size?: keyof typeof SIZES; className?: string; alt?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={WEB_SRC[tone]} alt={alt} width={480} height={192} decoding="async" className={`${SIZES[size]} w-auto max-w-full object-contain ${className}`} />
  );
}
