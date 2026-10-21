/** @type {import('next').NextConfig} */
const supabaseHost = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
  : "*.supabase.co";

const nextConfig = {
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
