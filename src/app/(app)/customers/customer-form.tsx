"use client";

import { useActionState, useRef } from "react";
import { Copy } from "lucide-react";
import { useT } from "@/lib/i18n/client";
import { en, type DictKey } from "@/lib/i18n/dictionaries";
import type { Customer } from "@/lib/types";
import { SubmitButton } from "@/components/buttons";
import type { FormState } from "./actions";

type F = { name: keyof Customer; label: DictKey; type?: string; span?: boolean; required?: boolean; area?: boolean };

const MAIN: F[] = [
  { name: "name", label: "c_name", required: true },
  { name: "company", label: "c_company" },
  { name: "email", label: "c_email", type: "email" },
  { name: "phone", label: "c_phone", type: "tel" },
  { name: "whatsapp", label: "c_whatsapp", type: "tel" },
  { name: "country", label: "c_country" },
  { name: "port", label: "c_port" },
  { name: "address", label: "c_address", span: true, area: true },
];

const CONSIGNEE: F[] = [
  { name: "consignee_name", label: "c_consignee_name" },
  { name: "consignee_phone", label: "c_consignee_phone", type: "tel" },
  { name: "consignee_email", label: "c_consignee_email", type: "email" },
  { name: "consignee_address", label: "c_consignee_address", span: true, area: true },
  { name: "notify_party", label: "c_notify_party", span: true, area: true },
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
  const form = useRef<HTMLFormElement>(null);

  const error = state.error ? (state.error in en ? t(state.error as DictKey) : state.error) : "";

  function copyFromCustomer() {
    const el = form.current;
    if (!el) return;
    const get = (n: string) => (el.elements.namedItem(n) as HTMLInputElement | null)?.value ?? "";
    const set = (n: string, v: string) => {
      const input = el.elements.namedItem(n) as HTMLInputElement | null;
      if (input) input.value = v;
    };
    const name = [get("name"), get("company")].filter(Boolean).join(" / ");
    set("consignee_name", name);
    set("consignee_phone", get("phone") || get("whatsapp"));
    set("consignee_email", get("email"));
    set("consignee_address", [get("address"), get("country")].filter(Boolean).join("\n"));
  }

  const field = (f: F) => (
    <div key={f.name} className={f.span ? "sm:col-span-2" : ""}>
      <label className="label" htmlFor={f.name}>
        {t(f.label)}
        {f.required && <span className="text-red-500"> *</span>}
      </label>
      {f.area ? (
        <textarea id={f.name} name={f.name} rows={2} defaultValue={(customer?.[f.name] as string) ?? ""} className="input" />
      ) : (
        <input
          id={f.name}
          name={f.name}
          type={f.type ?? "text"}
          required={f.required}
          defaultValue={(customer?.[f.name] as string) ?? ""}
          className="input"
        />
      )}
    </div>
  );

  return (
    <form ref={form} action={formAction} className="space-y-5">
      {returnTo && <input type="hidden" name="return_to" value={returnTo} />}

      <section className="card">
        <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2">
          {MAIN.map(field)}
          <p className="text-xs text-slate-500 sm:col-span-2">{t("c_contact_hint")}</p>
          <div className="sm:col-span-2">
            <label className="label" htmlFor="notes">
              {t("notes")}
            </label>
            <textarea id="notes" name="notes" rows={2} defaultValue={customer?.notes ?? ""} className="input" />
          </div>
        </div>
      </section>

      <section className="card">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 px-5 py-3.5">
          <div>
            <h2 className="text-sm font-semibold">{t("cust_consignee")}</h2>
            <p className="mt-0.5 text-xs text-slate-500">{t("cust_consignee_help")}</p>
          </div>
          <button type="button" className="btn-secondary py-1.5 text-xs" onClick={copyFromCustomer}>
            <Copy className="h-3.5 w-3.5" />
            {t("cust_copy_from_customer")}
          </button>
        </div>
        <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2">{CONSIGNEE.map(field)}</div>
      </section>

      <div className="flex items-center gap-3">
        <SubmitButton>{t("save")}</SubmitButton>
        {error && <p className="text-sm text-red-600">{error}</p>}
        {state.ok && <p className="text-sm text-emerald-600">{t("saved")}</p>}
      </div>
    </form>
  );
}
