import { NextResponse } from "next/server";
import { checkDatabase } from "@/lib/health";

export const dynamic = "force-dynamic";

/**
 * Public health check for an outside uptime monitor (UptimeRobot, Better Stack…):
 * 200 {"ok":true} when the app and its database answer, 503 otherwise. Reveals nothing private.
 */
export async function GET() {
  const db = await checkDatabase();
  return NextResponse.json(
    { ok: db.ok, database: db.ok ? "up" : "down", ms: db.ms, time: new Date().toISOString() },
    { status: db.ok ? 200 : 503, headers: { "Cache-Control": "no-store" } }
  );
}
