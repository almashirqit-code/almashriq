import type { MetadataRoute } from "next";
import { getSitemapImages, getSitemapRows, makeSlug, SITE_URL } from "@/lib/public-site";
import { publicImageUrl } from "@/lib/format";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [rows, photos] = await Promise.all([getSitemapRows(), getSitemapImages()]);
  const now = new Date();
  const fixed: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: `${SITE_URL}/cars`, lastModified: now, changeFrequency: "hourly", priority: 0.9 },
    { url: `${SITE_URL}/parts`, lastModified: now, changeFrequency: "daily", priority: 0.8 },
    { url: `${SITE_URL}/parts/units`, lastModified: now, changeFrequency: "daily", priority: 0.7 },
    { url: `${SITE_URL}/machinery`, lastModified: now, changeFrequency: "daily", priority: 0.8 },
    { url: `${SITE_URL}/how-to-buy`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${SITE_URL}/payment`, changeFrequency: "yearly", priority: 0.5 },
    { url: `${SITE_URL}/reviews`, changeFrequency: "weekly", priority: 0.6 },
    { url: `${SITE_URL}/blog`, changeFrequency: "weekly", priority: 0.6 },
    { url: `${SITE_URL}/contact`, changeFrequency: "yearly", priority: 0.5 },
    { url: `${SITE_URL}/privacy`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${SITE_URL}/cookies`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${SITE_URL}/terms`, changeFrequency: "yearly", priority: 0.2 },
  ];
  const seen = new Set<string>();
  const dynamic = rows.flatMap((r): MetadataRoute.Sitemap => {
    const path =
      r.kind === "car"
        ? `/cars/${encodeURIComponent(r.key)}`
        : r.kind === "unit"
          ? `/parts/units/${encodeURIComponent(r.key)}`
        : r.kind === "post"
          ? `/blog/${r.key}`
          : r.kind === "part"
            ? `/parts/${encodeURIComponent(r.key)}`
            : r.kind === "machine"
              ? `/machinery/${encodeURIComponent(r.key)}`
              : `/makes/${makeSlug(r.key)}`;
    if (seen.has(path)) return [];
    seen.add(path);
    // Listing photos as <image:image> entries so Google Images finds them without crawling every page.
    const images = photos.get(`${r.kind}:${r.key}`)?.map(publicImageUrl);
    return [
      {
        url: `${SITE_URL}${path}`,
        lastModified: r.updated ? new Date(r.updated) : undefined,
        changeFrequency: r.kind === "car" || r.kind === "unit" || r.kind === "part" || r.kind === "machine" ? "weekly" : r.kind === "make" ? "daily" : "monthly",
        priority: r.kind === "make" ? 0.8 : r.kind === "car" || r.kind === "machine" ? 0.7 : 0.6,
        ...(images?.length ? { images } : {}),
      },
    ];
  });
  return [...fixed, ...dynamic];
}
