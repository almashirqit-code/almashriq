import { defineCloudflareConfig } from "@opennextjs/cloudflare";
import r2IncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/r2-incremental-cache";
import { withRegionalCache } from "@opennextjs/cloudflare/overrides/incremental-cache/regional-cache";
import d1NextTagCache from "@opennextjs/cloudflare/overrides/tag-cache/d1-next-tag-cache";
import memoryQueue from "@opennextjs/cloudflare/overrides/queue/memory-queue";

// Cloudflare (OpenNext): page and data cache in R2 (NEXT_INC_CACHE_R2_BUCKET), with a copy in each
// data centre's Cache API so most hits never reach R2. revalidateTag("public-site") timestamps live in
// D1 (NEXT_TAG_CACHE_D1), which is read on every hit and is consistent at once — an ERP edit shows on
// the website on the next request, unlike KV which took up to a minute.
export default defineCloudflareConfig({
  // Serve cached pages without starting the Next.js server (saves CPU on every cache hit).
  enableCacheInterception: true,
  incrementalCache: withRegionalCache(r2IncrementalCache, { mode: "long-lived" }),
  tagCache: d1NextTagCache,
  queue: memoryQueue,
});
