"use client";

import { useActionState } from "react";
import { useT } from "@/lib/i18n/client";
import type { DictKey } from "@/lib/i18n/dictionaries";
import { CURRENCIES, VEHICLE_STATUSES, type Vehicle, type VehicleField } from "@/lib/types";
import { SubmitButton } from "@/components/buttons";
import type { FormState } from "./actions";

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
  { name: "model", required: true },
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
  { name: "status", type: "select", options: VEHICLE_STATUSES },
];

const MAKES = ["Toyota", "Nissan", "Honda", "Mazda", "Mitsubishi", "Subaru", "Suzuki", "Daihatsu", "Lexus", "Isuzu", "Hino", "Mercedes-Benz", "BMW", "Volkswagen", "Audi"];

export function VehicleForm({
  vehicle,
  action,
  showCost,
  readOnly = false,
}: {
  vehicle?: Partial<Vehicle>;
  action: (prev: FormState, fd: FormData) => Promise<FormState>;
  showCost: boolean;
  readOnly?: boolean;
}) {
  const { t } = useT();
  const [state, formAction] = useActionState(action, {});

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
          />
        )}
      </div>
    );
  };

  const pricing = PRICING.filter((f) => showCost || !["purchase_date", "purchase_price", "expenses"].includes(f.name));

  return (
    <form action={formAction} className="space-y-5">
      <datalist id="makes">
        {MAKES.map((m) => (
          <option key={m} value={m} />
        ))}
      </datalist>

      <section className="card">
        <h2 className="border-b border-slate-100 px-5 py-3.5 text-sm font-semibold">{t("stock_specs")}</h2>
        <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-3">{SPECS.map(render)}</div>
      </section>

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
