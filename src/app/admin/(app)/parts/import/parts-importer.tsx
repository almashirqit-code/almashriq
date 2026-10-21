"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, CheckCircle2, ClipboardPaste, Download, FileSpreadsheet, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { normalizePartHeader, parsePart, PART_TEMPLATE_HEADERS, PART_TEMPLATE_SAMPLE, type PartField, type PartInput } from "@/lib/parts";
import { partsImported } from "../actions";

type Row = { line: number; data: PartInput; errors: string[] };
type Result = { saved: number; skipped: number; errors: string[] };

const PREVIEW: PartField[] = ["part_no", "name", "category", "make", "model", "year_from", "year_to", "condition", "quantity", "price", "price_currency", "status"];

export function PartsImporter() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [rows, setRows] = useState<Row[]>([]);
  const [cols, setCols] = useState<PartField[]>([]);
  const [source, setSource] = useState("");
  const [paste, setPaste] = useState("");
  const [update, setUpdate] = useState(true);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [parseError, setParseError] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);

  function downloadTemplate() {
    const csv = "﻿" + [PART_TEMPLATE_HEADERS.join(","), ...PART_TEMPLATE_SAMPLE].join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "parts-import-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  /** Reads the first sheet of a workbook (file or pasted text) into validated rows. */
  async function load(input: ArrayBuffer | string, name: string) {
    setParseError("");
    setResult(null);
    setLoading(true);
    try {
      const XLSX = await import("xlsx");
      const wb = typeof input === "string" ? XLSX.read(input, { type: "string", raw: false }) : XLSX.read(input, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: "", raw: true });
      const map = new Map<string, PartField>();
      for (const h of json.length ? Object.keys(json[0]) : []) {
        const f = normalizePartHeader(h);
        if (f && ![...map.values()].includes(f)) map.set(h, f);
      }
      if (![...map.values()].includes("part_no") || ![...map.values()].includes("name"))
        throw new Error("The first row must be a header row with at least “part_no” and “name” columns. Download the template to see the format.");
      const parsed: Row[] = json
        .map((r, i) => {
          const raw: Partial<Record<PartField, unknown>> = {};
          for (const [h, f] of map) raw[f] = r[h];
          return { line: i + 2, raw, ...parsePart(raw) };
        })
        .filter((r) => Object.values(r.raw).some((v) => v !== null && v !== undefined && String(v).trim() !== ""))
        .map(({ line, data, errors }) => ({ line, data, errors }));

      // Duplicate part numbers inside the file: keep the last one.
      const last = new Map<string, number>();
      parsed.forEach((r, i) => r.data.part_no && last.set(r.data.part_no.toLowerCase(), i));
      parsed.forEach((r, i) => {
        if (r.data.part_no && last.get(r.data.part_no.toLowerCase()) !== i) r.errors.push("duplicate part_no in file (later row used)");
      });
      setRows(parsed);
      setCols([...map.values()]);
      setSource(name);
    } catch (e) {
      setRows([]);
      setParseError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  const valid = rows.filter((r) => !r.errors.length);
  const invalid = rows.length - valid.length;
  const busy = !!progress;

  async function run() {
    const errors: string[] = [];
    let saved = 0;
    let skipped = 0;
    // Only send the columns the file has, so updating existing parts doesn't reset their photo, status, etc.
    const data = valid.map((r) => Object.fromEntries(cols.map((c) => [c, r.data[c]])) as Partial<PartInput> & { part_no: string });
    setResult(null);
    setProgress({ done: 0, total: data.length });
    for (let i = 0; i < data.length; i += 200) {
      const chunk = data.slice(i, i + 200);
      const { data: res, error } = await supabase.from("parts").upsert(chunk, { onConflict: "part_no", ignoreDuplicates: !update }).select("id");
      if (!error) {
        saved += res?.length ?? 0;
        skipped += chunk.length - (res?.length ?? 0);
      } else {
        // Isolate the failing rows
        for (const row of chunk) {
          const { data: one, error: e1 } = await supabase.from("parts").upsert(row, { onConflict: "part_no", ignoreDuplicates: !update }).select("id");
          if (e1) errors.push(`${row.part_no}: ${e1.message}`);
          else if (one?.length) saved++;
          else skipped++;
        }
      }
      setProgress({ done: Math.min(i + 200, data.length), total: data.length });
    }
    setProgress(null);
    setResult({ saved, skipped, errors });
    await partsImported();
    router.refresh();
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <section className="card p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold">1. Upload a spreadsheet</h2>
            <button className="btn-ghost text-xs" onClick={downloadTemplate}>
              <Download className="h-3.5 w-3.5" />
              Download template
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
          <button
            className="flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 p-6 text-sm text-slate-600 hover:border-brand-400 hover:bg-brand-50/40"
            onClick={() => fileInput.current?.click()}
            disabled={busy}
          >
            {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : <FileSpreadsheet className="h-6 w-6 text-slate-400" />}
            {source && source !== "Pasted rows" ? source : "Choose CSV / XLSX file"}
          </button>
          <p className="mt-3 text-xs text-slate-500">
            Required: <b>part_no</b>, <b>name</b>. Optional: category, make, model, model_code, year_from, year_to, oem_no, condition (new/used/rebuilt), quantity, price, price_currency
            (JPY/USD/EUR/GBP), cost (JPY), location, status (available/reserved/sold), show_on_website (yes/no), description, notes.
          </p>
        </section>

        <section className="card flex flex-col p-5">
          <h2 className="mb-3 text-sm font-semibold">…or paste rows from Excel / Google Sheets</h2>
          <textarea
            className="input flex-1 font-mono text-xs"
            rows={6}
            value={paste}
            onChange={(e) => setPaste(e.target.value)}
            placeholder={"part_no\tname\tmake\tmodel\tprice\nP-1001\tFront bumper\tToyota\tPrius\t180"}
            disabled={busy}
          />
          <button type="button" className="btn-secondary mt-3 self-start" disabled={busy || !paste.trim()} onClick={() => load(paste, "Pasted rows")}>
            <ClipboardPaste className="h-4 w-4" />
            Read pasted rows
          </button>
        </section>
      </div>

      {parseError && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{parseError}</p>}

      <section className="card">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-3.5">
          <h2 className="text-sm font-semibold">
            2. Review &amp; import
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
              Update parts that already exist (same Part no.)
            </label>
            <button className="btn-primary" onClick={run} disabled={!valid.length || busy}>
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              {busy ? "Importing…" : `Import ${valid.length || ""} parts`}
            </button>
          </div>
        </div>

        {progress && (
          <div className="border-b border-slate-100 px-5 py-4">
            <div className="mb-1.5 flex justify-between text-xs text-slate-600">
              <span>Saving parts</span>
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
              Done — {result.saved} parts saved{result.skipped ? `, ${result.skipped} already existed (not changed)` : ""}.
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
            <Link href="/admin/parts" className="mt-3 inline-block text-sm font-medium text-brand-600 hover:underline">
              Parts →
            </Link>
          </div>
        )}

        {rows.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-slate-500">Upload a file or paste rows to see a preview here.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>#</th>
                  {PREVIEW.map((h) => (
                    <th key={h}>{h}</th>
                  ))}
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
