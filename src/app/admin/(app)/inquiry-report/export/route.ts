import { NextResponse, type NextRequest } from "next/server";
import { getProfile } from "@/lib/auth";
import { csvResponse } from "@/lib/csv";
import { loadReport, readDays } from "../data";

/** Raw WhatsApp click log for the chosen period (same access as the report). */
export async function GET(req: NextRequest) {
  const profile = await getProfile();
  if (profile.role !== "admin" && profile.role !== "manager") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const days = readDays(req.nextUrl.searchParams.get("days") ?? undefined);
  const { clicks } = await loadReport(days);
  return csvResponse(
    `whatsapp-clicks-last-${days}-days.csv`,
    ["time", "page", "stock_no", "country", "utm_source", "utm_campaign", "referrer"],
    clicks.map((c) => [c.created_at, c.page, c.stock_no, c.country, c.utm_source, c.utm_campaign, c.referrer])
  );
}
