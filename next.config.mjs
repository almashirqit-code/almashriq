/** @type {import('next').NextConfig} */
const supabaseHost = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
  : "*.supabase.co";

const supabaseOrigin = process.env.NEXT_PUBLIC_SUPABASE_URL ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).origin : "https://*.supabase.co";

/** Helmet-style security headers for every page. */
const csp = [
  "default-src 'self'",
  // Next.js inlines small bootstrap scripts. The only third party is the Tawk.to live chat on the public site.
  `script-src 'self' 'unsafe-inline' https://*.tawk.to https://widget.trustpilot.com${process.env.NODE_ENV === "development" ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline' https://*.tawk.to https://fonts.googleapis.com",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data: https://*.tawk.to https://fonts.gstatic.com",
  `connect-src 'self' ${supabaseOrigin} ${supabaseOrigin.replace("https://", "wss://")} https://*.tawk.to wss://*.tawk.to https://*.trustpilot.com`,
  "frame-src 'self' https://*.tawk.to https://*.trustpilot.com",
  "media-src 'self' https:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "upgrade-insecure-requests",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "X-DNS-Prefetch-Control", value: "on" },
  { key: "X-Permitted-Cross-Domain-Policies", value: "none" },
];

const nextConfig = {
  poweredByHeader: false,
  compress: true,
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      // Bundled logos/flags/brand images rarely change.
      { source: "/brand/:path*", headers: [{ key: "Cache-Control", value: "public, max-age=604800, stale-while-revalidate=86400" }] },
      { source: "/flags/:path*", headers: [{ key: "Cache-Control", value: "public, max-age=2592000, immutable" }] },
      // The ERP is private — never cache it in shared caches.
      { source: "/admin/:path*", headers: [{ key: "Cache-Control", value: "private, no-store" }, { key: "X-Robots-Tag", value: "noindex, nofollow" }] },
    ];
  },
  images: {
    remotePatterns: [{ protocol: "https", hostname: supabaseHost }],
  },
  async redirects() {
    return [
      // The public website moved from /showroom to the site root.
      { source: "/showroom", destination: "/", permanent: true },
      { source: "/showroom/:path*", destination: "/:path*", permanent: true },
      // The ERP moved under /admin — keep old bookmarks working.
      {
        source: "/:section(stock|customers|invoices|remittances|reservations|freight|masters|users|settings|login|setup|print)",
        destination: "/admin/:section",
        permanent: false,
      },
      {
        source: "/:section(stock|customers|invoices|remittances|reservations|freight|masters|users|settings|login|setup|print)/:path*",
        destination: "/admin/:section/:path*",
        permanent: false,
      },
    ];
  },
  experimental: {
    serverActions: { bodySizeLimit: "4mb" },
  },
};

export default nextConfig;
