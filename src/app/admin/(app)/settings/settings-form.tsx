"use client";

import { useActionState, useRef, useState } from "react";
import { ImagePlus, X } from "lucide-react";
import { useT } from "@/lib/i18n/client";
import { createClient } from "@/lib/supabase/client";
import { resizeImage } from "@/lib/images";
import { CURRENCIES, type Settings } from "@/lib/types";
import { SubmitButton } from "@/components/buttons";
import { saveSettings, type SettingsState } from "./actions";

export function SettingsForm({ settings }: { settings: Settings }) {
  const { t } = useT();
  const [state, action] = useActionState(saveSettings, {} as SettingsState);
  const [logo, setLogo] = useState(settings.logo_url ?? "");
  const [stamp, setStamp] = useState(settings.stamp_url ?? "");
  const stampRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function uploadStamp(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    try {
      const supabase = createClient();
      const body = await resizeImage(file, 900, 0.92);
      const ext = body.type === "image/png" ? "png" : "jpg";
      const path = `company/stamp-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("vehicle-images").upload(path, body, { contentType: body.type || file.type });
      if (error) throw error;
      setStamp(supabase.storage.from("vehicle-images").getPublicUrl(path).data.publicUrl);
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setUploading(false);
    }
  }

  async function uploadLogo(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    try {
      const supabase = createClient();
      const body = file.type === "image/svg+xml" ? file : await resizeImage(file, 600, 0.9);
      const ext = file.type === "image/svg+xml" ? "svg" : body.type === "image/png" ? "png" : "jpg";
      const path = `company/logo-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("vehicle-images").upload(path, body, { contentType: body.type || file.type });
      if (error) throw error;
      setLogo(supabase.storage.from("vehicle-images").getPublicUrl(path).data.publicUrl);
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setUploading(false);
    }
  }

  const text = (name: keyof Settings, label: string, opts: { area?: boolean; span?: boolean; type?: string } = {}) => (
    <div className={opts.span ? "sm:col-span-2" : ""}>
      <label className="label" htmlFor={name}>
        {label}
      </label>
      {opts.area ? (
        <textarea id={name} name={name} rows={4} defaultValue={(settings[name] as string) ?? ""} className="input" />
      ) : (
        <input id={name} name={name} type={opts.type ?? "text"} defaultValue={(settings[name] as string) ?? ""} className="input" />
      )}
    </div>
  );

  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="logo_url" value={logo} />
      <input type="hidden" name="stamp_url" value={stamp} />

      <section className="card">
        <h2 className="border-b border-slate-100 px-5 py-3.5 text-sm font-semibold">{t("settings_company")}</h2>
        <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2">
          {text("company_name", t("settings_company_name"))}
          {text("company_name_ja", t("settings_company_name_ja"))}
          {text("address", t("settings_address"), { area: true, span: true })}
          {text("phone", t("settings_phone"))}
          {text("fax", t("settings_fax"))}
          {text("mobile", t("settings_mobile"))}
          {text("email", t("settings_email"), { type: "email" })}
          {text("website", t("settings_website"))}
          <div>
            <label className="label">{t("settings_logo")}</label>
            <div className="flex items-center gap-3">
              {!logo && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src="/brand/logo.png" alt="" className="h-14 w-auto rounded border border-dashed border-slate-200 bg-white object-contain p-1 opacity-70" />
              )}
              {logo ? (
                <div className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={logo} alt="" className="h-14 w-auto rounded border border-slate-200 bg-white object-contain p-1" />
                  <button type="button" onClick={() => setLogo("")} className="absolute -right-2 -top-2 rounded-full bg-white p-0.5 text-slate-500 shadow">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : null}
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => uploadLogo(e.target.files?.[0])} />
              <button type="button" className="btn-secondary" disabled={uploading} onClick={() => fileRef.current?.click()}>
                <ImagePlus className="h-4 w-4" />
                {uploading ? "…" : t("upload")}
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="card">
        <h2 className="border-b border-slate-100 px-5 py-3.5 text-sm font-semibold">{t("settings_stamp")}</h2>
        <div className="flex flex-wrap items-center gap-4 p-5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={stamp || "/brand/stamp.png"} alt="" className="h-16 w-auto rounded border border-slate-200 bg-white object-contain p-1" />
          <input ref={stampRef} type="file" accept="image/*" className="hidden" onChange={(e) => uploadStamp(e.target.files?.[0])} />
          <button type="button" className="btn-secondary" disabled={uploading} onClick={() => stampRef.current?.click()}>
            <ImagePlus className="h-4 w-4" />
            {uploading ? "…" : t("upload")}
          </button>
          {stamp && (
            <button type="button" className="btn-ghost text-xs" onClick={() => setStamp("")}>
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </section>

      <section className="card">
        <h2 className="border-b border-slate-100 px-5 py-3.5 text-sm font-semibold">{t("settings_invoicing")}</h2>
        <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-4">
          <div>
            <label className="label">{t("settings_default_currency")}</label>
            <select name="default_currency" defaultValue={settings.default_currency} className="input">
              {CURRENCIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">{t("settings_prefix")}</label>
            <input name="invoice_prefix" defaultValue={settings.invoice_prefix} className="input" />
            <p className="mt-1 text-xs text-slate-400">{t("settings_prefix_help")}</p>
          </div>
          <div>
            <label className="label">{t("settings_next_no")}</label>
            <input name="next_invoice_no" type="number" min={1} defaultValue={settings.next_invoice_no} className="input" />
          </div>
          <div>
            <label className="label">{t("settings_tax")}</label>
            <input name="tax_rate" type="number" min={0} step="any" defaultValue={settings.tax_rate} className="input" />
          </div>
          <div className="sm:col-span-2">
            <label className="label">{t("settings_bank")}</label>
            <textarea name="bank_details" rows={5} defaultValue={settings.bank_details ?? ""} className="input" placeholder={"Bank: MUFG Bank\nBranch: Yokohama\nSWIFT: BOTKJPJT\nAccount: 1234567\nBeneficiary: Al Mashriq Trading"} />
          </div>
          <div className="sm:col-span-2">
            <label className="label">{t("settings_intermediary")}</label>
            <textarea name="intermediary_bank" rows={5} defaultValue={settings.intermediary_bank ?? ""} className="input" />
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-700 sm:col-span-2">
            <input type="checkbox" name="show_bank_on_website" defaultChecked={settings.show_bank_on_website ?? true} className="h-4 w-4 rounded border-slate-300" />
            {t("settings_bank_public")}
          </label>
          <div className="sm:col-span-2">
            <label className="label">{t("settings_terms")}</label>
            <textarea name="invoice_terms" rows={5} defaultValue={settings.invoice_terms ?? ""} className="input" />
          </div>
        </div>
      </section>

      <section className="card">
        <div className="border-b border-slate-100 px-5 py-3.5">
          <h2 className="text-sm font-semibold">{t("settings_rates")}</h2>
          <p className="mt-0.5 text-xs text-slate-500">{t("settings_rates_help")}</p>
        </div>
        <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-3">
          {CURRENCIES.filter((c) => c !== "JPY").map((c) => (
            <div key={c}>
              <label className="label">1 {c} = ? JPY</label>
              <input name={`rate_${c}`} type="number" step="any" min="0" required defaultValue={settings.exchange_rates?.[c] ?? ""} className="input" />
            </div>
          ))}
        </div>
      </section>

      <section className="card">
        <h2 className="border-b border-slate-100 px-5 py-3.5 text-sm font-semibold">{t("settings_remittances")}</h2>
        <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="offices">{t("settings_offices")}</label>
            <textarea id="offices" name="offices" rows={4} className="input" defaultValue={(settings.offices ?? ["Head Office"]).join("\n")} />
          </div>
          <div>
            <label className="label" htmlFor="shifts">{t("settings_shifts")}</label>
            <textarea id="shifts" name="shifts" rows={4} className="input" defaultValue={(settings.shifts ?? []).join("\n")} />
          </div>
        </div>
      </section>

      <div className="flex items-center gap-3">
        <SubmitButton>{t("save")}</SubmitButton>
        {state.error && <p className="text-sm text-red-600">{state.error}</p>}
        {state.ok && <p className="text-sm text-emerald-600">{t("saved")}</p>}
      </div>
    </form>
  );
}
