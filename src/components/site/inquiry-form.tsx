"use client";

import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import { Send, CheckCircle2, AlertCircle } from "lucide-react";
import { sendInquiry, type InquiryState } from "@/app/(site)/actions";

// Colours, 16px text on phones and focus ring come from the glass theme (site.css).
const F = "h-12 w-full rounded-xl px-3.5 text-sm";

export function InquiryForm({ stockNo, defaultMessage = "", source = "website", compact = false }: { stockNo?: string; defaultMessage?: string; source?: string; compact?: boolean }) {
  const [state, action, pending] = useActionState<InquiryState, FormData>(sendInquiry, null);
  const [url, setUrl] = useState("");
  useEffect(() => setUrl(window.location.href), []);

  if (state?.ok)
    return (
      <div className="rounded-2xl bg-emerald-50 p-5 text-emerald-900 ring-1 ring-emerald-300/40" role="status">
        <CheckCircle2 className="mb-2 h-7 w-7 text-emerald-600" />
        <p className="font-bold">{state.message}</p>
        {state.no ? <p className="mt-1 text-sm">Your reference: <b>INQ-{state.no}</b></p> : null}
      </div>
    );

  return (
    <form action={action} className="space-y-2.5">
      <input type="hidden" name="stock_no" value={stockNo ?? ""} />
      <input type="hidden" name="page_url" value={url} />
      <input type="hidden" name="source" value={source} />
      <div className="hidden" aria-hidden>
        <label>
          Website <input name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      <div className={`grid gap-2.5 ${compact ? "" : "sm:grid-cols-2"}`}>
        <input name="name" required placeholder="Your name *" autoComplete="name" className={F} aria-label="Your name" />
        <input name="email" type="email" inputMode="email" placeholder="Email" autoComplete="email" className={F} aria-label="Email" />
        <input name="phone" type="tel" inputMode="tel" placeholder="Phone / WhatsApp (or email)" autoComplete="tel" className={F} aria-label="Phone or WhatsApp" />
        <input name="country" placeholder="Country" autoComplete="country-name" className={F} aria-label="Country" />
      </div>
      <input name="port" placeholder="Destination port (e.g. Mombasa, Durban)" className={F} aria-label="Destination port" />
      <textarea name="message" rows={compact ? 3 : 5} defaultValue={defaultMessage} placeholder="Your message" className="w-full rounded-xl px-3.5 py-3 text-sm" aria-label="Message" />
      {state && !state.ok && (
        <p className="flex items-center gap-1.5 text-sm font-semibold text-brand-700">
          <AlertCircle className="h-4 w-4" /> {state.message}
        </p>
      )}
      <button disabled={pending} className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[var(--accent)] text-sm font-bold text-white shadow-lg shadow-brand-900/40 hover:bg-brand-700 disabled:opacity-60">
        <Send className="h-4 w-4" /> {pending ? "Sending…" : stockNo ? "Get a C&F quotation" : "Send inquiry"}
      </button>
      <p className="text-center text-xs text-white/60">
        We reply within 24 hours. Your details are only used to answer your inquiry —{" "}
        <Link href="/privacy" className="underline hover:text-white">
          Privacy Policy
        </Link>
        .
      </p>
    </form>
  );
}
