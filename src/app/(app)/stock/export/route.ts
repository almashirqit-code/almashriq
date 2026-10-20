import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getProfile, can } from "@/lib/auth";
import { COST_FIELDS, VEHICLE_FIELDS, VEHICLE_STATUSES } from "@/lib/types";

function csvCell(v: unknown) {
  if (v === null || v === undefined) return "";
  const s = String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function GET(req: NextRequest) {
  const profile = await getProfile();
  const supabase = await createClient();
  const sp = req.nextUrl.searchParams;
  const fields = VEHICLE_FIELDS.filter((f) => can.seeCost(profile.role) || !COST_FIELDS.includes(f));

  let query = supabase.from("vehicles").select(fields.join(",")).order("created_at", { ascending: false }).limit(50000);
  const status = sp.get("status");
  if (status && (VEHICLE_STATUSES as string[]).includes(status)) query = query.eq("status", status);
  if (sp.get("make")) query = query.eq("make", sp.get("make")!);
  const q = (sp.get("q") ?? "").trim().replace(/[%,()]/g, " ");
  if (q) query = query.or(`stock_no.ilike.%${q}%,chassis_no.ilike.%${q}%,make.ilike.%${q}%,model.ilike.%${q}%`);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = (data ?? []) as unknown as Record<string, unknown>[];
  const csv = "﻿" + [fields.join(","), ...rows.map((r) => fields.map((f) => csvCell(r[f])).join(","))].join("\r\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="stock-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
