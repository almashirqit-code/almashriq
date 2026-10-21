import "server-only";
import { createHash } from "crypto";
import { headers } from "next/headers";
import { createClient } from "@supabase/supabase-js";

/** Visitor IP as seen by Vercel. */
export async function clientIp() {
  const h = await headers();
  return (h.get("x-forwarded-for")?.split(",")[0] || h.get("x-real-ip") || "unknown").trim();
}

/**
 * Database-backed rate limit (shared by every server instance).
 * Returns true when the request is allowed. Fails open if the database is unreachable,
 * so a hiccup never locks real users out.
 */
export async function rateLimit(action: string, max: number, windowSeconds: number, extra = "") {
  try {
    const ip = await clientIp();
    const secret = process.env.RATE_LIMIT_SECRET || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
    const key = `${action}:${createHash("sha256").update(`${secret}|${action}|${ip}|${extra.toLowerCase()}`).digest("hex").slice(0, 40)}`;
    const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data, error } = await db.rpc("rate_limit_hit", { p_key: key, p_max: max, p_window_seconds: windowSeconds });
    if (error) return true;
    return data !== false;
  } catch {
    return true;
  }
}
