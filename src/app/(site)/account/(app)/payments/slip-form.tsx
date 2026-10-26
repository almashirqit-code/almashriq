"use client";

import { useRef, useState, useTransition } from "react";
import { AlertCircle, CheckCircle2, Loader2, Upload } from "lucide-react";
import { prepareFile } from "@/components/support-chat";
import { submitSlip } from "./actions";

const F = "h-12 w-full rounded-xl px-3.5 text-sm";
const LABEL = "mb-1 block text-xs font-semibold";

/** Send a TT / bank transfer slip (photo or PDF) with the amount, so staff can match it at the bank. */
export function SlipForm() {
  const form = useRef<HTMLFormElement>(null);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [pending, start] = useTransition();
  const today = new Date().toISOString().slice(0, 10);

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    start(async () => {
      setError("");
      setSent(false);
      const raw = fd.get("file");
      if (!(raw instanceof File) || raw.size === 0) return setError("Choose a photo or PDF of your slip.");
      // Photos are downscaled in the browser first, like support chat attachments.
      const file = await prepareFile(raw);
      if (typeof file === "string") return setError(file);
      fd.set("file", file);
      const r = await submitSlip(fd);
      if (r.error) return setError(r.error);
      form.current?.reset();
      setSent(true);
    });
  };

  return (
    <form ref={form} onSubmit={onSubmit} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <label htmlFor="slip_amount" className={LABEL}>Amount sent *</label>
          <input id="slip_amount" name="amount" required inputMode="decimal" placeholder="e.g. 4500" className={F} />
        </div>
        <div>
          <label htmlFor="slip_currency" className={LABEL}>Currency *</label>
          <select id="slip_currency" name="currency" required defaultValue="USD" className={F}>
            <option>USD</option>
            <option>JPY</option>
            <option>EUR</option>
            <option>GBP</option>
          </select>
        </div>
        <div>
          <label htmlFor="slip_date" className={LABEL}>Date sent *</label>
          <input id="slip_date" name="sent_on" type="date" required max={today} defaultValue={today} className={F} />
        </div>
        <div>
          <label htmlFor="slip_bank" className={LABEL}>Your bank</label>
          <input id="slip_bank" name="bank" maxLength={120} className={F} />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="slip_ref" className={LABEL}>Reference (invoice or car stock no.)</label>
          <input id="slip_ref" name="reference" maxLength={120} placeholder="e.g. INV-1024 or AM-36172" className={F} />
        </div>
      </div>
      <div>
        <label htmlFor="slip_note" className={LABEL}>Note</label>
        <textarea id="slip_note" name="note" rows={2} maxLength={1000} className="w-full rounded-xl px-3.5 py-3 text-sm" />
      </div>
      <div>
        <label htmlFor="slip_file" className={LABEL}>Slip (photo or PDF) *</label>
        <input id="slip_file" name="file" type="file" required accept="image/*,application/pdf" className="block w-full text-sm file:mr-3 file:h-11 file:rounded-xl file:border-0 file:bg-white/10 file:px-4 file:font-bold" />
      </div>
      {error && (
        <p className="flex items-start gap-1.5 text-sm font-semibold text-brand-700" role="alert">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {error}
        </p>
      )}
      {sent && (
        <p className="flex items-start gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-900 ring-1 ring-emerald-300/40" role="status">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
          Slip sent. We&apos;ll check it with our bank and update it here.
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[var(--accent)] text-sm font-bold text-white shadow-lg shadow-brand-900/40 hover:bg-brand-700 disabled:opacity-60 sm:w-auto sm:px-6"
      >
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
        Send slip
      </button>
    </form>
  );
}
