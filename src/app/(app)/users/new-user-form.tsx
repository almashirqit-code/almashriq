"use client";

import { useActionState, useEffect, useRef } from "react";
import { useT } from "@/lib/i18n/client";
import type { DictKey } from "@/lib/i18n/dictionaries";
import { ROLES } from "@/lib/types";
import { SubmitButton } from "@/components/buttons";
import { createUser } from "./actions";

export function NewUserForm() {
  const { t } = useT();
  const [state, action] = useActionState(createUser, {});
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.ok) ref.current?.reset();
  }, [state]);

  return (
    <form ref={ref} action={action} className="card space-y-4 p-5">
      <h2 className="text-sm font-semibold">{t("users_new")}</h2>
      <div>
        <label className="label">{t("users_full_name")}</label>
        <input name="full_name" className="input" />
      </div>
      <div>
        <label className="label">{t("email")} *</label>
        <input name="email" type="email" required className="input" />
      </div>
      <div>
        <label className="label">{t("password")} *</label>
        <input name="password" type="password" minLength={8} required className="input" autoComplete="new-password" />
      </div>
      <div>
        <label className="label">{t("role")}</label>
        <select name="role" className="input" defaultValue="sales">
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {t(`role_${r}` as DictKey)}
            </option>
          ))}
        </select>
      </div>
      <SubmitButton>{t("users_new")}</SubmitButton>
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state.ok && <p className="text-sm text-emerald-600">{t("users_created")}</p>}
    </form>
  );
}
