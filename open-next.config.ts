import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// Cloudflare (OpenNext) adapter settings. No incremental cache bound yet: this build is for checking
// that the app fits Workers; a KV/R2 cache is added before it serves real traffic.
export default defineCloudflareConfig({});
