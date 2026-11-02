"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";
import { Send, CheckCircle2, AlertCircle, MessageCircle, X } from "lucide-react";
import { sendInquiry, quotePrefill, type InquiryState, type QuotePrefill } from "@/app/(site)/actions";
import { Turnstile } from "@/components/turnstile";

const F = "h-12 w-full rounded-xl px-3.5 text-sm";

/**
 * Short "Get quote" form for a car: the car is already attached, so only name, WhatsApp/phone and
 * destination are asked (email and a note are optional). Details are prefilled per visitor by quotePrefill().
 */
export function QuoteForm({ stockNo, title, wa, source = "car_page" }: { stockNo: string; title: string; wa: string | null; source?: string }) {
  const [state, action, pending] = useActionState<InquiryState, FormData>(sendInquiry, null);
  const [pre, setPre] = useState<QuotePrefill | null>(null);
  const [url, setUrl] = useState("");
  // What was typed last: React resets the form after each submit, so a failed send refills from this.
  const [typed, setTyped] = useState<Partial<QuotePrefill>>({});
  const name = typed.name ?? "";
  useEffect(() => {
    setUrl(window.location.href);
    quotePrefill().then(setPre, () => setPre({ name: "", email: "", phone: "", port: "", country: "" }));
  }, []);

  if (state?.ok)
    return (
      <div className="rounded-2xl bg-emerald-50 p-5 text-emerald-950 ring-1 ring-emerald-300/40" role="status">
        <CheckCircle2 className="mb-2 h-8 w-8 text-emerald-600" />
        <p className="text-lg font-black">Thanks{name ? `, ${name.split(" ")[0]}` : ""} — your quote request is in.</p>
        <p className="mt-1 text-sm">
          We&apos;ll send the C&amp;F price for <b>{stockNo}</b> to your WhatsApp within 24 hours (usually the same day).
        </p>
        {state.no ? <p className="mt-2 text-sm">Your reference: <b>INQ-{state.no}</b></p> : null}
        {wa && (
          <a href={wa} target="_blank" rel="noopener" className="mt-4 inline-flex h-11 items-center gap-2 rounded-xl bg-[#25D366] px-4 text-sm font-bold text-jet-950 hover:brightness-110">
            <MessageCircle className="h-4 w-4" /> Can&apos;t wait? Chat now
          </a>
        )}
      </div>
    );

  // Wait for the prefill so the inputs mount with their defaults (they are uncontrolled).
  if (!pre) return <div className="h-64 animate-pulse rounded-2xl bg-white/5" aria-busy="true" aria-label="Loading form" />;
  if (pre.signedIn)
    return (
      <SignedInSend action={action} pending={pending} state={state} pre={pre} label="Get my C&F quote">
        <input type="hidden" name="stock_no" value={stockNo} />
        <input type="hidden" name="message" value={`Please send me a C&F quotation for ${stockNo} ${title}.`} />
      </SignedInSend>
    );

  return (
    <form action={action} onSubmit={(e) => setTyped(Object.fromEntries(new FormData(e.currentTarget)) as Partial<QuotePrefill>)} className="space-y-2.5">
      <input type="hidden" name="quick" value="1" />
      <input type="hidden" name="stock_no" value={stockNo} />
      <input type="hidden" name="page_url" value={url} />
      <input type="hidden" name="source" value={source} />
      <input type="hidden" name="message" value={`Please send me a C&F quotation for ${stockNo} ${title}.`} />
      <div className="hidden" aria-hidden>
        <label>
          Website <input name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      <label className="block text-sm font-semibold">
        Your name
        <input name="name" required defaultValue={typed.name ?? pre.name} autoComplete="name" className={`${F} mt-1`} />
      </label>
      <label className="block text-sm font-semibold">
        WhatsApp / phone
        <input name="phone" type="tel" required inputMode="tel" defaultValue={typed.phone ?? pre.phone} placeholder="+254 712 345 678" autoComplete="tel" className={`${F} mt-1`} />
      </label>
      <label className="block text-sm font-semibold">
        Destination port or country
        <input name="port" required defaultValue={typed.port ?? (pre.port || pre.country)} placeholder="e.g. Mombasa, Kenya" autoComplete="country-name" className={`${F} mt-1`} />
      </label>
      <input type="hidden" name="country" value={pre.country} />
      <label className="block text-sm font-semibold">
        Email <span className="font-normal opacity-70">(optional)</span>
        <input name="email" type="email" inputMode="email" defaultValue={typed.email ?? pre.email} autoComplete="email" className={`${F} mt-1`} />
      </label>
      <Turnstile resetKey={state} />
      {state && !state.ok && (
        <p role="alert" className="flex items-center gap-1.5 text-sm font-semibold text-brand-700">
          <AlertCircle className="h-4 w-4 shrink-0" /> {state.message}
        </p>
      )}
      <button disabled={pending} className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[var(--accent)] text-sm font-bold text-white shadow-lg shadow-brand-900/40 hover:bg-brand-700 disabled:opacity-60">
        <Send className="h-4 w-4" /> {pending ? "Sending…" : "Get my C&F quote"}
      </button>
      {wa && (
        <a href={wa} target="_blank" rel="noopener" className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#25D366] text-sm font-bold text-jet-950 hover:brightness-110">
          <MessageCircle className="h-4 w-4" /> Or ask on WhatsApp
        </a>
      )}
      <p className="text-center text-xs opacity-70">
        Free, no obligation. Reply within 24 hours.{" "}
        <Link href="/privacy" className="underline">
          Privacy
        </Link>
      </p>
    </form>
  );
}

/**
 * Inquiry form for a signed-in customer: no contact fields — the account's saved details are used
 * and the inquiry goes to their agent (sendInquiry → portal_create_inquiry). Only an optional note.
 */
export function SignedInSend({
  action,
  pending,
  state,
  pre,
  label,
  noteRequired = false,
  children,
}: {
  action: (fd: FormData) => void;
  pending: boolean;
  state: InquiryState;
  pre: QuotePrefill;
  label: string;
  noteRequired?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <form action={action} className="space-y-2.5">
      {children}
      <div className="rounded-xl bg-white/5 px-3.5 py-3 text-sm ring-1 ring-white/10">
        <p>
          Sending as <b>{pre.name || pre.email}</b>
        </p>
        <p className="text-white/70">{pre.agent ? `Goes straight to your agent, ${pre.agent}.` : "Goes to our sales team with your account details."}</p>
      </div>
      <label className="block text-sm font-semibold">
        {noteRequired ? "Your message" : <>Note <span className="font-normal opacity-70">(optional)</span></>}
        <textarea name="note" rows={3} maxLength={4000} required={noteRequired} placeholder="e.g. destination port, budget, questions" className="mt-1 w-full rounded-xl px-3.5 py-3 text-sm leading-relaxed" />
      </label>
      {state && !state.ok && (
        <p role="alert" className="flex items-center gap-1.5 text-sm font-semibold text-brand-700">
          <AlertCircle className="h-4 w-4 shrink-0" /> {state.message}
        </p>
      )}
      <button disabled={pending} className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[var(--accent)] text-sm font-bold text-white shadow-lg shadow-brand-900/40 hover:bg-brand-700 disabled:opacity-60">
        <Send className="h-4 w-4" /> {pending ? "Sending…" : label}
      </button>
      <p className="text-center text-xs opacity-70">
        Not you?{" "}
        <Link href="/account/profile" className="underline">
          Update your details
        </Link>
      </p>
    </form>
  );
}

/** The same form as a bottom sheet (phones) / centred dialog, opened by <QuoteSheetButton>. */
export function QuoteSheet(props: { stockNo: string; title: string; wa: string | null }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    const show = () => {
      setOpen(true);
      d.showModal();
    };
    window.addEventListener("open-quote", show);
    return () => window.removeEventListener("open-quote", show);
  }, []);
  return (
    <dialog
      ref={ref}
      aria-labelledby="quote-sheet-title"
      onClick={(e) => e.target === ref.current && ref.current?.close()}
      className="quote-sheet glass-strong m-0 mt-auto w-full max-w-none rounded-t-3xl p-0 backdrop:bg-black/60 sm:m-auto sm:max-w-md sm:rounded-3xl"
    >
      <div className="max-h-[90dvh] overflow-y-auto overscroll-contain p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))]">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 id="quote-sheet-title" className="text-lg font-black">Get a quote</h2>
            <p className="truncate text-sm opacity-70">{props.stockNo} · {props.title}</p>
          </div>
          <button type="button" onClick={() => ref.current?.close()} aria-label="Close" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl hover:bg-black/5">
            <X className="h-5 w-5" />
          </button>
        </div>
        {open && <QuoteForm {...props} />}
      </div>
    </dialog>
  );
}

export function QuoteSheetButton({ className, children }: { className: string; children: React.ReactNode }) {
  return (
    <button type="button" onClick={() => window.dispatchEvent(new Event("open-quote"))} className={className}>
      {children}
    </button>
  );
}
