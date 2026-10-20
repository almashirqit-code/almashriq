"use client";

import { useTransition } from "react";
import { KeyRound } from "lucide-react";
import { useT } from "@/lib/i18n/client";
import type { DictKey } from "@/lib/i18n/dictionaries";
import { ROLES, type Role } from "@/lib/types";
import { setRole, setActive, resetPassword } from "./actions";

export function UserRowActions({ id, role, active, isSelf }: { id: string; role: Role; active: boolean; isSelf: boolean }) {
  const { t } = useT();
  const [pending, start] = useTransition();
  const run = (fn: () => Promise<unknown>) =>
    start(async () => {
      try {
        await fn();
      } catch (e) {
        alert((e as Error).message);
      }
    });

  return (
    <div className={`flex flex-wrap items-center justify-end gap-2 ${pending ? "opacity-50" : ""}`}>
      <select
        className="input w-auto py-1.5"
        value={role}
        disabled={pending || isSelf}
        onChange={(e) => run(() => setRole(id, e.target.value as Role))}
      >
        {ROLES.map((r) => (
          <option key={r} value={r}>
            {t(`role_${r}` as DictKey)}
          </option>
        ))}
      </select>
      <button
        className="btn-secondary py-1.5"
        disabled={pending}
        title={t("users_reset_password")}
        onClick={() => {
          const pw = prompt(t("users_new_password"));
          if (pw) run(async () => {
            await resetPassword(id, pw);
            alert(t("saved"));
          });
        }}
      >
        <KeyRound className="h-4 w-4" />
      </button>
      {!isSelf && (
        <button
          className={active ? "btn-danger py-1.5" : "btn-secondary py-1.5"}
          disabled={pending}
          onClick={() => run(() => setActive(id, !active))}
        >
          {active ? t("users_disable") : t("users_enable")}
        </button>
      )}
    </div>
  );
}
