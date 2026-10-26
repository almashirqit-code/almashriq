"use client";

import { useActionState, useEffect, useRef } from "react";
import { useT } from "@/lib/i18n/client";
import type { DictKey } from "@/lib/i18n/dictionaries";
import { ROLES } from "@/lib/types";
import { SubmitButton } from "@/components/buttons";
import { createUser } from "./actions";
import { PasswordInput } from "@/components/password-input";

export function NewUserForm({ offices, shifts }: { offices: string[]; shifts: string[] }) {
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
        <PasswordInput
          name="password"
          minLength={8}
          required
          autoComplete="new-password"
          showLabel={t("show_password")}
          hideLabel={t("hide_password")}
        />
      </div>
      <div>
        <label className="label">{t("users_whatsapp")} *</label>
        <input name="whatsapp" type="tel" inputMode="tel" required minLength={8} maxLength={40} placeholder="+81 90 1234 5678" className="input" />
        <p className="mt-1 text-xs text-slate-500">{t("users_whatsapp_help")}</p>
      </div>
      <div>
        <label className="label">{t("users_work_phone")}</label>
        <input name="phone" type="tel" inputMode="tel" maxLength={40} className="input" />
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
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">{t("rem_office")}</label>
          <select name="office" className="input" defaultValue="">
            <option value="">—</option>
            {offices.map((o) => (
              <option key={o}>{o}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">{t("rem_shift")}</label>
          <select name="shift" className="input" defaultValue="">
            <option value="">—</option>
            {shifts.map((o) => (
              <option key={o}>{o}</option>
            ))}
          </select>
        </div>
      </div>
      <SubmitButton>{t("users_new")}</SubmitButton>
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state.ok && <p className="text-sm text-emerald-600">{t("users_created")}</p>}
    </form>
  );
}
