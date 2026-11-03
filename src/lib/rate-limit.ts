import "server-only";
import { createHash } from "crypto";
import { headers } from "next/headers";
import { createClient } from "@supabase/supabase-js";

/**
 * Visitor IP. Cloudflare sets CF-Connecting-IP itself (a visitor can't fake it); X-Forwarded-For is
 * passed through from the visitor, so it is only a fallback for local development.
 */
export async function clientIp() {
  const h = await headers();
  return (h.get("cf-connecting-ip") || h.get("x-real-ip") || h.get("x-forwarded-for")?.split(",")[0] || "unknown").trim();
}

/**
 * Database-backed rate limit (shared by every server instance).
 * Returns true when the request is allowed.
 *
 * By default it fails *open* if the database is unreachable, so a hiccup never
 * locks real users out — right for public inquiries. Pass `failClosed` for the
 * sign-in path, where a database outage must not open the door to brute force.
 */
let warned = false;

export async function rateLimit(action: string, max: number, windowSeconds: number, extra = "", failClosed = false) {
  const onError = !failClosed; // allow on error unless the caller wants it blocked
  try {
    const ip = await clientIp();
    // The secret makes keys unguessable: rate_limit_hit is callable with the public anon key, so without it
    // anyone could compute another visitor's key and fill their bucket (blocking their sign-in or inquiry).
    const secret = process.env.RATE_LIMIT_SECRET ?? "";
    if (!secret && !warned) {
      warned = true;
      console.warn("RATE_LIMIT_SECRET is not set: rate-limit keys can be guessed. Set it as a Worker secret.");
    }
    const key = `${action}:${createHash("sha256").update(`${secret}|${action}|${ip}|${extra.toLowerCase()}`).digest("hex").slice(0, 40)}`;
    const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data, error } = await db.rpc("rate_limit_hit", { p_key: key, p_max: max, p_window_seconds: windowSeconds });
    if (error) return onError;
    return data !== false;
  } catch {
    return onError;
  }
}
