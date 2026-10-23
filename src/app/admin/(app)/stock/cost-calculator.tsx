"use client";

import { useEffect, useRef, useState } from "react";
import { Plus, X, ArrowDownToLine, ListPlus } from "lucide-react";
import { useT } from "@/lib/i18n/client";
import type { DictKey } from "@/lib/i18n/dictionaries";
import { money, num } from "@/lib/format";
import { jpyRate } from "@/lib/branches";
import { CURRENCIES, EXPENSE_TYPES, TAXED_EXPENSES, type Branch, type Currency, type ExpenseItem, type ExpenseType, type Vehicle } from "@/lib/types";

type Line = ExpenseItem & { key: number };
let seq = 0;

/**
 * Buying-cost formula (amounts in the branch's cost currency):
 *   total       = buying price + buying price × tax% + Σ expenses (auction fee + tax%)
 *   total (JPY) = total × cost FX rate (1 unit = N JPY; 1 for JPY)
 *   FOB (USD)   = total (JPY) ÷ USD rate
 * The database recomputes the same figures on save (vehicles_costing trigger, cost_total_jpy, fob_usd).
 */
export function CostCalculator({
  vehicle,
  defaultFx,
  readOnly,
  branch,
  rates = {},
}: {
  vehicle?: Partial<Vehicle>;
  defaultFx: number;
  readOnly: boolean;
  branch: Branch;
  rates?: Partial<Record<Currency, number>>;
}) {
  const { t, locale } = useT();
  const [costCurrency, setCostCurrency] = useState<Currency>(vehicle?.cost_currency ?? branch.currency);
  const [costFx, setCostFx] = useState<string>(String(vehicle?.cost_fx_rate ?? jpyRate(vehicle?.cost_currency ?? branch.currency, rates) ?? ""));
  const pickCurrency = (c: Currency) => {
    setCostCurrency(c);
    setCostFx(String(jpyRate(c, rates) ?? ""));
  };

  // A new branch brings its own currency and purchase tax (skip the first render: keep saved values).
  const firstBranch = useRef(branch.code);
  useEffect(() => {
    if (branch.code === firstBranch.current) return;
    firstBranch.current = branch.code;
    pickCurrency(branch.currency);
    setTaxRate(String(branch.default_tax_rate));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branch.code]);

  // Expenses are one total by default; a breakdown (itemised lines) is optional.
  const savedItems = Array.isArray(vehicle?.expense_items) ? vehicle!.expense_items : [];
  const initialLines: Line[] = savedItems.map((e) => ({ ...e, key: ++seq }));
  const [mode, setMode] = useState<"total" | "breakdown">(savedItems.length ? "breakdown" : "total");
  const [lumpSum, setLumpSum] = useState<string>(Number(vehicle?.expenses) > 0 ? String(vehicle!.expenses) : "");

  const [price, setPrice] = useState<string>(vehicle?.purchase_price != null ? String(vehicle.purchase_price) : "");
  const [taxRate, setTaxRate] = useState<string>(String(vehicle?.purchase_tax_rate ?? branch.default_tax_rate));
  const [fx, setFx] = useState<string>(vehicle?.fob_fx_rate ? String(vehicle.fob_fx_rate) : defaultFx ? String(defaultFx) : "");
  const [lines, setLines] = useState<Line[]>(initialLines);

  const rate = Number(taxRate) || 0;
  const buying = Number(price) || 0;
  const buyingTax = Math.round((buying * rate) / 100);
  const lineTotal = (l: Line) => (Number(l.amount) || 0) * (TAXED_EXPENSES.includes(l.type) ? 1 + rate / 100 : 1);
  const expenses = mode === "total" ? Math.round(Number(lumpSum) || 0) : Math.round(lines.reduce((s, l) => s + lineTotal(l), 0));
  const total = buying + buyingTax + expenses;
  const isJpy = costCurrency === "JPY";
  const costRate = isJpy ? 1 : Number(costFx) || 0;
  const totalJpy = Math.round(total * costRate);
  const fxNum = Number(fx) || 0;
  const fob = fxNum > 0 && costRate > 0 ? Math.round((totalJpy / fxNum) * 100) / 100 : null;

  const update = (key: number, patch: Partial<Line>) => setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  const yen = (n: number) => money(n, "JPY", locale);
  const local = (n: number) => money(n, costCurrency, locale);

  function useFobAsPrice() {
    if (fob === null) return;
    const priceInput = document.getElementById("price") as HTMLInputElement | null;
    const curSelect = document.getElementById("price_currency") as HTMLSelectElement | null;
    if (priceInput) priceInput.value = String(fob);
    if (curSelect) curSelect.value = "USD";
    priceInput?.focus();
  }

  // One total → no lines saved (the database keeps the submitted total when the breakdown is empty).
  const items: ExpenseItem[] =
    mode === "total"
      ? []
      : lines
          .filter((l) => Number(l.amount) > 0)
          .map(({ type, amount, note }) => ({ type, amount: Number(amount), ...(note?.trim() ? { note: note.trim() } : {}) }));

  function addBreakdown() {
    // Start the breakdown from the total so far, as one "Other" line to split up.
    if (lines.length === 0 && Number(lumpSum) > 0) setLines([{ key: ++seq, type: "other", amount: Number(lumpSum), note: "" }]);
    setMode("breakdown");
  }
  function useOneTotal() {
    setLumpSum(expenses > 0 ? String(expenses) : "");
    setMode("total");
  }

  return (
    <section className="card">
      <div className="border-b border-slate-100 px-5 py-3.5">
        <h2 className="text-sm font-semibold">{t("stock_buying")}</h2>
        <p className="mt-0.5 text-xs text-slate-500">{t("stock_buying_help")}</p>
      </div>

      {/* Values submitted with the vehicle form */}
      <input type="hidden" name="expense_items" value={JSON.stringify(items)} />
      <input type="hidden" name="expenses" value={expenses} />
      <input type="hidden" name="cost_currency" value={costCurrency} />
      <input type="hidden" name="cost_fx_rate" value={isJpy ? 1 : costFx} />

      <div className="grid grid-cols-1 gap-4 border-b border-slate-100 bg-slate-50/60 px-5 py-4 sm:grid-cols-4">
        <div>
          <label className="label" htmlFor="cost_currency_pick">
            {t("f_cost_currency")}
          </label>
          <select id="cost_currency_pick" className="input" value={costCurrency} disabled={readOnly} onChange={(e) => pickCurrency(e.target.value as Currency)}>
            {CURRENCIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </div>
        {!isJpy && (
          <div>
            <label className="label" htmlFor="cost_fx_pick">
              {t("f_cost_fx_rate", { cur: costCurrency })}
            </label>
            <input
              id="cost_fx_pick"
              type="number"
              min={0}
              step="any"
              required
              value={costFx}
              disabled={readOnly}
              onChange={(e) => setCostFx(e.target.value)}
              className="input"
            />
          </div>
        )}
        <p className="self-end text-xs text-slate-500 sm:col-span-2">{isJpy ? t("cost_jpy_help") : t("cost_local_help", { cur: costCurrency })}</p>
      </div>

      <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-4">
        <div>
          <label className="label" htmlFor="purchase_date">
            {t("f_purchase_date")}
          </label>
          <input id="purchase_date" name="purchase_date" type="date" defaultValue={vehicle?.purchase_date ?? ""} disabled={readOnly} className="input" />
        </div>
        <div className="sm:col-span-2">
          <label className="label" htmlFor="purchase_price">
            {t("f_purchase_price_in", { cur: costCurrency })}
          </label>
          <input
            id="purchase_price"
            name="purchase_price"
            type="number"
            min={0}
            step="any"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            disabled={readOnly}
            className="input"
          />
        </div>
        <div>
          <label className="label" htmlFor="purchase_tax_rate">
            {t("f_purchase_tax_rate")}
          </label>
          <input
            id="purchase_tax_rate"
            name="purchase_tax_rate"
            type="number"
            min={0}
            max={100}
            step="any"
            value={taxRate}
            onChange={(e) => setTaxRate(e.target.value)}
            disabled={readOnly}
            className="input"
          />
        </div>
      </div>

      {/* Expenses */}
      <div className="border-t border-slate-100 px-5 py-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">{t("stock_expenses_title")}</h3>
          {!readOnly &&
            (mode === "total" ? (
              <button type="button" className="btn-secondary py-1 text-xs" onClick={addBreakdown}>
                <ListPlus className="h-3.5 w-3.5" />
                {t("stock_add_breakdown")}
              </button>
            ) : (
              <div className="flex gap-2">
                <button type="button" className="btn-ghost py-1 text-xs" onClick={useOneTotal}>
                  {t("stock_use_one_total")}
                </button>
                <button
                  type="button"
                  className="btn-secondary py-1 text-xs"
                  onClick={() => setLines((ls) => [...ls, { key: ++seq, type: nextType(ls), amount: 0, note: "" }])}
                >
                  <Plus className="h-3.5 w-3.5" />
                  {t("stock_add_expense")}
                </button>
              </div>
            ))}
        </div>
        {mode === "total" ? (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-4">
            <div>
              <label className="label" htmlFor="expenses_total">
                {t("stock_expenses_total_in", { cur: costCurrency })}
              </label>
              <input
                id="expenses_total"
                type="number"
                min={0}
                step="any"
                value={lumpSum}
                onChange={(e) => setLumpSum(e.target.value)}
                disabled={readOnly}
                className="input"
              />
            </div>
            <p className="self-end text-xs text-slate-500 sm:col-span-3">{t("stock_expenses_total_help")}</p>
          </div>
        ) : lines.length === 0 ? (
          <p className="text-sm text-slate-400">{t("stock_no_expenses")}</p>
        ) : (
          <div className="space-y-2">
            {lines.map((l) => {
              const taxed = TAXED_EXPENSES.includes(l.type);
              return (
                <div key={l.key} className="grid grid-cols-12 items-center gap-2">
                  <select
                    className="input col-span-12 sm:col-span-4"
                    value={l.type}
                    disabled={readOnly}
                    onChange={(e) => update(l.key, { type: e.target.value as ExpenseType })}
                  >
                    {EXPENSE_TYPES.map((x) => (
                      <option key={x} value={x}>
                        {t(`exp_${x}` as DictKey)}
                      </option>
                    ))}
                  </select>
                  <input
                    className="input col-span-5 sm:col-span-3"
                    type="number"
                    min={0}
                    step="any"
                    placeholder={costCurrency}
                    value={l.amount || ""}
                    disabled={readOnly}
                    onChange={(e) => update(l.key, { amount: Number(e.target.value) })}
                  />
                  <input
                    className="input col-span-6 sm:col-span-3"
                    placeholder={t("stock_expense_note")}
                    value={l.note ?? ""}
                    disabled={readOnly}
                    onChange={(e) => update(l.key, { note: e.target.value })}
                  />
                  <div className="col-span-1 flex items-center justify-end sm:col-span-2">
                    <span className="mr-2 hidden text-right text-xs tabular-nums text-slate-500 sm:block">
                      {taxed && Number(l.amount) > 0 ? (
                        <>
                          <span className="block text-amber-700">{t("stock_expense_tax", { rate: num(rate) })}</span>
                          {local(lineTotal(l))}
                        </>
                      ) : null}
                    </span>
                    {!readOnly && (
                      <button
                        type="button"
                        className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600"
                        onClick={() => setLines((ls) => ls.filter((x) => x.key !== l.key))}
                        aria-label={t("delete")}
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Totals + FX → FOB */}
      <div className="grid grid-cols-1 gap-5 border-t border-slate-100 bg-slate-50/60 px-5 py-4 sm:grid-cols-2">
        <dl className="space-y-1.5 text-sm">
          <Row label={t("f_purchase_price_in", { cur: costCurrency })} value={local(buying)} />
          <Row label={`${t("f_purchase_tax")} (${num(rate)}%)`} value={local(buyingTax)} />
          <Row label={t("stock_total_expenses")} value={local(expenses)} />
          {!isJpy && (
            <div className="flex justify-between border-t border-slate-200 pt-1.5">
              <dt className="text-slate-500">{t("stock_total_cost_in", { cur: costCurrency })}</dt>
              <dd className="tabular-nums">{local(total)}</dd>
            </div>
          )}
          <div className="flex justify-between border-t border-slate-200 pt-1.5 font-semibold">
            <dt>{t("stock_total_cost_jpy")}</dt>
            <dd className="tabular-nums">{costRate > 0 ? yen(totalJpy) : "—"}</dd>
          </div>
        </dl>
        <div className="space-y-3">
          <div>
            <label className="label" htmlFor="fob_fx_rate">
              {t("f_fob_fx_rate")}
            </label>
            <input
              id="fob_fx_rate"
              name="fob_fx_rate"
              type="number"
              min={0}
              step="any"
              value={fx}
              onChange={(e) => setFx(e.target.value)}
              disabled={readOnly}
              className="input"
            />
          </div>
          <div className="flex items-center justify-between rounded-lg bg-slate-900 px-4 py-3 text-white">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-300">{t("stock_fob_usd")}</span>
            <span className="text-xl font-bold tabular-nums">{fob !== null ? money(fob, "USD", locale) : "—"}</span>
          </div>
          {!readOnly && fob !== null && (
            <button type="button" className="btn-ghost w-full justify-center text-xs" onClick={useFobAsPrice}>
              <ArrowDownToLine className="h-3.5 w-3.5" />
              {t("stock_use_fob")}
            </button>
          )}
        </div>
      </div>
    </section>
  );
}

function nextType(lines: Line[]): ExpenseType {
  const used = new Set(lines.map((l) => l.type));
  return EXPENSE_TYPES.find((x) => x !== "other" && !used.has(x)) ?? "other";
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <dt className="text-slate-500">{label}</dt>
      <dd className="tabular-nums">{value}</dd>
    </div>
  );
}
