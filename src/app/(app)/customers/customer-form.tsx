"use client";

import { useActionState } from "react";
import { useT } from "@/lib/i18n/client";
import type { DictKey } from "@/lib/i18n/dictionaries";
import type { Customer } from "@/lib/types";
import { SubmitButton } from "@/components/buttons";
import type { FormState } from "./actions";

const FIELDS: { name: keyof Customer; label: DictKey; type?: string; span?: boolean; required?: boolean }[] = [
  { name: "name", label: "c_name", required: true },
  { name: "company", label: "c_company" },
  { name: "country", label: "c_country" },
  { name: "port", label: "c_port" },
  { name: "email", label: "c_email", type: "email" },
  { name: "phone", label: "c_phone", type: "tel" },
  { name: "whatsapp", label: "c_whatsapp", type: "tel" },
  { name: "address", label: "c_address", span: true },
];

export function CustomerForm({
  customer,
  action,
  returnTo,
}: {
  customer?: Partial<Customer>;
  action: (prev: FormState, fd: FormData) => Promise<FormState>;
  returnTo?: string;
}) {
  const { t } = useT();
  const [state, formAction] = useActionState(action, {});
  return (
    <form action={formAction} className="card space-y-5 p-5">
      {returnTo && <input type="hidden" name="return_to" value={returnTo} />}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {FIELDS.map((f) => (
          <div key={f.name} className={f.span ? "sm:col-span-2" : ""}>
            <label className="label" htmlFor={f.name}>
              {t(f.label)}
              {f.required && <span className="text-red-500"> *</span>}
            </label>
            <input
              id={f.name}
              name={f.name}
              type={f.type ?? "text"}
              required={f.required}
              defaultValue={(customer?.[f.name] as string) ?? ""}
              className="input"
            />
          </div>
        ))}
        <div className="sm:col-span-2">
          <label className="label" htmlFor="notes">
            {t("notes")}
          </label>
          <textarea id="notes" name="notes" rows={3} defaultValue={customer?.notes ?? ""} className="input" />
        </div>
      </div>
      <div className="flex items-center gap-3">
        <SubmitButton>{t("save")}</SubmitButton>
        {state.error && <p className="text-sm text-red-600">{state.error}</p>}
        {state.ok && <p className="text-sm text-emerald-600">{t("saved")}</p>}
      </div>
    </form>
  );
}
