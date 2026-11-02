import { NextResponse } from "next/server";
import { getProfile } from "@/lib/auth";
import { csvResponse } from "@/lib/csv";
import { loadAudience, e164 } from "../../data";

/**
 * Consented contacts as a customer-list file for Facebook / Google custom audiences (column names
 * both accept: email, phone, fn, ln, country). Only people who ticked the marketing opt-in.
 */
export async function GET() {
  const profile = await getProfile();
  if (profile.role !== "admin" && profile.role !== "manager") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const rows = await loadAudience();
  return csvResponse(
    `audience-${new Date().toISOString().slice(0, 10)}.csv`,
    ["email", "phone", "fn", "ln", "country"],
    rows.map((c) => [c.email, e164(c.phone ?? ""), c.first_name, c.last_name, c.country])
  );
}
