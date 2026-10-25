"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle2, FileSpreadsheet, FileArchive, Download, AlertTriangle, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useT } from "@/lib/i18n/client";
import { normalizeHeader, parseVehicle, TEMPLATE_HEADERS, TEMPLATE_SAMPLE, type VehicleInput } from "@/lib/vehicle";
import { pool, prepareListingPhoto, uploadThumb } from "@/lib/images";
import { withThumbs } from "@/lib/format";
import { groupZipImages, mimeFor, readZipImages, type ZipFile } from "@/lib/photo-zip";
import type { Currency, VehicleField } from "@/lib/types";
import { DEFAULT_BRANCHES, jpyRate } from "@/lib/branches";

type Row = { line: number; data: VehicleInput; errors: string[] };
type DbVehicle = { id: string; stock_no: string; chassis_no: string | null };
type Result = { vehicles: number; photos: number; errors: string[] };

export function Importer() {
  const { t } = useT();
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [rows, setRows] = useState<Row[]>([]);
  const [headers, setHeaders] = useState<VehicleField[]>([]);
  const [sheetName, setSheetName] = useState("");
  const [zipName, setZipName] = useState("");
  const [zipFiles, setZipFiles] = useState<ZipFile[]>([]);
  const [db, setDb] = useState<DbVehicle[]>([]);
  const [resize, setResize] = useState(true);
  const [replace, setReplace] = useState(false);
  const [loading, setLoading] = useState("");
  const [progress, setProgress] = useState<{ label: string; done: number; total: number } | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [parseError, setParseError] = useState("");
  const sheetInput = useRef<HTMLInputElement>(null);
  const zipInput = useRef<HTMLInputElement>(null);

  // Index of existing vehicles, for matching photos to vehicles already in stock.
  async function loadDb() {
    const all: DbVehicle[] = [];
    for (let from = 0; ; from += 1000) {
      const { data, error } = await supabase.from("vehicles").select("id, stock_no, chassis_no").range(from, from + 999);
      if (error || !data?.length) break;
      all.push(...(data as DbVehicle[]));
      if (data.length < 1000) break;
    }
    setDb(all);
    return all;
  }
  useEffect(() => {
    loadDb();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function downloadTemplate() {
    const csv = "﻿" + [TEMPLATE_HEADERS.join(","), ...TEMPLATE_SAMPLE].join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "vehicle-import-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  async function onSheet(file: File | undefined) {
    if (!file) return;
    setParseError("");
    setResult(null);
    setLoading("sheet");
    try {
      const XLSX = await import("xlsx");
      const wb = XLSX.read(await file.arrayBuffer(), { type: "array", cellDates: true });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: "", raw: true });
      const rawHeaders = json.length ? Object.keys(json[0]) : [];
      const map = new Map<string, VehicleField>();
      for (const h of rawHeaders) {
        const f = normalizeHeader(h);
        if (f && ![...map.values()].includes(f)) map.set(h, f);
      }
      const parsed: Row[] = json
        .map((r, i) => {
          const raw: Record<string, unknown> = {};
          for (const [h, f] of map) raw[f] = r[h];
          return { line: i + 2, ...parseVehicle(raw) };
        })
        .filter((r) => Object.values(r.data).some((v) => v !== null && v !== "" && v !== undefined));

      // Duplicate stock numbers inside the file: keep the last one.
      const seen = new Map<string, number>();
      parsed.forEach((r, i) => r.data.stock_no && seen.set(String(r.data.stock_no).toLowerCase(), i));
      parsed.forEach((r, i) => {
        if (r.data.stock_no && seen.get(String(r.data.stock_no).toLowerCase()) !== i) r.errors.push("duplicate stock_no in file (later row used)");
      });

      const cols = [...map.values()];
      if (!cols.includes("stock_no")) cols.unshift("stock_no");
      setHeaders(cols);
      setRows(parsed);
      setSheetName(file.name);
    } catch (e) {
      setParseError((e as Error).message);
    } finally {
      setLoading("");
      if (sheetInput.current) sheetInput.current.value = "";
    }
  }

  async function onZip(file: File | undefined) {
    if (!file) return;
    setParseError("");
    setResult(null);
    setLoading("zip");
    try {
      setZipFiles(await readZipImages(file));
      setZipName(file.name);
    } catch (e) {
      setParseError((e as Error).message);
    } finally {
      setLoading("");
      if (zipInput.current) zipInput.current.value = "";
    }
  }

  const validRows = rows.filter((r) => r.errors.length === 0);
  const invalidRows = rows.filter((r) => !validRows.includes(r));

  // Map photo groups → identifier (lower-cased stock_no / chassis_no)
  const matching = useMemo(() => {
    const keys = new Set<string>();
    for (const r of validRows) {
      if (r.data.stock_no) keys.add(String(r.data.stock_no).toLowerCase());
      if (r.data.chassis_no) keys.add(String(r.data.chassis_no).toLowerCase());
    }
    for (const v of db) {
      keys.add(v.stock_no.toLowerCase());
      if (v.chassis_no) keys.add(v.chassis_no.toLowerCase());
    }
    return groupZipImages(zipFiles, keys);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zipFiles, rows, db]);

  const matchedPhotos = [...matching.groups.values()].reduce((n, g) => n + g.length, 0);
  const busy = !!progress;

  async function run() {
    const errors: string[] = [];
    let savedVehicles = 0;
    let uploaded = 0;
    setResult(null);

    // 0) Auction house / yard names → ids; exchange rates for local-currency costs
    const [{ data: ahs }, { data: yds }, { data: settings }] = await Promise.all([
      supabase.from("auction_houses").select("id, name").limit(5000),
      supabase.from("yards").select("id, name").limit(5000),
      supabase.from("settings").select("exchange_rates").single(),
    ]);
    const rates = (settings?.exchange_rates ?? {}) as Partial<Record<Currency, number>>;
    const ahByName = new Map<string, string>((ahs ?? []).map((a): [string, string] => [String(a.name).toLowerCase().trim(), a.id as string]));
    const ydByName = new Map<string, string>((yds ?? []).map((y): [string, string] => [String(y.name).toLowerCase().trim(), y.id as string]));
    const isUuid = (s: string) => /^[0-9a-f-]{36}$/i.test(s);
    const resolve = (value: unknown, map: Map<string, string>, label: string, stock: unknown) => {
      if (value === null || value === undefined || value === "") return value as null;
      const s = String(value).trim();
      if (isUuid(s)) return s;
      const id = map.get(s.toLowerCase());
      if (!id) errors.push(`${stock}: ${label} "${s}" not found — left empty`);
      return id ?? null;
    };

    // 1) Upsert vehicles
    const data = validRows.map((r) => {
      const d = { ...r.data };
      if ("auction_house_id" in d) d.auction_house_id = resolve(d.auction_house_id, ahByName, "auction house", d.stock_no);
      if ("yard_id" in d) d.yard_id = resolve(d.yard_id, ydByName, "yard", d.stock_no);
      // Branch without a cost currency column: costs are in that branch's currency.
      if (d.branch && !("cost_currency" in d)) d.cost_currency = DEFAULT_BRANCHES.find((b) => b.code === d.branch)?.currency ?? "JPY";
      // Cost currency without a rate (no column, or blank → 1): use today's rate from Configuration.
      if (d.cost_currency && d.cost_currency !== "JPY" && (!(Number(d.cost_fx_rate) > 0) || Number(d.cost_fx_rate) === 1)) {
        const rate = jpyRate(d.cost_currency as Currency, rates);
        if (rate) d.cost_fx_rate = rate;
        else errors.push(`${d.stock_no}: no exchange rate for ${d.cost_currency} in Configuration`);
      }
      return d;
    });
    // Rows in one upsert must share columns; JPY-cost rows get the rate 1.
    if (data.some((d) => "cost_fx_rate" in d)) for (const d of data) if (!("cost_fx_rate" in d)) d.cost_fx_rate = 1;
    const returned: DbVehicle[] = [];
    setProgress({ label: t("import_vehicles_saved"), done: 0, total: data.length });
    for (let i = 0; i < data.length; i += 100) {
      const chunk = data.slice(i, i + 100);
      const { data: res, error } = await supabase.from("vehicles").upsert(chunk, { onConflict: "stock_no" }).select("id, stock_no, chassis_no");
      if (!error && res) {
        returned.push(...(res as DbVehicle[]));
        savedVehicles += res.length;
      } else {
        // Isolate the failing rows
        for (const row of chunk) {
          const { data: one, error: e1 } = await supabase.from("vehicles").upsert(row, { onConflict: "stock_no" }).select("id, stock_no, chassis_no").single();
          if (e1) errors.push(`${row.stock_no}: ${e1.code === "23505" ? "chassis_no already used by another vehicle" : e1.message}`);
          else {
            returned.push(one as DbVehicle);
            savedVehicles++;
          }
        }
      }
      setProgress({ label: t("import_vehicles_saved"), done: Math.min(i + 100, data.length), total: data.length });
    }

    // 2) Resolve photo groups → vehicle ids
    const index = await loadDb();
    const byKey = new Map<string, string>();
    for (const v of [...index, ...returned]) {
      byKey.set(v.stock_no.toLowerCase(), v.id);
      if (v.chassis_no) byKey.set(v.chassis_no.toLowerCase(), v.id);
    }
    const jobs: { vehicleId: string; file: ZipFile; order: number }[] = [];
    const vehicleIds = new Set<string>();
    const perVehicle = new Map<string, ZipFile[]>();
    for (const [key, files] of matching.groups) {
      const id = byKey.get(key);
      if (!id) continue;
      vehicleIds.add(id);
      perVehicle.set(id, [...(perVehicle.get(id) ?? []), ...files]);
    }

    // Existing photos: either remove them or append after them
    const startAt = new Map<string, number>();
    const ids = [...vehicleIds];
    for (let i = 0; i < ids.length; i += 200) {
      const slice = ids.slice(i, i + 200);
      const { data: existing } = await supabase.from("vehicle_images").select("id, vehicle_id, path, sort_order").in("vehicle_id", slice);
      if (!existing) continue;
      if (replace && existing.length) {
        await supabase.from("vehicle_images").delete().in("id", existing.map((e) => e.id));
        for (let j = 0; j < existing.length; j += 500) {
          await supabase.storage.from("vehicle-images").remove(withThumbs(existing.slice(j, j + 500).map((e) => e.path)));
        }
      } else {
        for (const e of existing) startAt.set(e.vehicle_id, Math.max(startAt.get(e.vehicle_id) ?? 0, e.sort_order + 1));
      }
    }
    for (const [id, files] of perVehicle) {
      files.forEach((file, i) => jobs.push({ vehicleId: id, file, order: (startAt.get(id) ?? 0) + i }));
    }

    // 3) Upload photos
    setProgress({ label: t("import_photos_uploaded"), done: 0, total: jobs.length });
    let done = 0;
    await pool(jobs, 4, async (job) => {
      try {
        const raw = await job.file.entry.async("blob");
        let body: Blob = new Blob([raw], { type: mimeFor(job.file.name) });
        if (resize) body = await prepareListingPhoto(body);
        const ext = body.type === "image/png" ? "png" : body.type === "image/webp" ? "webp" : body.type === "image/gif" ? "gif" : "jpg";
        const path = `vehicles/${job.vehicleId}/${Date.now()}-${job.order}-${Math.random().toString(36).slice(2, 7)}.${ext}`;
        const up = await supabase.storage.from("vehicle-images").upload(path, body, { contentType: body.type, cacheControl: "31536000" });
        if (up.error) throw new Error(up.error.message);
        const ins = await supabase.from("vehicle_images").insert({ vehicle_id: job.vehicleId, path, sort_order: job.order });
        if (ins.error) throw new Error(ins.error.message);
        await uploadThumb(supabase, path, body);
        uploaded++;
      } catch (e) {
        errors.push(`${job.file.path}: ${(e as Error).message}`);
      }
      setProgress({ label: t("import_photos_uploaded"), done: ++done, total: jobs.length });
    });

    setProgress(null);
    setResult({ vehicles: savedVehicles, photos: uploaded, errors });
    router.refresh();
  }

  const canRun = (validRows.length > 0 || matchedPhotos > 0) && !busy;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Spreadsheet */}
        <section className="card p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold">{t("import_step_sheet")}</h2>
            <button className="btn-ghost text-xs" onClick={downloadTemplate}>
              <Download className="h-3.5 w-3.5" />
              {t("import_template")}
            </button>
          </div>
          <input ref={sheetInput} type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={(e) => onSheet(e.target.files?.[0])} />
          <button
            className="flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 p-6 text-sm text-slate-600 hover:border-brand-400 hover:bg-brand-50/40"
            onClick={() => sheetInput.current?.click()}
            disabled={busy}
          >
            {loading === "sheet" ? <Loader2 className="h-6 w-6 animate-spin" /> : <FileSpreadsheet className="h-6 w-6 text-slate-400" />}
            {sheetName || t("import_choose_sheet")}
          </button>
          {rows.length > 0 && (
            <div className="mt-4 grid grid-cols-3 gap-3 text-center">
              <Mini label={t("import_rows")} value={rows.length} />
              <Mini label={t("import_valid")} value={validRows.length} tone="good" />
              <Mini label={t("import_invalid")} value={invalidRows.length} tone={invalidRows.length ? "bad" : undefined} />
            </div>
          )}
        </section>

        {/* ZIP */}
        <section className="card p-5">
          <h2 className="mb-3 text-sm font-semibold">{t("import_step_zip")}</h2>
          <input ref={zipInput} type="file" accept=".zip" className="hidden" onChange={(e) => onZip(e.target.files?.[0])} />
          <button
            className="flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 p-6 text-sm text-slate-600 hover:border-brand-400 hover:bg-brand-50/40"
            onClick={() => zipInput.current?.click()}
            disabled={busy}
          >
            {loading === "zip" ? <Loader2 className="h-6 w-6 animate-spin" /> : <FileArchive className="h-6 w-6 text-slate-400" />}
            {zipName || t("import_choose_zip")}
          </button>
          <p className="mt-3 text-xs text-slate-500">{t("import_zip_help")}</p>
          {zipFiles.length > 0 && (
            <div className="mt-4 grid grid-cols-3 gap-3 text-center">
              <Mini label={t("import_images_found")} value={zipFiles.length} />
              <Mini label={t("import_images_matched")} value={matchedPhotos} tone="good" />
              <Mini label={t("import_images_unmatched")} value={matching.unmatched.length} tone={matching.unmatched.length ? "bad" : undefined} />
            </div>
          )}
          {matching.unmatched.length > 0 && (
            <p className="mt-3 break-words text-xs text-amber-700">
              {matching.unmatched.slice(0, 30).join(", ")}
              {matching.unmatched.length > 30 && " …"}
            </p>
          )}
        </section>
      </div>

      {parseError && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{parseError}</p>}

      {/* Review */}
      <section className="card">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-3.5">
          <h2 className="text-sm font-semibold">{t("import_step_review")}</h2>
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={resize} onChange={(e) => setResize(e.target.checked)} disabled={busy} />
              {t("import_resize")}
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={replace} onChange={(e) => setReplace(e.target.checked)} disabled={busy} />
              {t("import_replace_images")}
            </label>
            <button className="btn-primary" onClick={run} disabled={!canRun}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {busy ? t("import_running") : t("import_start")}
            </button>
          </div>
        </div>

        {progress && (
          <div className="border-b border-slate-100 px-5 py-4">
            <div className="mb-1.5 flex justify-between text-xs text-slate-600">
              <span>{progress.label}</span>
              <span className="tabular-nums">
                {progress.done} / {progress.total}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-brand-600 transition-all"
                style={{ width: `${progress.total ? (progress.done / progress.total) * 100 : 100}%` }}
              />
            </div>
          </div>
        )}

        {result && (
          <div className="border-b border-slate-100 px-5 py-4">
            <div className="flex items-center gap-2 font-medium text-emerald-700">
              <CheckCircle2 className="h-5 w-5" />
              {t("import_done")} — {t("import_vehicles_saved")}: {result.vehicles} · {t("import_photos_uploaded")}: {result.photos}
            </div>
            {result.errors.length > 0 && (
              <div className="mt-3 rounded-lg bg-red-50 p-3 text-xs text-red-700">
                <div className="mb-1 font-semibold">
                  {t("import_errors")} ({result.errors.length})
                </div>
                <ul className="max-h-48 list-inside list-disc overflow-auto">
                  {result.errors.slice(0, 200).map((e, i) => (
                    <li key={i}>{e}</li>
                  ))}
                </ul>
              </div>
            )}
            <Link href="/admin/stock" className="mt-3 inline-block text-sm font-medium text-brand-600 hover:underline">
              {t("stock_title")} →
            </Link>
          </div>
        )}

        {rows.length === 0 && zipFiles.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-slate-500">{t("import_no_input")}</p>
        ) : rows.length === 0 ? (
          <p className="px-5 py-6 text-sm text-slate-600">{t("import_matching_existing")}</p>
        ) : (
          <div className="overflow-x-auto">
            <div className="px-5 pt-3 text-xs font-medium uppercase tracking-wide text-slate-500">{t("import_preview")}</div>
            <table className="table">
              <thead>
                <tr>
                  <th>#</th>
                  {headers.map((h) => (
                    <th key={h}>{h}</th>
                  ))}
                  <th>📷</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, 50).map((r) => {
                  const photos =
                    (matching.groups.get(String(r.data.stock_no ?? "").toLowerCase())?.length ?? 0) +
                    (r.data.chassis_no ? matching.groups.get(String(r.data.chassis_no).toLowerCase())?.length ?? 0 : 0);
                  return (
                    <tr key={r.line} className={r.errors.length ? "bg-red-50/60" : ""}>
                      <td className="text-xs text-slate-400">{r.line}</td>
                      {headers.map((h) => (
                        <td key={h} className="whitespace-nowrap text-xs">
                          {r.data[h] === null || r.data[h] === undefined ? "" : Array.isArray(r.data[h]) ? `${(r.data[h] as unknown[]).length} items` : String(r.data[h])}
                        </td>
                      ))}
                      <td className="text-xs tabular-nums">{photos || ""}</td>
                      <td className="text-xs text-red-600">
                        {r.errors.length > 0 && (
                          <span className="flex items-center gap-1 whitespace-nowrap">
                            <AlertTriangle className="h-3.5 w-3.5" />
                            {r.errors.join("; ")}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function Mini({ label, value, tone }: { label: string; value: number; tone?: "good" | "bad" }) {
  const color = tone === "good" ? "text-emerald-700" : tone === "bad" ? "text-red-600" : "text-slate-900";
  return (
    <div className="rounded-lg bg-slate-50 px-2 py-2.5">
      <div className={`text-lg font-semibold tabular-nums ${color}`}>{value}</div>
      <div className="text-[11px] leading-tight text-slate-500">{label}</div>
    </div>
  );
}
