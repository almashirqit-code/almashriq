import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/public-site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: ["/admin", "/api", "/account", "/auth", "/print"] },
      // SEO-tool and bulk scrapers: they walk all 1,500+ pages and bring no customers (see middleware).
      { userAgent: ["AhrefsBot", "SemrushBot", "MJ12bot", "DotBot", "PetalBot", "Bytespider", "DataForSeoBot", "BLEXBot", "serpstatbot", "MegaIndex"], disallow: "/" },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
