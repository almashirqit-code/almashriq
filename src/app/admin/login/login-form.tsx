"use client";

import { useActionState } from "react";
import { useT } from "@/lib/i18n/client";
import { signIn } from "./actions";
import { PasswordInput } from "@/components/password-input";

export function LoginForm() {
  const { t } = useT();
  const [state, action, pending] = useActionState(signIn, { error: "" });

  return (
    <form action={action} className="space-y-4">
      <div>
        <label className="label" htmlFor="email">
          {t("email")}
        </label>
        <input id="email" name="email" type="email" required autoComplete="email" className="input" />
      </div>
      <div>
        <label className="label" htmlFor="password">
          {t("password")}
        </label>
        <PasswordInput
          id="password"
          name="password"
          required
          autoComplete="current-password"
          showLabel={t("show_password")}
          hideLabel={t("hide_password")}
        />
      </div>
      {state.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error === "disabled" ? t("account_disabled") : t("login_failed")}
        </p>
      )}
      <button type="submit" disabled={pending} className="btn-primary w-full">
        {pending ? t("signing_in") : t("sign_in")}
      </button>
    </form>
  );
}
