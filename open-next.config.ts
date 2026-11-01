import { defineCloudflareConfig } from "@opennextjs/cloudflare";
import kvIncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/kv-incremental-cache";
import kvNextTagCache from "@opennextjs/cloudflare/overrides/tag-cache/kv-next-tag-cache";
import memoryQueue from "@opennextjs/cloudflare/overrides/queue/memory-queue";

// Cloudflare (OpenNext): page and data cache in KV (NEXT_INC_CACHE_KV), revalidateTag("public-site")
// timestamps in KV (NEXT_TAG_CACHE_KV). KV can take up to a minute to reflect a write, so an ERP edit
// may need a minute to show on the website. All of it fits the Workers Free plan.
export default defineCloudflareConfig({
  incrementalCache: kvIncrementalCache,
  tagCache: kvNextTagCache,
  queue: memoryQueue,
});
