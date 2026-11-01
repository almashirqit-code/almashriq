import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getProfile, can } from "@/lib/auth";
import { COST_FIELDS, VEHICLE_FIELDS, VEHICLE_STATUSES } from "@/lib/types";
import { parseBranch } from "@/lib/branches";
import { fetchAll } from "@/lib/fetch-all";
import { xlsxResponse } from "@/lib/xlsx";

function csvCell(v: unknown) {
  if (v === null || v === undefined) return "";
  const s = String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function GET(req: NextRequest) {
  const profile = await getProfile();
  const supabase = await createClient();
  const sp = req.nextUrl.searchParams;
  const fields: string[] = VEHICLE_FIELDS.filter((f) => can.seeCost(profile.role) || !COST_FIELDS.includes(f));
  // Computed by the database (buying tax, total cost in JPY and FOB in USD)
  if (can.seeCost(profile.role)) fields.push("purchase_tax", "cost_total_jpy", "fob_usd");

  const status = sp.get("status");
  const branch = parseBranch(sp.get("branch"));
  const own = sp.get("own");
  const q = (sp.get("q") ?? "").trim().replace(/[%,()]/g, " ");
  const page = (from: number, to: number) => {
    let query = supabase.from("vehicles").select(fields.join(",")).order("created_at", { ascending: false }).order("id").range(from, to);
    if (status && (VEHICLE_STATUSES as string[]).includes(status)) query = query.eq("status", status);
    if (sp.get("make")) query = query.eq("make", sp.get("make")!);
    if (branch) query = query.eq("branch", branch);
    if (own === "own" || own === "third_party") query = query.eq("ownership", own);
    if (q) query = query.or(`stock_no.ilike.%${q}%,chassis_no.ilike.%${q}%,make.ilike.%${q}%,model.ilike.%${q}%`);
    return query;
  };

  // The API caps one request at 1,000 rows; read every page.
  const rows = await fetchAll<Record<string, unknown>>(page);
  if (sp.get("format") === "xlsx") {
    const value = (v: unknown) => (v === null || v === undefined ? null : typeof v === "number" ? v : typeof v === "object" ? JSON.stringify(v) : String(v));
    return xlsxResponse(`stock-${new Date().toISOString().slice(0, 10)}.xlsx`, [{ name: "Stock", header: fields, rows: rows.map((r) => fields.map((f) => value(r[f]))) }]);
  }
  const cell = (v: unknown) => csvCell(v !== null && typeof v === "object" ? JSON.stringify(v) : v);
  const csv = "﻿" + [fields.join(","), ...rows.map((r) => fields.map((f) => cell(r[f])).join(","))].join("\r\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="stock-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
