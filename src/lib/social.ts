/**
 * Al Mashriq's verified profiles. Shown as buttons in the footer and on the contact page, and listed
 * as `sameAs` in the site's structured data so Google ties them (and the Maps listing) to one business.
 */
export const SOCIAL = {
  facebook: "https://www.facebook.com/AlmashriqtradingJP/",
  tiktok: "https://www.tiktok.com/@almashriqtrading",
  /** Google Business Profile ("AL MASHRIQ TRADING CO., LTD.", Yuki-shi, Ibaraki). */
  googleMaps: "https://share.google/FtYBZCoYzS7ItfwEr",
  trustpilot: "https://www.trustpilot.com/review/almashriqtrading.site",
  /** The company's earlier website. */
  legacySite: "https://www.almashriqtradingjapan.com/",
} as const;

/** Everything Google should treat as the same business. */
export const SAME_AS = [SOCIAL.facebook, SOCIAL.tiktok, SOCIAL.googleMaps, SOCIAL.legacySite, SOCIAL.trustpilot];

/** Google Maps search/embed text for the yard: business name + address on one line. */
export function mapsQuery(companyName: string, address: string | null) {
  return [companyName, address?.replace(/\s*\r?\n\s*/g, ", ")].filter(Boolean).join(", ");
}

export const directionsUrl = (q: string) => `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(q)}`;
export const mapEmbedUrl = (q: string) => `https://www.google.com/maps?q=${encodeURIComponent(q)}&output=embed`;
