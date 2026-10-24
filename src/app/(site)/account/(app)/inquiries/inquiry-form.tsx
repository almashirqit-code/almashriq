"use client";

import { useActionState, useEffect, useRef } from "react";
import { AlertCircle, CheckCircle2, Loader2, Send } from "lucide-react";
import { sendPortalInquiry } from "./actions";

const F = "h-12 w-full rounded-xl px-3.5 text-sm";

export function PortalInquiryForm({ stock, agent }: { stock?: string; agent?: string | null }) {
  const [state, action, pending] = useActionState(sendPortalInquiry, {});
  const form = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.ok) form.current?.reset();
  }, [state]);

  return (
    <form ref={form} action={action} className="space-y-3">
      {state.ok && (
        <p className="flex items-start gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-900 ring-1 ring-emerald-300/40" role="status">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
          Sent. Your reference is <b>INQ-{state.no}</b>. {agent ? `${agent} will reply soon.` : "We'll reply soon."}
        </p>
      )}
      <div>
        <label htmlFor="stock_no" className="mb-1 block text-xs font-semibold">
          Car stock no. (optional)
        </label>
        <input id="stock_no" name="stock_no" defaultValue={stock ?? ""} placeholder="e.g. AM-36164" className={F} />
      </div>
      <div>
        <label htmlFor="message" className="mb-1 block text-xs font-semibold">
          Your message *
        </label>
        <textarea id="message" name="message" required rows={5} maxLength={4000} placeholder="Ask about a price, shipping, documents…" className="w-full rounded-xl px-3.5 py-3 text-sm" />
      </div>
      {state.error && (
        <p className="flex items-start gap-1.5 text-sm font-semibold text-brand-700" role="alert">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {state.error}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[var(--accent)] text-sm font-bold text-white shadow-lg shadow-brand-900/40 hover:bg-brand-700 disabled:opacity-60 sm:w-auto sm:px-6"
      >
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        {agent ? `Send to ${agent}` : "Send inquiry"}
      </button>
    </form>
  );
}
