import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/public-site";

// Filter and sort combinations are noindex and every one is a fresh server render. Cars are listed in the sitemap.
const FILTER_URLS = ["q", "body", "fuel", "trans", "steering", "min_price", "max_price", "min_year", "max_year", "sort", "branch"].flatMap((k) => [`/*?${k}=`, `/*&${k}=`]);

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: ["/admin", "/api", "/account", "/auth", "/print", "/wa$", "/wa?", ...FILTER_URLS] },
      // SEO-tool and bulk scrapers: they walk all 1,500+ pages and bring no customers (see middleware).
      { userAgent: ["AhrefsBot", "SemrushBot", "MJ12bot", "DotBot", "PetalBot", "Bytespider", "DataForSeoBot", "BLEXBot", "serpstatbot", "MegaIndex"], disallow: "/" },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
