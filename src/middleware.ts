import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * First-line rate limiter (per server instance, in memory). The database limiter
 * (src/lib/rate-limit.ts) protects sign-in and inquiries across all instances.
 */
const buckets = new Map<string, { n: number; reset: number }>();
const LIMITS = { post: [90, 60_000], api: [120, 60_000], page: [600, 60_000] } as const;

function limited(ip: string, kind: keyof typeof LIMITS) {
  const [max, windowMs] = LIMITS[kind];
  const now = Date.now();
  const key = `${kind}:${ip}`;
  const b = buckets.get(key);
  if (!b || b.reset < now) {
    buckets.set(key, { n: 1, reset: now + windowMs });
    if (buckets.size > 5000) for (const [k, v] of buckets) if (v.reset < now) buckets.delete(k);
    return null;
  }
  b.n++;
  return b.n > max ? Math.ceil((b.reset - now) / 1000) : null;
}

/**
 * Layout of the site:
 *   /            public car website (no login)
 *   /admin/...   the ERP — staff must be signed in (except /admin/login and /admin/setup)
 * Every request passes the rate limiter; only /admin and the staff image proxy need a session.
 */
/** The one address search engines should see (the custom domain). */
const CANONICAL_HOST = new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.almashriqtrading.site").host;

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // Production on *.vercel.app → same page on the custom domain (one site for Google, not two).
  // Printed QR codes use the vercel.app address and still land on /verify there. Preview deployments are untouched.
  const host = request.headers.get("host") ?? "";
  if (process.env.VERCEL_ENV === "production" && host.endsWith(".vercel.app") && host !== CANONICAL_HOST) {
    const url = new URL(request.nextUrl.pathname + request.nextUrl.search, `https://${CANONICAL_HOST}`);
    return NextResponse.redirect(url, 308);
  }

  const ip = (request.headers.get("x-forwarded-for")?.split(",")[0] || request.headers.get("x-real-ip") || "unknown").trim();
  const kind = request.method === "POST" ? "post" : path.startsWith("/api/") ? "api" : "page";
  // Link prefetches are cheap and automatic — don't count them.
  const prefetch = request.headers.has("next-router-prefetch") || request.headers.get("purpose") === "prefetch";
  const wait = prefetch ? null : limited(ip, kind);
  if (wait) {
    return new NextResponse("Too many requests — please slow down and try again shortly.", {
      status: 429,
      headers: { "Retry-After": String(wait), "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  let response = NextResponse.next({ request });
  const isAccount = path === "/account" || path.startsWith("/account/");
  if (!path.startsWith("/admin") && !isAccount && path !== "/api/site-image") return response;

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    if (path !== "/admin/setup") return NextResponse.redirect(new URL("/admin/setup", request.url));
    return response;
  }

  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Customer portal: sign-in pages are open; everything else needs a session.
  if (isAccount) {
    const publicPage = ["/account/login", "/account/signup", "/account/forgot"].some((p) => path.startsWith(p));
    if (!user && !publicPage) {
      const url = request.nextUrl.clone();
      url.pathname = "/account/login";
      url.search = "";
      return NextResponse.redirect(url);
    }
    if (user && (path.startsWith("/account/login") || path.startsWith("/account/signup"))) {
      const url = request.nextUrl.clone();
      url.pathname = "/account";
      url.search = "";
      return NextResponse.redirect(url);
    }
    return response;
  }

  const open = path.startsWith("/admin/login") || path.startsWith("/admin/setup");
  if (!user && !open && path.startsWith("/admin")) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin/login";
    url.search = "";
    return NextResponse.redirect(url);
  }
  if (user && path.startsWith("/admin/login")) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin";
    url.search = "";
    return NextResponse.redirect(url);
  }
  return response;
}

export const config = {
  // Everything except static files (Next.js assets, logos, flags, icons).
  matcher: ["/((?!_next/static|_next/image|brand/|flags/|favicon.ico|icon.png|robots.txt|sitemap.xml).*)"],
};
