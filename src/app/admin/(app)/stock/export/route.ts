import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getProfile, can } from "@/lib/auth";
import { COST_FIELDS, VEHICLE_FIELDS } from "@/lib/types";
import { applyStockFilters, relatedIds, type StockFilter } from "../filters";
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

  const own = sp.get("own");
  const f = Object.fromEntries(["q", "status", "ship", "make", "branch", "agent", "customer"].map((k) => [k, sp.get(k) ?? ""])) as StockFilter;
  const rel = await relatedIds(supabase, f);
  const page = (from: number, to: number) => {
    let query = supabase.from("vehicles").select(fields.join(",")).order("created_at", { ascending: false }).order("id").range(from, to);
    if (own === "own" || own === "third_party") query = query.eq("ownership", own);
    return applyStockFilters(query, f, rel);
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
