"use client";

import { useActionState } from "react";
import { Loader2, Search, ShieldCheck, ShieldAlert, ShieldX, Building2 } from "lucide-react";
import { verifyContact, type VerifyState } from "./actions";

/** Search box + result card for the "Verify an agent" page. */
export function VerifyForm({ contact }: { contact: React.ReactNode }) {
  const [state, action, pending] = useActionState<VerifyState, FormData>(verifyContact, {});
  return (
    <>
      <form action={action} className="flex flex-col gap-2 sm:flex-row">
        <label htmlFor="q" className="sr-only">
          Phone, WhatsApp or email
        </label>
        <input
          id="q"
          name="q"
          required
          minLength={6}
          maxLength={200}
          defaultValue={state.query ?? ""}
          placeholder="+81 90 1234 5678 or name@example.com"
          autoComplete="off"
          className="h-12 w-full rounded-xl px-3.5 text-sm"
        />
        <button
          type="submit"
          disabled={pending}
          className="inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-xl bg-[var(--accent)] px-6 text-sm font-bold text-white shadow-lg shadow-brand-900/40 hover:bg-brand-700 disabled:opacity-60"
        >
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          Check
        </button>
      </form>

      <div aria-live="polite">
        {state.error && <p className="mt-3 text-sm font-semibold text-brand-700">{state.error}</p>}

        {state.result === "staff" && state.staff && (
          <div className="mt-5 rounded-2xl bg-emerald-50 p-5 text-emerald-950 ring-1 ring-emerald-300/50">
            <div className="flex items-center gap-2 font-black">
              <ShieldCheck className="h-6 w-6 text-emerald-600" /> Genuine Al Mashriq staff
            </div>
            <div className="mt-4 flex items-center gap-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={state.staff.avatar} alt="" className="h-16 w-16 shrink-0 rounded-full object-cover ring-2 ring-white" />
              <div>
                <div className="text-lg font-black">{state.staff.name}</div>
                <div className="text-sm">
                  {state.staff.role}
                  {state.staff.office ? ` · ${state.staff.office} office` : ""}
                </div>
              </div>
            </div>
            <p className="mt-4 text-sm">
              <b>{state.query}</b> belongs to this person. Even so, only pay into the bank account printed on our invoice — our staff never ask you to pay into a personal account.
            </p>
          </div>
        )}

        {state.result === "company" && (
          <div className="mt-5 rounded-2xl bg-emerald-50 p-5 text-emerald-950 ring-1 ring-emerald-300/50">
            <div className="flex items-center gap-2 font-black">
              <Building2 className="h-6 w-6 text-emerald-600" /> Official Al Mashriq contact
            </div>
            <p className="mt-2 text-sm">
              <b>{state.query}</b> is one of our company&apos;s own lines.
            </p>
          </div>
        )}

        {state.result === "former" && (
          <div className="mt-5 rounded-2xl bg-red-50 p-5 text-red-950 ring-1 ring-red-300/50">
            <div className="flex items-center gap-2 font-black">
              <ShieldX className="h-6 w-6 text-red-600" /> No longer works with us
            </div>
            <p className="mt-2 text-sm">
              <b>{state.query}</b> belonged to a former staff member. Do not send money or documents to this contact, and please tell us who contacted you.
            </p>
            {contact}
          </div>
        )}

        {state.result === "none" && (
          <div className="mt-5 rounded-2xl bg-amber-50 p-5 text-amber-950 ring-1 ring-amber-300/50">
            <div className="flex items-center gap-2 font-black">
              <ShieldAlert className="h-6 w-6 text-amber-600" /> Not one of our contacts
            </div>
            <p className="mt-2 text-sm">
              We couldn&apos;t find <b>{state.query}</b> among our staff or company lines. It may be a scam — do not pay or share documents until you have confirmed with us using the contacts below.
            </p>
            {contact}
          </div>
        )}
      </div>
    </>
  );
}
