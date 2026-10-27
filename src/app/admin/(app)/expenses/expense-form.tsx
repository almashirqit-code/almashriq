"use client";

import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, Save, X } from "lucide-react";
import { prepareFile } from "@/components/support-chat";
import { CURRENCIES, type Currency } from "@/lib/types";
import { EXPENSE_CATEGORIES, PAYMENT_METHODS, type Expense } from "@/lib/expenses";
import { saveExpense } from "./actions";

/** Add / edit an expense. The rate to JPY starts from Configuration and can be changed for this payment. */
export function ExpenseForm({
  editing,
  stockNo,
  rates,
  offices,
  fixedOffice,
}: {
  editing: Expense | null;
  stockNo: string | null;
  rates: Record<Currency, number>;
  offices: string[];
  fixedOffice: string | null;
}) {
  const router = useRouter();
  const form = useRef<HTMLFormElement>(null);
  const [currency, setCurrency] = useState<Currency>(editing?.currency ?? "JPY");
  const [fx, setFx] = useState(String(editing?.fx_rate ?? 1));
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [pending, start] = useTransition();
  const today = new Date().toISOString().slice(0, 10);

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    start(async () => {
      setError("");
      setSaved(false);
      const raw = fd.get("file");
      if (raw instanceof File && raw.size > 0) {
        const file = await prepareFile(raw);
        if (typeof file === "string") return setError(file);
        fd.set("file", file);
      }
      const r = await saveExpense({}, fd);
      if (r.error) return setError(r.error);
      setSaved(true);
      if (editing) router.push("/admin/expenses");
      else {
        form.current?.reset();
        setCurrency("JPY");
        setFx("1");
      }
      router.refresh();
    });
  };

  return (
    <form ref={form} onSubmit={onSubmit} className="card space-y-3 p-5" key={editing?.id ?? "new"}>
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">{editing ? `Edit expense #${editing.id}` : "Add expense"}</h2>
        {editing && (
          <Link href="/admin/expenses" className="btn-ghost py-1 text-xs">
            <X className="h-3.5 w-3.5" /> Cancel
          </Link>
        )}
      </div>
      {editing && <input type="hidden" name="id" value={editing.id} />}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label" htmlFor="ex_date">Date *</label>
          <input id="ex_date" name="expense_date" type="date" required max={today} defaultValue={editing?.expense_date ?? today} className="input" />
        </div>
        <div>
          <label className="label" htmlFor="ex_cat">Category *</label>
          <select id="ex_cat" name="category" required defaultValue={editing?.category ?? ""} className="input">
            <option value="" disabled>
              Choose…
            </option>
            {EXPENSE_CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <label className="label" htmlFor="ex_desc">Description *</label>
        <input id="ex_desc" name="description" required maxLength={300} defaultValue={editing?.description ?? ""} placeholder="e.g. October yard rent" className="input" />
      </div>
      <div className="grid grid-cols-[1fr_6rem] gap-3">
        <div>
          <label className="label" htmlFor="ex_amount">Amount *</label>
          <input id="ex_amount" name="amount" required inputMode="decimal" defaultValue={editing?.amount ?? ""} className="input" />
        </div>
        <div>
          <label className="label" htmlFor="ex_cur">Currency</label>
          <select
            id="ex_cur"
            name="currency"
            value={currency}
            onChange={(e) => {
              const c = e.target.value as Currency;
              setCurrency(c);
              setFx(String(c === "JPY" ? 1 : rates[c] ?? ""));
            }}
            className="input"
          >
            {CURRENCIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>
      {currency !== "JPY" && (
        <div>
          <label className="label" htmlFor="ex_fx">Rate: 1 {currency} = ? JPY *</label>
          <input id="ex_fx" name="fx_rate" required inputMode="decimal" value={fx} onChange={(e) => setFx(e.target.value)} className="input" />
        </div>
      )}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label" htmlFor="ex_to">Paid to</label>
          <input id="ex_to" name="paid_to" maxLength={120} defaultValue={editing?.paid_to ?? ""} className="input" />
        </div>
        <div>
          <label className="label" htmlFor="ex_method">Paid by</label>
          <select id="ex_method" name="payment_method" defaultValue={editing?.payment_method ?? ""} className="input">
            <option value="">—</option>
            {PAYMENT_METHODS.map((m) => (
              <option key={m}>{m}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="ex_ref">Reference / receipt no.</label>
          <input id="ex_ref" name="reference" maxLength={120} defaultValue={editing?.reference ?? ""} className="input" />
        </div>
        <div>
          <label className="label" htmlFor="ex_stock">Car stock no.</label>
          <input id="ex_stock" name="stock_no" maxLength={40} defaultValue={stockNo ?? ""} placeholder="optional" className="input" />
        </div>
      </div>
      {fixedOffice ? (
        <p className="text-xs text-slate-500">Office: {fixedOffice}</p>
      ) : (
        offices.length > 0 && (
          <div>
            <label className="label" htmlFor="ex_office">Office</label>
            <select id="ex_office" name="office" defaultValue={editing?.office ?? ""} className="input">
              <option value="">— company-wide —</option>
              {offices.map((o) => (
                <option key={o}>{o}</option>
              ))}
            </select>
          </div>
        )
      )}
      <div>
        <label className="label" htmlFor="ex_file">{editing?.receipt_path ? "Replace receipt (photo or PDF)" : "Receipt (photo or PDF)"}</label>
        <input id="ex_file" name="file" type="file" accept="image/*,application/pdf" className="block w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-sm file:font-semibold" />
      </div>
      <p className="text-xs text-slate-500">Costs of one car (auction, transport, repairs) can also go in that car&apos;s own expenses — enter each cost in one place only, so it isn&apos;t counted twice.</p>
      {error && <p className="text-sm font-semibold text-red-600">{error}</p>}
      {saved && !error && <p className="text-sm font-semibold text-emerald-600">Saved.</p>}
      <button type="submit" disabled={pending} className="btn-primary w-full justify-center">
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
        {editing ? "Save changes" : "Add expense"}
      </button>
    </form>
  );
}
