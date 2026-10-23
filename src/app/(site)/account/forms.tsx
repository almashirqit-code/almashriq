"use client";

import Link from "next/link";
import { useActionState } from "react";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { PasswordInput } from "@/components/password-input";
import { customerSignIn, customerSignUp, requestPasswordReset, updatePassword, type AuthState } from "./actions";

const F = "h-12 w-full rounded-xl px-3.5 text-sm";
const BTN =
  "inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[var(--accent)] text-sm font-bold text-white shadow-lg shadow-brand-900/40 hover:bg-brand-700 disabled:opacity-60";
const LABEL = "mb-1 block text-xs font-semibold";

function ErrorLine({ state }: { state: AuthState }) {
  if (!state.error) return null;
  return (
    <p className="flex items-start gap-1.5 text-sm font-semibold text-brand-700" role="alert">
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {state.error}
    </p>
  );
}

function Done({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-emerald-50 p-5 text-emerald-900 ring-1 ring-emerald-300/40" role="status">
      <CheckCircle2 className="mb-2 h-7 w-7 text-emerald-600" />
      <p className="font-bold">{title}</p>
      <div className="mt-1 text-sm">{children}</div>
    </div>
  );
}

function Submit({ pending, children }: { pending: boolean; children: React.ReactNode }) {
  return (
    <button type="submit" disabled={pending} className={BTN}>
      {pending && <Loader2 className="h-4 w-4 animate-spin" />}
      {children}
    </button>
  );
}

export function SignInForm() {
  const [state, action, pending] = useActionState(customerSignIn, {});
  return (
    <form action={action} className="space-y-3">
      <div>
        <label htmlFor="email" className={LABEL}>Email</label>
        <input id="email" name="email" type="email" inputMode="email" required autoComplete="email" className={F} />
      </div>
      <div>
        <div className="mb-1 flex items-center justify-between">
          <label htmlFor="password" className="block text-xs font-semibold">Password</label>
          <Link href="/account/forgot" className="text-xs font-semibold text-brand-700 hover:underline">Forgot password?</Link>
        </div>
        <PasswordInput id="password" name="password" required autoComplete="current-password" className={F} />
      </div>
      <ErrorLine state={state} />
      <Submit pending={pending}>Sign in</Submit>
    </form>
  );
}

export function SignUpForm() {
  const [state, action, pending] = useActionState(customerSignUp, {});
  if (state.ok)
    return (
      <Done title="Check your email">
        We sent you a link to confirm your email address. Open it to finish creating your account, then sign in.
      </Done>
    );
  return (
    <form action={action} className="space-y-3">
      <div className="hidden" aria-hidden>
        <label>
          Website <input name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      <div>
        <label htmlFor="full_name" className={LABEL}>Your name *</label>
        <input id="full_name" name="full_name" required autoComplete="name" className={F} />
      </div>
      <div>
        <label htmlFor="company" className={LABEL}>Company</label>
        <input id="company" name="company" autoComplete="organization" className={F} />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="phone" className={LABEL}>Phone</label>
          <input id="phone" name="phone" type="tel" inputMode="tel" autoComplete="tel" className={F} />
        </div>
        <div>
          <label htmlFor="whatsapp" className={LABEL}>WhatsApp</label>
          <input id="whatsapp" name="whatsapp" type="tel" inputMode="tel" className={F} />
        </div>
        <div>
          <label htmlFor="country" className={LABEL}>Country</label>
          <input id="country" name="country" autoComplete="country-name" className={F} />
        </div>
        <div>
          <label htmlFor="port" className={LABEL}>Destination port</label>
          <input id="port" name="port" placeholder="e.g. Mombasa" className={F} />
        </div>
      </div>
      <div>
        <label htmlFor="email" className={LABEL}>Email *</label>
        <input id="email" name="email" type="email" inputMode="email" required autoComplete="email" className={F} />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="password" className={LABEL}>Password *</label>
          <PasswordInput id="password" name="password" required minLength={8} autoComplete="new-password" className={F} />
        </div>
        <div>
          <label htmlFor="confirm" className={LABEL}>Confirm password *</label>
          <PasswordInput id="confirm" name="confirm" required minLength={8} autoComplete="new-password" className={F} />
        </div>
      </div>
      <ErrorLine state={state} />
      <Submit pending={pending}>Create account</Submit>
    </form>
  );
}

export function ForgotForm() {
  const [state, action, pending] = useActionState(requestPasswordReset, {});
  if (state.ok)
    return (
      <Done title="Check your email">
        If an account exists for that address, we&apos;ve sent a link to set a new password. It can take a few minutes to arrive.
      </Done>
    );
  return (
    <form action={action} className="space-y-3">
      <div>
        <label htmlFor="email" className={LABEL}>Email</label>
        <input id="email" name="email" type="email" inputMode="email" required autoComplete="email" className={F} />
      </div>
      <ErrorLine state={state} />
      <Submit pending={pending}>Send reset link</Submit>
    </form>
  );
}

export function ResetForm() {
  const [state, action, pending] = useActionState(updatePassword, {});
  return (
    <form action={action} className="space-y-3">
      <div>
        <label htmlFor="password" className={LABEL}>New password</label>
        <PasswordInput id="password" name="password" required minLength={8} autoComplete="new-password" className={F} />
      </div>
      <div>
        <label htmlFor="confirm" className={LABEL}>Confirm new password</label>
        <PasswordInput id="confirm" name="confirm" required minLength={8} autoComplete="new-password" className={F} />
      </div>
      <ErrorLine state={state} />
      <Submit pending={pending}>Save new password</Submit>
    </form>
  );
}
