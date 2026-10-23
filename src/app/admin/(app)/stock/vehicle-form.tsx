"use client";

import { useActionState, useState } from "react";
import { useT } from "@/lib/i18n/client";
import type { DictKey } from "@/lib/i18n/dictionaries";
import { CURRENCIES, type BranchCode, type Currency, type Vehicle, type VehicleField } from "@/lib/types";
import { DEFAULT_BRANCHES } from "@/lib/branches";
import { makeNames, modelNames } from "@/lib/catalog";
import { SubmitButton } from "@/components/buttons";
import { CostCalculator } from "./cost-calculator";
import { OriginPicker, type Masters } from "./origin-picker";
import type { FormState } from "./actions";
import { UNIT_CONDITIONS, UNIT_CONDITION_LABEL, UNIT_PARTS, UNIT_PART_LABEL } from "@/lib/part-units";

type FieldDef = {
  name: VehicleField;
  type?: "text" | "number" | "date" | "select" | "textarea";
  options?: readonly string[];
  required?: boolean;
  span?: 2 | 3;
  list?: string;
};

const SPECS: FieldDef[] = [
  { name: "stock_no", required: true },
  { name: "chassis_no" },
  { name: "make", required: true, list: "makes" },
  { name: "model", required: true, list: "models" },
  { name: "grade" },
  { name: "year", type: "number" },
  { name: "month", type: "number" },
  { name: "mileage", type: "number" },
  { name: "color" },
  { name: "engine_cc", type: "number" },
  { name: "fuel", type: "select", options: ["", "Petrol", "Diesel", "Hybrid", "Electric", "LPG"] },
  { name: "transmission", type: "select", options: ["", "AT", "MT", "CVT", "AMT"] },
  { name: "drive", type: "select", options: ["", "2WD", "4WD", "AWD"] },
  { name: "steering", type: "select", options: ["RHD", "LHD"] },
  { name: "doors", type: "number" },
  { name: "seats", type: "number" },
  { name: "body_type", type: "select", options: ["", "Sedan", "Hatchback", "SUV", "Wagon", "Van", "Minivan", "Truck", "Bus", "Coupe", "Convertible", "Pickup", "Kei"] },
  { name: "auction_grade" },
  { name: "location" },
];

const PRICING: FieldDef[] = [
  { name: "purchase_date", type: "date" },
  { name: "purchase_price", type: "number" },
  { name: "expenses", type: "number" },
  { name: "price", type: "number" },
  { name: "price_currency", type: "select", options: CURRENCIES },
];

const MAKES = ["Toyota", "Nissan", "Honda", "Mazda", "Mitsubishi", "Subaru", "Suzuki", "Daihatsu", "Lexus", "Isuzu", "Hino", "Mercedes-Benz", "BMW", "Volkswagen", "Audi"];

export function VehicleForm({
  vehicle,
  action,
  showCost,
  readOnly = false,
  defaultFx = 0,
  rates = {},
  masters,
}: {
  masters?: Masters;
  vehicle?: Partial<Vehicle>;
  action: (prev: FormState, fd: FormData) => Promise<FormState>;
  showCost: boolean;
  readOnly?: boolean;
  defaultFx?: number;
  /** Configuration exchange rates (1 unit = N JPY), used to suggest the cost FX rate. */
  rates?: Partial<Record<Currency, number>>;
}) {
  const { t } = useT();
  const [state, formAction] = useActionState(action, {});
  const [ownership, setOwnership] = useState(vehicle?.ownership ?? "own");
  // Bought for parts → listed under Parts → Complete units, with condition and parts available.
  const [forParts, setForParts] = useState(vehicle?.for_parts ?? false);
  const [unitParts, setUnitParts] = useState<string[]>(vehicle?.unit_parts ?? []);
  const togglePart = (p: string) => setUnitParts((ps) => (ps.includes(p) ? ps.filter((x) => x !== p) : [...ps, p]));
  const branches = masters?.branches ?? DEFAULT_BRANCHES;
  const [branch, setBranch] = useState<BranchCode>(vehicle?.branch ?? "JP");
  // Make/model suggestions come from Configuration → Makes & models (built-in makes until that list exists).
  const catalog = masters?.catalog ?? [];
  const [make, setMake] = useState(vehicle?.make ?? "");
  const makeOptions = catalog.length ? makeNames(catalog) : MAKES;
  const modelOptions = modelNames(catalog, make);

  const render = (f: FieldDef) => {
    const value = vehicle?.[f.name as keyof Vehicle];
    const common = {
      name: f.name,
      id: f.name,
      defaultValue: value === null || value === undefined ? (f.name === "price_currency" ? "JPY" : f.name === "steering" ? "RHD" : "") : String(value),
      disabled: readOnly,
      required: f.required,
      className: "input",
    };
    const label = t(`f_${f.name}` as DictKey);
    return (
      <div key={f.name} className={f.span === 2 ? "sm:col-span-2" : f.span === 3 ? "sm:col-span-3" : ""}>
        <label className="label" htmlFor={f.name}>
          {label}
          {f.required && <span className="text-red-500"> *</span>}
        </label>
        {f.type === "select" ? (
          <select {...common}>
            {f.options!.map((o) => (
              <option key={o} value={o}>
                {f.name === "status" ? t(`vs_${o}` as DictKey) : o || "—"}
              </option>
            ))}
          </select>
        ) : f.type === "textarea" ? (
          <textarea {...common} rows={3} />
        ) : (
          <input
            {...common}
            type={f.type ?? "text"}
            step={f.type === "number" ? "any" : undefined}
            min={f.name === "month" ? 1 : f.type === "number" ? 0 : undefined}
            max={f.name === "month" ? 12 : undefined}
            list={f.list}
            autoComplete={f.list ? "off" : undefined}
            onChange={f.name === "make" ? (e) => setMake(e.target.value) : undefined}
          />
        )}
      </div>
    );
  };

  const pricing = PRICING.filter((f) => !["purchase_date", "purchase_price", "expenses"].includes(f.name));

  return (
    <form action={formAction} className="space-y-5">
      <datalist id="makes">
        {makeOptions.map((m) => (
          <option key={m} value={m} />
        ))}
      </datalist>
      <datalist id="models">
        {modelOptions.map((m) => (
          <option key={m} value={m} />
        ))}
      </datalist>

      <section className="card">
        <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2 xl:grid-cols-4">
          <div>
            <label className="label" htmlFor="branch">
              {t("f_branch")}
            </label>
            <select id="branch" name="branch" className="input" value={branch} disabled={readOnly} onChange={(e) => setBranch(e.target.value as BranchCode)}>
              {branches
                .filter((b) => b.active || b.code === branch)
                .map((b) => (
                  <option key={b.code} value={b.code}>
                    {b.name}
                  </option>
                ))}
            </select>
            <p className="mt-1 text-xs text-slate-500">{t("branch_help")}</p>
          </div>
          <div>
            <label className="label" htmlFor="ownership">
              {t("f_ownership")}
            </label>
            <select
              id="ownership"
              name="ownership"
              className="input"
              value={ownership}
              disabled={readOnly}
              onChange={(e) => setOwnership(e.target.value as "own" | "third_party")}
            >
              <option value="own">{t("own_own")}</option>
              <option value="third_party">{t("own_third_party")}</option>
            </select>
          </div>
          <div>
            <span className="label">{t("f_for_parts")}</span>
            <input type="hidden" name="for_parts" value="false" />
            <label className="flex items-start gap-2.5 rounded-lg border border-slate-200 px-3 py-2.5 text-sm">
              <input
                type="checkbox"
                name="for_parts"
                value="true"
                checked={forParts}
                onChange={(e) => setForParts(e.target.checked)}
                disabled={readOnly}
                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-rose-600"
              />
              <span className="text-slate-600">{t("stock_parts_help")}</span>
            </label>
          </div>
          <div>
            <span className="label">{t("f_show_on_website")}</span>
            {/* Hidden "false" first so an unchecked box still submits a value; the checkbox overrides it. */}
            <input type="hidden" name="show_on_website" value="false" />
            <label className="flex items-start gap-2.5 rounded-lg border border-slate-200 px-3 py-2.5 text-sm">
              <input
                type="checkbox"
                name="show_on_website"
                value="true"
                defaultChecked={vehicle?.show_on_website ?? true}
                disabled={readOnly}
                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-brand-600"
              />
              <span className="text-slate-600">{t("stock_website_help")}</span>
            </label>
          </div>
        </div>
      </section>

      {forParts && (
        <section className="card border-brand-200">
          <div className="border-b border-brand-100 bg-brand-50/60 px-5 py-3.5">
            <h2 className="text-sm font-semibold text-brand-900">Complete unit (for parts)</h2>
            <p className="mt-0.5 text-xs text-brand-800/80">
              Shown on the website under Parts → Complete units, not in the car stock list. Tick what you can supply from this unit.
            </p>
          </div>
          <div className="grid gap-4 p-5 sm:grid-cols-[16rem_1fr]">
            <div>
              <label className="label" htmlFor="unit_condition">
                Condition
              </label>
              <select id="unit_condition" name="unit_condition" className="input" defaultValue={vehicle?.unit_condition ?? ""} disabled={readOnly}>
                <option value="">—</option>
                {UNIT_CONDITIONS.map((c) => (
                  <option key={c} value={c}>
                    {UNIT_CONDITION_LABEL[c]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <span className="label">Cuts & parts available</span>
              <input type="hidden" name="unit_parts" value={unitParts.join(",")} />
              <div className="flex flex-wrap gap-2">
                {UNIT_PARTS.map((p) => {
                  const on = unitParts.includes(p);
                  return (
                    <button
                      key={p}
                      type="button"
                      disabled={readOnly}
                      aria-pressed={on}
                      onClick={() => togglePart(p)}
                      className={`rounded-full px-3 py-1.5 text-sm font-semibold ring-1 transition ${on ? "bg-brand-600 text-white ring-brand-600" : "bg-white text-slate-600 ring-slate-200 hover:ring-slate-300"}`}
                    >
                      {UNIT_PART_LABEL[p]}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </section>
      )}

      {ownership === "third_party" && (
        <section className="card border-amber-200">
          <div className="border-b border-amber-100 bg-amber-50/60 px-5 py-3.5">
            <h2 className="text-sm font-semibold text-amber-900">{t("stock_third_party")}</h2>
            <p className="mt-0.5 text-xs text-amber-800/80">{t("stock_third_party_help")}</p>
          </div>
          <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-3">
            <div>
              <label className="label" htmlFor="supplier_name">
                {t("f_supplier_name")}
              </label>
              <input id="supplier_name" name="supplier_name" defaultValue={vehicle?.supplier_name ?? ""} disabled={readOnly} className="input" />
            </div>
            <div>
              <label className="label" htmlFor="supplier_contact">
                {t("f_supplier_contact")}
              </label>
              <input id="supplier_contact" name="supplier_contact" defaultValue={vehicle?.supplier_contact ?? ""} disabled={readOnly} className="input" />
            </div>
            {showCost && (
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <label className="label" htmlFor="supplier_price">
                    {t("f_supplier_price")}
                  </label>
                  <input
                    id="supplier_price"
                    name="supplier_price"
                    type="number"
                    step="any"
                    min={0}
                    defaultValue={vehicle?.supplier_price ?? ""}
                    disabled={readOnly}
                    className="input"
                  />
                </div>
                <div>
                  <label className="label" htmlFor="supplier_currency">
                    &nbsp;
                  </label>
                  <select id="supplier_currency" name="supplier_currency" defaultValue={vehicle?.supplier_currency ?? "JPY"} disabled={readOnly} className="input">
                    {CURRENCIES.map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      <section className="card">
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-3.5">
          <h2 className="text-sm font-semibold">{t("stock_specs")}</h2>
          {!readOnly && (
            <a href="/admin/settings?tab=catalog" target="_blank" rel="noreferrer" className="text-xs font-semibold text-brand-600 hover:underline">
              Make or model not in the list? Manage makes &amp; models →
            </a>
          )}
        </div>
        <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-3">{SPECS.map(render)}</div>
      </section>

      {masters && (
        <section className="card">
          <h2 className="border-b border-slate-100 px-5 py-3.5 text-sm font-semibold">
            {t("f_auction_house")} · {t("f_yard")}
          </h2>
          <div className="p-5">
            <OriginPicker vehicle={vehicle} masters={masters} readOnly={readOnly} branch={branch} />
          </div>
        </section>
      )}

      {showCost && (
        <CostCalculator vehicle={vehicle} defaultFx={defaultFx} readOnly={readOnly} branch={branches.find((b) => b.code === branch) ?? DEFAULT_BRANCHES[0]} rates={rates} />
      )}

      <section className="card">
        <h2 className="border-b border-slate-100 px-5 py-3.5 text-sm font-semibold">{t("stock_pricing")}</h2>
        <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-3">
          {pricing.map(render)}
          <div className="sm:col-span-3">
            <label className="label" htmlFor="notes">
              {t("f_notes")}
            </label>
            <textarea id="notes" name="notes" rows={3} defaultValue={vehicle?.notes ?? ""} disabled={readOnly} className="input" />
          </div>
        </div>
      </section>

      {!readOnly && (
        <div className="flex items-center gap-3">
          <SubmitButton>{t("save")}</SubmitButton>
          {state.error && <p className="text-sm text-red-600">{state.error}</p>}
          {state.ok && <p className="text-sm text-emerald-600">{t("saved")}</p>}
        </div>
      )}
    </form>
  );
}
