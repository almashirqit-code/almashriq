import type { MetadataRoute } from "next";
import { getSitemapRows, makeSlug, SITE_URL } from "@/lib/public-site";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const rows = await getSitemapRows();
  const now = new Date();
  const fixed: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: `${SITE_URL}/cars`, lastModified: now, changeFrequency: "hourly", priority: 0.9 },
    { url: `${SITE_URL}/how-to-buy`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${SITE_URL}/reviews`, changeFrequency: "weekly", priority: 0.6 },
    { url: `${SITE_URL}/blog`, changeFrequency: "weekly", priority: 0.6 },
    { url: `${SITE_URL}/contact`, changeFrequency: "yearly", priority: 0.5 },
  ];
  const seen = new Set<string>();
  const dynamic = rows.flatMap((r): MetadataRoute.Sitemap => {
    const path = r.kind === "car" ? `/cars/${encodeURIComponent(r.key)}` : r.kind === "post" ? `/blog/${r.key}` : `/makes/${makeSlug(r.key)}`;
    if (seen.has(path)) return [];
    seen.add(path);
    return [
      {
        url: `${SITE_URL}${path}`,
        lastModified: r.updated ? new Date(r.updated) : undefined,
        changeFrequency: r.kind === "car" ? "weekly" : r.kind === "make" ? "daily" : "monthly",
        priority: r.kind === "make" ? 0.8 : r.kind === "car" ? 0.7 : 0.6,
      },
    ];
  });
  return [...fixed, ...dynamic];
}
