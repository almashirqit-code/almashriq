"use client";

import { useMemo, useRef, useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { useT } from "@/lib/i18n/client";
import { en, type DictKey } from "@/lib/i18n/dictionaries";
import { money, round, num } from "@/lib/format";
import type { Currency, VehicleStatus } from "@/lib/types";
import { allocateRemittance } from "../../actions";

export type StockOption = {
  id: string;
  stock_no: string;
  chassis_no: string | null;
  title: string;
  status: VehicleStatus;
  sold: { amount: number; currency: Currency; rate: number; invoice_no: string } | null;
  sameCustomer: boolean;
  allocatedJpy: number;
};

type Row = { key: number; vehicle_id: string; mode: "amt" | "pct"; value: string };
let seq = 0;
const newRow = (value = ""): Row => ({ key: ++seq, vehicle_id: "", mode: "amt", value });

export function AllocateForm({
  remittance,
  options,
}: {
  remittance: { id: number; currency: Currency; rate: number; available: number };
  options: StockOption[];
}) {
  const { t, locale } = useT();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  const cur = remittance.currency;
  const fmt = (n: number) => new Intl.NumberFormat(locale === "ja" ? "ja-JP" : "en-US", { minimumFractionDigits: cur === "JPY" ? 0 : 2, maximumFractionDigits: cur === "JPY" ? 0 : 2 }).format(n);

  const [rows, setRows] = useState<Row[]>([newRow(String(remittance.available))]);
  const byId = useMemo(() => new Map(options.map((o) => [o.id, o])), [options]);

  const amountOf = (r: Row) => {
    const v = Number(r.value) || 0;
    return round(r.mode === "pct" ? (remittance.available * v) / 100 : v, cur);
  };
  const total = round(rows.reduce((s, r) => s + amountOf(r), 0), cur);
  const remaining = round(remittance.available - total, cur);

  const update = (key: number, patch: Partial<Row>) => setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));

  function submit() {
    setError("");
    if (rows.some((r) => !r.vehicle_id)) return setError(t("rem_pick_stock"));
    if (remaining < -0.005) return setError(t("rem_over_allocated"));
    start(async () => {
      const res = await allocateRemittance(
        remittance.id,
        rows.map((r) => ({ vehicle_id: r.vehicle_id, amount: amountOf(r) }))
      );
      if (res.error) setError(res.error in en ? t(res.error as DictKey) : res.error);
      else {
        router.push(`/remittances/${remittance.id}`);
        router.refresh();
      }
    });
  }

  const used = new Set(rows.map((r) => r.vehicle_id).filter(Boolean));

  return (
    <div className="space-y-4">
      <div className="w-72">
        <label className="label">
          {t("rem_allocate_to")} <span className="text-red-500">*</span>
        </label>
        <select className="input" value="stock" disabled>
          <option value="stock">{t("rem_allocate_stock")}</option>
        </select>
      </div>

      <div className="card flex flex-wrap items-start justify-between gap-4 p-5">
        <div>
          <h2 className="text-lg font-semibold">{t("rem_allocate_to_stocks")}</h2>
          <button type="button" className="btn mt-2 bg-slate-900 py-1.5 text-xs text-white hover:bg-slate-800" onClick={() => setRows((rs) => [...rs, newRow()])}>
            {t("rem_add_more")}
          </button>
        </div>
        <div className="text-right text-sm font-semibold">
          <div>
            {t("rem_total_available")}: <span className="text-red-600">{fmt(remittance.available)}</span> {cur}
          </div>
          <div>
            {t("rem_remaining_short")}:{" "}
            <span className={remaining < 0 ? "text-red-600" : remaining === 0 ? "text-emerald-600" : "text-amber-600"}>{fmt(remaining)}</span> {cur}
          </div>
        </div>
      </div>

      {rows.map((r) => {
        const v = r.vehicle_id ? byId.get(r.vehicle_id) : undefined;
        const amt = amountOf(r);
        // Sold price & balance are in the invoice currency.
        let balance: number | null = null;
        if (v?.sold) {
          const paidJpy = v.allocatedJpy + amt * remittance.rate;
          balance = round(v.sold.amount - paidJpy / v.sold.rate, v.sold.currency);
        }
        return (
          <div key={r.key} className="card relative grid grid-cols-1 gap-3 p-4 md:grid-cols-5">
            <div>
              <label className="label">
                {t("rem_stock_id")} <span className="text-red-500">*</span>
              </label>
              <StockPicker
                options={options}
                used={used}
                value={r.vehicle_id}
                field="stock_no"
                placeholder={t("rem_search_stock")}
                onChange={(id) => update(r.key, { vehicle_id: id })}
              />
            </div>
            <div>
              <label className="label">{t("f_chassis_no")}</label>
              <StockPicker
                options={options}
                used={used}
                value={r.vehicle_id}
                field="chassis_no"
                placeholder={t("rem_search_chassis")}
                onChange={(id) => update(r.key, { vehicle_id: id })}
              />
            </div>
            <div>
              <div className="mb-1 flex items-center justify-between">
                <label className="label mb-0">
                  {t("rem_allocate_amount")} <span className="text-red-500">*</span>
                </label>
                <div className="flex overflow-hidden rounded text-[10px] font-semibold">
                  {(["amt", "pct"] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      className={`px-1.5 py-0.5 ${r.mode === m ? "bg-red-600 text-white" : "bg-slate-100 text-slate-600"}`}
                      onClick={() => update(r.key, { mode: m, value: "" })}
                    >
                      {m === "amt" ? "Amt" : "%"}
                    </button>
                  ))}
                </div>
              </div>
              <input
                className="input"
                type="number"
                min="0"
                step="any"
                max={r.mode === "pct" ? 100 : undefined}
                value={r.value}
                onChange={(e) => update(r.key, { value: e.target.value })}
              />
              {r.mode === "pct" && amt > 0 && <p className="mt-1 text-xs text-slate-500">= {money(amt, cur, locale)}</p>}
            </div>
            <div>
              <label className="label">{t("rem_sold_price")}</label>
              <div className="input bg-slate-50">{v?.sold ? money(v.sold.amount, v.sold.currency, locale) : " "}</div>
              {v?.sold && <p className="mt-1 text-xs text-slate-500">{v.sold.invoice_no}</p>}
            </div>
            <div>
              <label className="label">{t("rem_balance_amount")}</label>
              <div className={`input bg-slate-50 ${balance !== null && balance < 0 ? "text-red-600" : ""}`}>
                {balance !== null ? money(balance, v!.sold!.currency, locale) : " "}
              </div>
              {v && !v.sold && <p className="mt-1 text-xs text-slate-500">{t("rem_no_invoice")}</p>}
              {v?.sold && !v.sameCustomer && <p className="mt-1 text-xs text-amber-600">{t("rem_other_customer")}</p>}
            </div>
            {rows.length > 1 && (
              <button
                type="button"
                className="absolute right-2 top-2 rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600"
                onClick={() => setRows((rs) => rs.filter((x) => x.key !== r.key))}
                aria-label={t("delete")}
              >
                <X className="h-4 w-4" />
              </button>
            )}
            {v && (
              <p className="text-xs text-slate-500 md:col-span-5">
                {v.title} · {num(Math.round(v.allocatedJpy))} JPY {t("rem_allocated_amount").toLowerCase()}
              </p>
            )}
          </div>
        );
      })}

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <div className="flex gap-2">
        <button
          type="button"
          className="btn bg-slate-900 text-white hover:bg-slate-800"
          onClick={() => {
            setRows([newRow(String(remittance.available))]);
            setError("");
          }}
        >
          {t("rem_reset")}
        </button>
        <button type="button" className="btn bg-red-600 text-white hover:bg-red-700" disabled={pending} onClick={submit}>
          {pending ? t("saving") : t("rem_allocate")}
        </button>
      </div>
    </div>
  );
}

/** Searchable dropdown over stock no. or chassis no.; both pickers in a row point at the same vehicle. */
function StockPicker({
  options,
  used,
  value,
  field,
  placeholder,
  onChange,
}: {
  options: StockOption[];
  used: Set<string>;
  value: string;
  field: "stock_no" | "chassis_no";
  placeholder: string;
  onChange: (id: string) => void;
}) {
  const { t } = useT();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const selected = options.find((o) => o.id === value);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  const results = useMemo(() => {
    const s = q.trim().toLowerCase();
    return options
      .filter((o) => (field === "chassis_no" ? o.chassis_no : true))
      .filter((o) => o.id === value || !used.has(o.id))
      .filter((o) => !s || String(o[field] ?? "").toLowerCase().includes(s) || o.title.toLowerCase().includes(s))
      .slice(0, 40);
  }, [q, options, field, used, value]);

  return (
    <div ref={ref} className="relative">
      <button type="button" className="input flex items-center justify-between bg-slate-50 text-left" onClick={() => setOpen((o) => !o)}>
        <span className={`truncate ${selected?.[field] ? "" : "text-slate-400"}`}>{selected?.[field] || placeholder}</span>
        <span className="text-slate-400">▾</span>
      </button>
      {open && (
        <div className="absolute z-20 mt-1 w-[min(22rem,90vw)] rounded-lg border border-slate-200 bg-white shadow-lg">
          <input autoFocus className="input rounded-b-none border-0 border-b" placeholder={placeholder} value={q} onChange={(e) => setQ(e.target.value)} />
          <ul className="max-h-64 overflow-auto py-1 text-sm">
            {results.length === 0 && <li className="px-3 py-2 text-slate-500">{t("no_results")}</li>}
            {results.map((o) => (
              <li key={o.id}>
                <button
                  type="button"
                  className="w-full px-3 py-1.5 text-left hover:bg-brand-50"
                  onClick={() => {
                    onChange(o.id);
                    setOpen(false);
                    setQ("");
                  }}
                >
                  <span className="font-medium">{o[field]}</span>
                  {o.sameCustomer && <span className="ml-1.5 rounded bg-emerald-50 px-1 text-[10px] text-emerald-700">★</span>}
                  <span className="block text-xs text-slate-500">
                    {field === "stock_no" ? o.chassis_no : o.stock_no} · {o.title}
                    {o.sold ? ` · ${o.sold.invoice_no}` : ""}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
