import "server-only";
import { SITE_HOSTS } from "./parse";

/** Fetches a page or image from the old website only (never any other host). */
export async function siteFetch(url: string, timeoutMs = 25000) {
  const u = new URL(url);
  if (u.protocol !== "https:" || !SITE_HOSTS.includes(u.hostname)) throw new Error("Only almashriqtrading.site URLs are allowed");
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(u, {
      headers: { "user-agent": "Mozilla/5.0 (AlMashriq ERP importer)", accept: "*/*" },
      signal: ctrl.signal,
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res;
  } finally {
    clearTimeout(timer);
  }
}
