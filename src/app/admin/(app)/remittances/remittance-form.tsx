"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FileText, ImageIcon, X } from "lucide-react";
import { useT } from "@/lib/i18n/client";
import { en, type DictKey } from "@/lib/i18n/dictionaries";
import { createClient } from "@/lib/supabase/client";
import { money, round } from "@/lib/format";
import { CURRENCIES, type Currency, type Remittance } from "@/lib/types";
import { DOC_ACCEPT, isAllowedDoc, uploadRemittanceDocs } from "@/lib/remittance-docs";
import { saveRemittance } from "./actions";

export type CustomerOption = { id: string; customer_no: number; name: string; company: string | null; phone: string | null; email: string | null };

export function RemittanceForm({
  customers,
  offices,
  shifts,
  defaultOffice = null,
  defaultShift = null,
  rates,
  initial,
}: {
  customers: CustomerOption[];
  offices: string[];
  shifts: string[];
  defaultOffice?: string | null;
  defaultShift?: string | null;
  rates: Record<Currency, number>;
  initial?: Partial<Remittance>;
}) {
  const { t, locale } = useT();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const empty = {
    customer_id: "",
    office: offices.length === 1 ? offices[0] : defaultOffice && offices.includes(defaultOffice) ? defaultOffice : "",
    shift: defaultShift ?? "",
    currency: "" as Currency | "",
    remitter: "",
    bank: "",
    bank_address: "",
    bank_phone: "",
    exchange_rate: "",
    instructed_amount: "",
    remit_amount: "",
    remit_date: "",
    received_date: new Date().toISOString().slice(0, 10),
    remarks: "",
  };
  const fromInitial = initial?.id
    ? {
        customer_id: initial.customer_id ?? "",
        office: initial.office ?? "",
        shift: initial.shift ?? "",
        currency: (initial.currency ?? "") as Currency | "",
        remitter: initial.remitter ?? "",
        bank: initial.bank ?? "",
        bank_address: initial.bank_address ?? "",
        bank_phone: initial.bank_phone ?? "",
        exchange_rate: String(initial.exchange_rate ?? ""),
        instructed_amount: String(initial.instructed_amount ?? ""),
        remit_amount: String(initial.remit_amount ?? ""),
        remit_date: initial.remit_date ?? "",
        received_date: initial.received_date ?? "",
        remarks: initial.remarks ?? "",
      }
    : empty;

  const [f, setF] = useState(fromInitial);
  const [files, setFiles] = useState<File[]>([]);
  const [custQuery, setCustQuery] = useState("");
  const [custOpen, setCustOpen] = useState(false);
  const set = (k: keyof typeof f, v: string) => setF((s) => ({ ...s, [k]: v }));

  const customer = customers.find((c) => c.id === f.customer_id);
  const custResults = useMemo(() => {
    const q = custQuery.trim().toLowerCase();
    return customers
      .filter(
        (c) =>
          !q ||
          String(c.customer_no).includes(q) ||
          [c.name, c.company, c.phone, c.email].filter(Boolean).join(" ").toLowerCase().includes(q)
      )
      .slice(0, 30);
  }, [custQuery, customers]);

  const charges =
    f.instructed_amount && f.remit_amount && f.currency
      ? round(Number(f.instructed_amount) - Number(f.remit_amount), f.currency as Currency)
      : null;

  function chooseCurrency(c: Currency) {
    setF((s) => ({ ...s, currency: c, exchange_rate: s.exchange_rate || (c === "JPY" ? "1" : String(rates[c] ?? "")) }));
  }

  function addFiles(list: FileList | null) {
    if (!list) return;
    const ok = Array.from(list).filter(isAllowedDoc);
    setFiles((prev) => [...prev, ...ok]);
    if (fileRef.current) fileRef.current.value = "";
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!f.currency) return setError(t("rem_select_currency"));
    start(async () => {
      const res = await saveRemittance({
        id: initial?.id,
        customer_id: f.customer_id,
        office: f.office,
        shift: f.shift || null,
        currency: f.currency as Currency,
        remitter: f.remitter,
        bank: f.bank,
        bank_address: f.bank_address,
        bank_phone: f.bank_phone || null,
        exchange_rate: Number(f.exchange_rate),
        instructed_amount: Number(f.instructed_amount),
        remit_amount: Number(f.remit_amount),
        remit_date: f.remit_date,
        received_date: f.received_date,
        remarks: f.remarks || null,
      });
      if (res.error) {
        setError(res.error in en ? t(res.error as DictKey) : res.error);
        return;
      }
      if (files.length && res.id) {
        const failed = await uploadRemittanceDocs(createClient(), res.id, files);
        if (failed.length) alert(t("rem_upload_failed", { names: failed.join(", ") }));
      }
      router.push(`/admin/remittances/${res.id}`);
      router.refresh();
    });
  }

  const label = (key: DictKey, required = false) => (
    <label className="mb-1 block text-sm font-medium text-slate-700">
      {t(key)}
      {locale === "en" && <span className="font-normal text-slate-400"> - {JA_LABELS[key] ?? ""}</span>}
      {required && <span className="text-red-500"> *</span>}
    </label>
  );

  return (
    <form onSubmit={submit} className="card p-5">
      <div className="grid grid-cols-1 gap-x-4 gap-y-5 md:grid-cols-2 xl:grid-cols-4">
        {/* Customer search */}
        <div className="relative">
          {label("rem_customer", true)}
          <button
            type="button"
            className="input flex items-center justify-between text-left"
            onClick={() => setCustOpen((o) => !o)}
          >
            <span className={customer ? "" : "text-slate-400"}>
              {customer ? `${customer.customer_no} · ${customer.name}` : t("rem_search_customer")}
            </span>
            <span className="text-slate-400">▾</span>
          </button>
          {custOpen && (
            <div className="absolute z-20 mt-1 w-full rounded-lg border border-slate-200 bg-white shadow-lg">
              <input
                autoFocus
                className="input rounded-b-none border-0 border-b"
                placeholder={t("rem_search_customer")}
                value={custQuery}
                onChange={(e) => setCustQuery(e.target.value)}
              />
              <ul className="max-h-64 overflow-auto py-1 text-sm">
                {custResults.length === 0 && <li className="px-3 py-2 text-slate-500">{t("no_results")}</li>}
                {custResults.map((c) => (
                  <li key={c.id}>
                    <button
                      type="button"
                      className="w-full px-3 py-1.5 text-left hover:bg-brand-50"
                      onClick={() => {
                        set("customer_id", c.id);
                        setCustOpen(false);
                        setCustQuery("");
                      }}
                    >
                      <span className="font-medium">{c.customer_no}</span> · {c.name}
                      {c.company ? ` (${c.company})` : ""}
                      <span className="block text-xs text-slate-500">{c.phone ?? c.email}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div>
          {label("rem_office", true)}
          <select className="input" required value={f.office} onChange={(e) => set("office", e.target.value)}>
            <option value="">{t("rem_select_office")}</option>
            {offices.map((o) => (
              <option key={o}>{o}</option>
            ))}
          </select>
        </div>
        <div>
          {label("rem_shift")}
          <select className="input" value={f.shift} onChange={(e) => set("shift", e.target.value)}>
            <option value="">{t("rem_select_shift")}</option>
            {shifts.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </div>
        <div>
          {label("rem_currency", true)}
          <select className="input" required value={f.currency} onChange={(e) => chooseCurrency(e.target.value as Currency)}>
            <option value="">{t("rem_select_currency")}</option>
            {CURRENCIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </div>

        <div>
          {label("rem_remitter", true)}
          <input className="input" required value={f.remitter} onChange={(e) => set("remitter", e.target.value)} />
        </div>
        <div>
          {label("rem_bank", true)}
          <input className="input" required value={f.bank} onChange={(e) => set("bank", e.target.value)} />
        </div>
        <div>
          {label("rem_bank_address", true)}
          <input className="input" required value={f.bank_address} onChange={(e) => set("bank_address", e.target.value)} />
        </div>
        <div>
          {label("rem_bank_phone")}
          <input className="input" type="tel" value={f.bank_phone} onChange={(e) => set("bank_phone", e.target.value)} />
        </div>

        <div>
          {label("rem_exchange_rate", true)}
          <input
            className="input"
            type="number"
            step="any"
            min="0"
            required
            value={f.exchange_rate}
            placeholder={f.currency ? t("rem_exchange_rate_help", { cur: f.currency }) : ""}
            onChange={(e) => set("exchange_rate", e.target.value)}
          />
        </div>
        <div>
          {label("rem_instructed", true)}
          <input className="input" type="number" step="any" min="0" required value={f.instructed_amount} onChange={(e) => set("instructed_amount", e.target.value)} />
        </div>
        <div>
          {label("rem_remit_amount", true)}
          <input className="input" type="number" step="any" min="0" required value={f.remit_amount} onChange={(e) => set("remit_amount", e.target.value)} />
        </div>
        <div>
          {label("rem_bank_charges", true)}
          <input
            className={`input ${charges !== null && charges < 0 ? "text-red-600" : ""}`}
            disabled
            value={charges === null ? "" : money(charges, f.currency as Currency, locale)}
          />
        </div>

        <div>
          {label("rem_remit_date", true)}
          <input className="input" type="date" required value={f.remit_date} onChange={(e) => set("remit_date", e.target.value)} />
        </div>
        <div>
          {label("rem_received_date", true)}
          <input className="input" type="date" required value={f.received_date} onChange={(e) => set("received_date", e.target.value)} />
        </div>
        <div>
          {label("rem_remarks")}
          <input className="input" value={f.remarks} onChange={(e) => set("remarks", e.target.value)} />
        </div>
        <div>
          {label("rem_documents")}
          <input ref={fileRef} type="file" multiple accept={DOC_ACCEPT} className="hidden" onChange={(e) => addFiles(e.target.files)} />
          <div className="flex overflow-hidden rounded-lg border border-slate-300 text-sm">
            <button type="button" className="shrink-0 border-r border-slate-300 bg-slate-50 px-3 py-2 hover:bg-slate-100" onClick={() => fileRef.current?.click()}>
              {t("rem_choose_files")}
            </button>
            <span className="truncate px-3 py-2 text-slate-500">
              {files.length ? t("rem_files_selected", { count: files.length }) : t("rem_no_files")}
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-400">{t("rem_documents_help")}</p>
        </div>
      </div>

      {files.length > 0 && (
        <ul className="mt-4 flex flex-wrap gap-2">
          {files.map((file, i) => (
            <li key={i} className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 py-1 pl-2 pr-1 text-xs">
              {file.type.startsWith("image/") ? <ImageIcon className="h-4 w-4 text-sky-600" /> : <FileText className="h-4 w-4 text-red-600" />}
              <span className="max-w-[16rem] truncate">{file.name}</span>
              <span className="text-slate-400">{(file.size / 1024 / 1024).toFixed(1)} MB</span>
              <button type="button" className="rounded p-0.5 text-slate-400 hover:bg-slate-200" onClick={() => setFiles((fs) => fs.filter((_, j) => j !== i))}>
                <X className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {error && <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <div className="mt-6 flex gap-2">
        <button
          type="button"
          className="btn-secondary"
          onClick={() => {
            setF(fromInitial);
            setFiles([]);
            setError("");
          }}
        >
          {t("rem_reset")}
        </button>
        <button type="submit" disabled={pending} className="btn-primary">
          {pending ? t("saving") : initial?.id ? t("rem_update") : t("rem_create")}
        </button>
      </div>
    </form>
  );
}

/** Bilingual labels like the existing system ("Customer - お客様"). */
const JA_LABELS: Partial<Record<DictKey, string>> = {
  rem_customer: "お客様",
  rem_office: "オフィス",
  rem_shift: "シフト",
  rem_currency: "通貨",
  rem_remitter: "送金者",
  rem_bank: "銀行",
  rem_bank_address: "銀行住所",
  rem_bank_phone: "銀行電話",
  rem_exchange_rate: "為替レート",
  rem_instructed: "指示金額",
  rem_remit_amount: "送金金額",
  rem_bank_charges: "銀行手数料",
  rem_remit_date: "送金日",
  rem_received_date: "送金受領日",
  rem_remarks: "備考",
  rem_documents: "書類",
};
