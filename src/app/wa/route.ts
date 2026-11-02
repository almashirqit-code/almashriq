import { NextResponse, type NextRequest } from "next/server";
import { getCompany, logWhatsappClick, waMeUrl, SITE_URL } from "@/lib/public-site";
import { rateLimit } from "@/lib/rate-limit";

/**
 * Every website WhatsApp button links here (see whatsapp() in public-site.ts). Logs the click for
 * the Inquiry report, then redirects to wa.me. The number always comes from Configuration, so this
 * can't be used as an open redirect. Over the rate limit the visitor is still sent on, just not logged.
 */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const company = await getCompany();
  const to = waMeUrl(company, (sp.get("text") ?? "").slice(0, 1000));
  if (!to) return NextResponse.redirect(new URL("/contact", SITE_URL), 302);

  // Prefetches and link-preview bots aren't clicks.
  const prefetch = req.headers.has("next-router-prefetch") || req.headers.get("purpose") === "prefetch";
  if (!prefetch && (await rateLimit("wa-click", 30, 600))) {
    let page = "";
    let referrer = "";
    let utm: URLSearchParams = sp;
    const raw = req.headers.get("referer");
    if (raw) {
      try {
        const r = new URL(raw);
        if (r.host === req.nextUrl.host || r.host === new URL(SITE_URL).host) {
          page = r.pathname;
          utm = r.searchParams;
        } else referrer = r.host; // linked from another site
      } catch {}
    }
    await logWhatsappClick({
      page,
      stock_no: (sp.get("ref") ?? "").slice(0, 40),
      country: req.headers.get("cf-ipcountry") ?? "",
      utm_source: (sp.get("utm_source") || utm.get("utm_source") || "").slice(0, 80),
      utm_campaign: (sp.get("utm_campaign") || utm.get("utm_campaign") || "").slice(0, 120),
      referrer,
    });
  }
  return NextResponse.redirect(to, 302);
}
