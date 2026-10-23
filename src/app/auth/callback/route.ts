import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Landing point for Supabase email links (sign-up confirmation, password recovery).
 * Exchanges the one-time code for a session, then continues to `next` — a path on this site only.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const raw = searchParams.get("next") ?? "/account";
  // Only same-site paths: block "//evil.com" and absolute URLs (open redirect).
  const next = raw.startsWith("/") && !raw.startsWith("//") && !raw.startsWith("/\\") ? raw : "/account";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(next, origin));
  }
  return NextResponse.redirect(new URL("/account/login?link=expired", origin));
}
