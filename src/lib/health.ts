import "server-only";
import { createClient as createAnon } from "@supabase/supabase-js";
import { SITE_URL } from "@/lib/public-site";

export type Check = { name: string; ok: boolean; ms: number | null; detail: string };

/** Runs fn with a time limit and measures it; never throws. */
export async function timed(name: string, fn: () => Promise<string>, timeoutMs = 8000): Promise<Check> {
  const t0 = Date.now();
  try {
    const detail = await Promise.race([
      fn(),
      new Promise<string>((_, rej) => setTimeout(() => rej(new Error(`no answer after ${timeoutMs / 1000}s`)), timeoutMs)),
    ]);
    return { name, ok: true, ms: Date.now() - t0, detail };
  } catch (e) {
    return { name, ok: false, ms: Date.now() - t0, detail: e instanceof Error ? e.message : String(e) };
  }
}

const anon = () =>
  createAnon(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { persistSession: false, autoRefreshToken: false } });

/** Database reachable through the public API (what the website uses). */
export const checkDatabase = () =>
  timed("Database", async () => {
    const { data, error } = await anon().rpc("public_facets");
    if (error) throw new Error(error.message);
    const total = (data as { kind: string; n: number }[] | null)?.find((r) => r.kind === "total")?.n ?? 0;
    return `${Number(total).toLocaleString()} cars on the website`;
  });

/** A public page of the live website, fetched like a visitor would. */
export const checkPage = (name: string, path: string, expect?: RegExp) =>
  timed(name, async () => {
    const res = await fetch(`${SITE_URL}${path}`, { cache: "no-store", redirect: "follow", headers: { "user-agent": "AlMashriq-SystemMonitor/1.0" } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const body = await res.text();
    if (expect && !expect.test(body)) throw new Error(`HTTP ${res.status}, but the page content looks wrong`);
    return `HTTP ${res.status} · ${Math.round(body.length / 1024)} KB`;
  });
