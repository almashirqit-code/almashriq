"use client";

import { useFormStatus } from "react-dom";
import { useTransition } from "react";
import { useT } from "@/lib/i18n/client";

export function SubmitButton({
  children,
  className = "btn-primary",
  name,
  value,
}: {
  children: React.ReactNode;
  className?: string;
  name?: string;
  value?: string;
}) {
  const { pending } = useFormStatus();
  const { t } = useT();
  return (
    <button type="submit" disabled={pending} className={className} name={name} value={value}>
      {pending ? t("saving") : children}
    </button>
  );
}

/** Runs a server action after a confirm() prompt. */
export function ConfirmButton({
  action,
  children,
  className = "btn-danger",
  message,
}: {
  action: () => Promise<unknown>;
  children: React.ReactNode;
  className?: string;
  message?: string;
}) {
  const [pending, start] = useTransition();
  const { t } = useT();
  return (
    <button
      type="button"
      disabled={pending}
      className={className}
      onClick={() => {
        if (!confirm(message ?? t("confirm_delete"))) return;
        start(async () => {
          try {
            await action();
          } catch (e) {
            // Next.js redirects are thrown as errors — let them through.
            if (e && typeof e === "object" && "digest" in e && String((e as { digest: string }).digest).startsWith("NEXT_REDIRECT")) throw e;
            alert((e as Error).message === "forbidden" ? t("forbidden") : (e as Error).message || t("error"));
          }
        });
      }}
    >
      {children}
    </button>
  );
}

export function PrintButton({ children }: { children: React.ReactNode }) {
  return (
    <button type="button" className="btn-primary" onClick={() => window.print()}>
      {children}
    </button>
  );
}
