"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, CheckCircle2, ClipboardPaste, Download, FileArchive, FileSpreadsheet, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { pool } from "@/lib/images";
import { jpyRate } from "@/lib/branches";
import { groupZipImages, MACHINE_PHOTOS, readZipImages, uploadStockPhoto, type ZipFile } from "@/lib/photo-zip";
import { MACHINE_TEMPLATE_HEADERS, MACHINE_TEMPLATE_SAMPLE, normalizeMachineHeader, parseMachine, type MachineField, type MachineInput } from "@/lib/machinery";
import type { Currency } from "@/lib/types";
import { machineryImported } from "../actions";

type Row = { line: number; data: MachineInput; errors: string[] };
type Result = { saved: number; skipped: number; photos: number; errors: string[] };
type DbMachine = { id: string; stock_no: string };

const PREVIEW: MachineField[] = ["stock_no", "category", "make", "model", "year", "hours", "branch", "condition", "price", "price_currency", "status"];

export function MachineryImporter() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [rows, setRows] = useState<Row[]>([]);
  const [cols, setCols] = useState<MachineField[]>([]);
  const [source, setSource] = useState("");
  const [paste, setPaste] = useState("");
  const [update, setUpdate] = useState(true);
  const [zipName, setZipName] = useState("");
  const [zipFiles, setZipFiles] = useState<ZipFile[]>([]);
  const [db, setDb] = useState<DbMachine[]>([]);
  const [resize, setResize] = useState(true);
  const [replace, setReplace] = useState(false);
  const [loading, setLoading] = useState("");
  const [progress, setProgress] = useState<{ label: string; done: number; total: number } | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [parseError, setParseError] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);
  const zipInput = useRef<HTMLInputElement>(null);

  // Existing machines, so a ZIP can add photos to machines already in stock.
  async function loadDb() {
    const all: DbMachine[] = [];
    for (let from = 0; ; from += 1000) {
      const { data, error } = await supabase.from("machinery").select("id, stock_no").range(from, from + 999);
      if (error || !data?.length) break;
      all.push(...(data as DbMachine[]));
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
    const csv = "﻿" + [MACHINE_TEMPLATE_HEADERS.join(","), ...MACHINE_TEMPLATE_SAMPLE].join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "machinery-import-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  /** Reads the first sheet of a workbook (file or pasted text) into validated rows. */
  async function load(input: ArrayBuffer | string, name: string) {
    setParseError("");
    setResult(null);
    setLoading("sheet");
    try {
      const XLSX = await import("xlsx");
      const wb = typeof input === "string" ? XLSX.read(input, { type: "string", raw: false }) : XLSX.read(input, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: "", raw: true });
      const map = new Map<string, MachineField>();
      for (const h of json.length ? Object.keys(json[0]) : []) {
        const f = normalizeMachineHeader(h);
        if (f && ![...map.values()].includes(f)) map.set(h, f);
      }
      const have = [...map.values()];
      if (!have.includes("stock_no") || !have.includes("make") || !have.includes("model"))
        throw new Error("The first row must be a header row with at least “stock_no”, “make” and “model” columns. Download the template to see the format.");
      const parsed: Row[] = json
        .map((r, i) => {
          const raw: Partial<Record<MachineField, unknown>> = {};
          for (const [h, f] of map) raw[f] = r[h];
          return { line: i + 2, raw, ...parseMachine(raw) };
        })
        .filter((r) => Object.values(r.raw).some((v) => v !== null && v !== undefined && String(v).trim() !== ""))
        .map(({ line, data, errors }) => ({ line, data, errors }));

      // Duplicate stock numbers inside the file: keep the last one.
      const last = new Map<string, number>();
      parsed.forEach((r, i) => r.data.stock_no && last.set(r.data.stock_no.toLowerCase(), i));
      parsed.forEach((r, i) => {
        if (r.data.stock_no && last.get(r.data.stock_no.toLowerCase()) !== i) r.errors.push("duplicate stock_no in file (later row used)");
      });
      setRows(parsed);
      setCols(have);
      setSource(name);
    } catch (e) {
      setRows([]);
      setParseError((e as Error).message);
    } finally {
      setLoading("");
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

  const valid = rows.filter((r) => !r.errors.length);
  const invalid = rows.length - valid.length;
  const busy = !!progress;

  const matching = useMemo(() => groupZipImages(zipFiles, [...valid.map((r) => r.data.stock_no), ...db.map((m) => m.stock_no)]), [zipFiles, rows, db]); // eslint-disable-line react-hooks/exhaustive-deps
  const matchedPhotos = [...matching.groups.values()].reduce((n, g) => n + g.length, 0);

  async function run() {
    const errors: string[] = [];
    let saved = 0;
    let skipped = 0;
    let uploaded = 0;
    setResult(null);

    // 1) Machines. Only send the columns the file has, so updating existing ones doesn't reset their status, etc.
    const send = new Set<MachineField>(cols);
    if (send.has("branch") || send.has("cost_currency")) (["branch", "cost_currency", "cost_fx_rate"] as const).forEach((c) => send.add(c));
    const { data: settings } = await supabase.from("settings").select("exchange_rates").single();
    const rates = (settings?.exchange_rates ?? {}) as Partial<Record<Currency, number>>;
    const data = valid.map((r) => {
      const d = { ...r.data };
      if (!(d.cost_fx_rate > 0)) d.cost_fx_rate = jpyRate(d.cost_currency, rates) ?? 0;
      return Object.fromEntries([...send].map((c) => [c, d[c]])) as Partial<MachineInput> & { stock_no: string };
    });
    const ok = data.filter((d) => !("cost_fx_rate" in d) || Number(d.cost_fx_rate) > 0);
    for (const d of data) if (!ok.includes(d)) errors.push(`${d.stock_no}: no ${d.cost_currency} → JPY rate (add a cost_fx_rate column or set it in Configuration)`);

    setProgress({ label: "Saving machines", done: 0, total: ok.length });
    for (let i = 0; i < ok.length; i += 200) {
      const chunk = ok.slice(i, i + 200);
      const { data: res, error } = await supabase.from("machinery").upsert(chunk, { onConflict: "stock_no", ignoreDuplicates: !update }).select("id");
      if (!error) {
        saved += res?.length ?? 0;
        skipped += chunk.length - (res?.length ?? 0);
      } else {
        // Isolate the failing rows
        for (const row of chunk) {
          const { data: one, error: e1 } = await supabase.from("machinery").upsert(row, { onConflict: "stock_no", ignoreDuplicates: !update }).select("id");
          if (e1) errors.push(`${row.stock_no}: ${e1.message}`);
          else if (one?.length) saved++;
          else skipped++;
        }
      }
      setProgress({ label: "Saving machines", done: Math.min(i + 200, ok.length), total: ok.length });
    }

    // 2) Photos → machine ids
    if (matching.groups.size) {
      const byNo = new Map((await loadDb()).map((m) => [m.stock_no.toLowerCase(), m.id]));
      const perMachine = new Map<string, ZipFile[]>();
      for (const [key, files] of matching.groups) {
        const id = byNo.get(key);
        if (id) perMachine.set(id, [...(perMachine.get(id) ?? []), ...files]);
      }
      // Existing photos: remove them, or add the new ones after them
      const startAt = new Map<string, number>();
      const ids = [...perMachine.keys()];
      for (let i = 0; i < ids.length; i += 200) {
        const { data: existing } = await supabase.from("machinery_images").select("id, machinery_id, path, sort_order").in("machinery_id", ids.slice(i, i + 200));
        if (!existing?.length) continue;
        if (replace) {
          await supabase.from("machinery_images").delete().in("id", existing.map((e) => e.id));
          const paths = existing.map((e) => e.path as string);
          for (let j = 0; j < paths.length; j += 500) await supabase.storage.from("vehicle-images").remove(paths.slice(j, j + 500));
        } else for (const e of existing) startAt.set(e.machinery_id, Math.max(startAt.get(e.machinery_id) ?? 0, e.sort_order + 1));
      }
      const jobs = [...perMachine].flatMap(([id, files]) => files.map((file, i) => ({ id, file, order: (startAt.get(id) ?? 0) + i })));
      setProgress({ label: "Uploading photos", done: 0, total: jobs.length });
      let done = 0;
      await pool(jobs, 4, async (job) => {
        try {
          await uploadStockPhoto(supabase, MACHINE_PHOTOS, job.id, await job.file.entry.async("blob"), job.file.name, job.order, resize);
          uploaded++;
        } catch (e) {
          errors.push(`${job.file.path}: ${(e as Error).message}`);
        }
        setProgress({ label: "Uploading photos", done: ++done, total: jobs.length });
      });
    }

    setProgress(null);
    setResult({ saved, skipped, photos: uploaded, errors });
    await machineryImported();
    router.refresh();
  }

  const canRun = (valid.length > 0 || matchedPhotos > 0) && !busy;
  const drop = "flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 p-6 text-sm text-slate-600 hover:border-brand-400 hover:bg-brand-50/40";

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <section className="card p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold">1. Machinery spreadsheet</h2>
            <button className="btn-ghost text-xs" onClick={downloadTemplate}>
              <Download className="h-3.5 w-3.5" />
              Template
            </button>
          </div>
          <input
            ref={fileInput}
            type="file"
            accept=".csv,.xlsx,.xls"
            className="hidden"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (f) await load(await f.arrayBuffer(), f.name);
              if (fileInput.current) fileInput.current.value = "";
            }}
          />
          <button className={drop} onClick={() => fileInput.current?.click()} disabled={busy}>
            {loading === "sheet" ? <Loader2 className="h-6 w-6 animate-spin" /> : <FileSpreadsheet className="h-6 w-6 text-slate-400" />}
            {source && source !== "Pasted rows" ? source : "Choose CSV / XLSX file"}
          </button>
          <p className="mt-3 text-xs text-slate-500">
            Required: <b>stock_no</b>, <b>make</b>, <b>model</b>. Optional: category, year, hours, serial_no, operating_weight_kg, engine_power_hp, bucket_capacity_m3, attachments, condition
            (new/used/rebuilt), location, branch (JP/SG/TW/TH), purchase_price, expenses, cost_currency (defaults to the branch&apos;s currency), cost_fx_rate (1 unit = ? JPY; defaults to
            Configuration), price, price_currency, status (in_stock/reserved/sold/shipped), show_on_website (yes/no), description, notes.
          </p>
        </section>

        <section className="card flex flex-col p-5">
          <h2 className="mb-3 text-sm font-semibold">…or paste rows from Excel / Google Sheets</h2>
          <textarea
            className="input flex-1 font-mono text-xs"
            rows={6}
            value={paste}
            onChange={(e) => setPaste(e.target.value)}
            placeholder={"stock_no\tmake\tmodel\tyear\thours\nM-2001\tKomatsu\tPC200-8\t2014\t6200"}
            disabled={busy}
          />
          <button type="button" className="btn-secondary mt-3 self-start" disabled={busy || !paste.trim()} onClick={() => load(paste, "Pasted rows")}>
            <ClipboardPaste className="h-4 w-4" />
            Read pasted rows
          </button>
        </section>

        <section className="card p-5">
          <h2 className="mb-3 text-sm font-semibold">2. Photos ZIP (optional)</h2>
          <input ref={zipInput} type="file" accept=".zip" className="hidden" onChange={(e) => onZip(e.target.files?.[0])} />
          <button className={drop} onClick={() => zipInput.current?.click()} disabled={busy}>
            {loading === "zip" ? <Loader2 className="h-6 w-6 animate-spin" /> : <FileArchive className="h-6 w-6 text-slate-400" />}
            {zipName || "Choose ZIP"}
          </button>
          <p className="mt-3 text-xs text-slate-500">
            Put each machine&apos;s photos in a folder named after its Stock no. (<code>M-2001/1.jpg</code>) or start the file name with it (<code>M-2001_1.jpg</code>). Photos are sorted by file
            name; the first is the cover. A ZIP on its own adds photos to machines already saved.
          </p>
          {zipFiles.length > 0 && (
            <div className="mt-3 grid grid-cols-3 gap-2 text-center">
              <Mini label="Photos in ZIP" value={zipFiles.length} />
              <Mini label="Matched" value={matchedPhotos} tone="good" />
              <Mini label="Unmatched groups" value={matching.unmatched.length} tone={matching.unmatched.length ? "bad" : undefined} />
            </div>
          )}
          {matching.unmatched.length > 0 && (
            <p className="mt-2 break-words text-xs text-amber-700">
              {matching.unmatched.slice(0, 30).join(", ")}
              {matching.unmatched.length > 30 && " …"}
            </p>
          )}
        </section>
      </div>

      {parseError && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{parseError}</p>}

      <section className="card">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-3.5">
          <h2 className="text-sm font-semibold">
            3. Review &amp; import
            {rows.length > 0 && (
              <span className="ml-2 font-normal text-slate-500">
                {rows.length} rows · <span className="text-emerald-700">{valid.length} valid</span>
                {invalid > 0 && <span className="text-red-600"> · {invalid} with errors (skipped)</span>}
              </span>
            )}
          </h2>
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={update} onChange={(e) => setUpdate(e.target.checked)} disabled={busy} />
              Update machines that already exist
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={resize} onChange={(e) => setResize(e.target.checked)} disabled={busy} />
              Resize photos (recommended)
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={replace} onChange={(e) => setReplace(e.target.checked)} disabled={busy} />
              Replace existing photos
            </label>
            <button className="btn-primary" onClick={run} disabled={!canRun}>
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              {busy ? "Importing…" : "Start import"}
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
              <div className="h-full rounded-full bg-brand-600 transition-all" style={{ width: `${progress.total ? (progress.done / progress.total) * 100 : 100}%` }} />
            </div>
          </div>
        )}

        {result && (
          <div className="border-b border-slate-100 px-5 py-4">
            <div className="flex items-center gap-2 font-medium text-emerald-700">
              <CheckCircle2 className="h-5 w-5" />
              Done — {result.saved} machines saved{result.skipped ? `, ${result.skipped} already existed (not changed)` : ""} · {result.photos} photos uploaded.
            </div>
            {result.errors.length > 0 && (
              <div className="mt-3 rounded-lg bg-red-50 p-3 text-xs text-red-700">
                <div className="mb-1 font-semibold">Errors ({result.errors.length})</div>
                <ul className="max-h-48 list-inside list-disc overflow-auto">
                  {result.errors.slice(0, 200).map((e, i) => (
                    <li key={i}>{e}</li>
                  ))}
                </ul>
              </div>
            )}
            <Link href="/admin/machinery" className="mt-3 inline-block text-sm font-medium text-brand-600 hover:underline">
              Machinery →
            </Link>
          </div>
        )}

        {rows.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-slate-500">
            {zipFiles.length ? "Photos only: they will be added to machines already saved." : "Upload a file, paste rows or choose a photos ZIP to begin."}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>#</th>
                  {PREVIEW.map((h) => (
                    <th key={h}>{h}</th>
                  ))}
                  <th>📷</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, 100).map((r) => (
                  <tr key={r.line} className={r.errors.length ? "bg-red-50/60" : ""}>
                    <td className="text-xs text-slate-400">{r.line}</td>
                    {PREVIEW.map((h) => (
                      <td key={h} className="whitespace-nowrap text-xs">
                        {r.data[h] === null ? "" : String(r.data[h])}
                      </td>
                    ))}
                    <td className="text-xs tabular-nums">{matching.groups.get(r.data.stock_no.toLowerCase())?.length || ""}</td>
                    <td className="text-xs text-red-600">
                      {r.errors.length > 0 && (
                        <span className="flex items-center gap-1 whitespace-nowrap">
                          <AlertTriangle className="h-3.5 w-3.5" />
                          {r.errors.join("; ")}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {rows.length > 100 && <p className="px-5 py-3 text-xs text-slate-500">Showing the first 100 of {rows.length} rows.</p>}
          </div>
        )}
      </section>
    </div>
  );
}

function Mini({ label, value, tone }: { label: string; value: number; tone?: "good" | "bad" }) {
  const color = tone === "good" ? "text-emerald-700" : tone === "bad" ? "text-red-600" : "text-slate-900";
  return (
    <div className="rounded-lg bg-slate-50 px-2 py-2">
      <div className={`text-lg font-semibold tabular-nums ${color}`}>{value}</div>
      <div className="text-[11px] leading-tight text-slate-500">{label}</div>
    </div>
  );
}
