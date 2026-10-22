import "server-only";
import { after } from "next/server";
import { SITE_URL } from "@/lib/public-site";

/**
 * IndexNow: tells Bing (also behind ChatGPT search and DuckDuckGo), Yandex, Seznam and Naver
 * that a page was added or changed, so it is recrawled within minutes instead of days.
 * Google doesn't use IndexNow — it finds changes through the sitemap (submitted in Search Console).
 * The key is public by design; it must match the file public/<key>.txt.
 */
const INDEXNOW_KEY = "3f051c154d86840f175fbf20a8966e19";

/** Queues an IndexNow ping for these site paths after the response is sent (production only). */
export function pingIndexNow(paths: string[]) {
  if (process.env.VERCEL_ENV !== "production" || !paths.length) return;
  const host = new URL(SITE_URL).host;
  after(async () => {
    try {
      await fetch("https://api.indexnow.org/indexnow", {
        method: "POST",
        headers: { "Content-Type": "application/json; charset=utf-8" },
        body: JSON.stringify({
          host,
          key: INDEXNOW_KEY,
          keyLocation: `${SITE_URL}/${INDEXNOW_KEY}.txt`,
          urlList: paths.map((p) => `${SITE_URL}${p}`),
        }),
      });
    } catch {
      // Best effort: the sitemap still lists the page.
    }
  });
}
