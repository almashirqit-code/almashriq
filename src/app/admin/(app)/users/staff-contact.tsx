"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, ExternalLink, Loader2 } from "lucide-react";
import { useT } from "@/lib/i18n/client";
import { setStaffContact } from "./actions";
import { validWhatsapp, waLink } from "./contact";

/** Work phone + WhatsApp (required) for one staff member. Customers can verify these numbers on the website. */
export function StaffContact({ userId, phone, whatsapp }: { userId: string; phone: string | null; whatsapp: string | null }) {
  const { t } = useT();
  const router = useRouter();
  const [p, setP] = useState(phone ?? "");
  const [w, setW] = useState(whatsapp ?? "");
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [pending, start] = useTransition();
  const dirty = p !== (phone ?? "") || w !== (whatsapp ?? "");
  const missing = !w.trim();
  const wa = waLink(whatsapp);

  const save = () =>
    start(async () => {
      setError("");
      setSaved(false);
      if (!validWhatsapp(w)) return setError(t("users_whatsapp_required"));
      try {
        await setStaffContact(userId, p, w);
        setSaved(true);
        router.refresh();
      } catch (e) {
        setError((e as Error).message);
      }
    });

  return (
    <div className="space-y-1.5">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <label className="block">
          <span className="mb-0.5 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            {t("users_whatsapp")} <span className="text-red-600">*</span>
          </span>
          <input
            type="tel"
            inputMode="tel"
            maxLength={40}
            placeholder="+81 90 1234 5678"
            className={`input py-1.5 text-sm ${missing ? "!ring-red-300" : ""}`}
            value={w}
            disabled={pending}
            aria-invalid={missing}
            onChange={(e) => (setW(e.target.value), setSaved(false))}
          />
        </label>
        <label className="block">
          <span className="mb-0.5 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">{t("users_work_phone")}</span>
          <input type="tel" inputMode="tel" maxLength={40} className="input py-1.5 text-sm" value={p} disabled={pending} onChange={(e) => (setP(e.target.value), setSaved(false))} />
        </label>
      </div>
      <div className="flex min-h-5 flex-wrap items-center gap-2">
        {dirty && (
          <button type="button" onClick={save} disabled={pending} className="btn-primary py-1.5 text-xs">
            {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />} {t("save")}
          </button>
        )}
        {saved && !dirty && <span className="text-xs font-semibold text-emerald-600">{t("saved")}</span>}
        {wa && !dirty && (
          <a href={wa} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:underline">
            <ExternalLink className="h-3 w-3" /> {t("users_test_whatsapp")}
          </a>
        )}
        {error && <span className="text-xs font-semibold text-red-600">{error}</span>}
      </div>
    </div>
  );
}
