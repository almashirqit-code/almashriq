"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useT } from "@/lib/i18n/client";
import { updateInquiry } from "./actions";
import { INQUIRY_STATUSES, type InquiryStatus } from "./status";
import { INQ_LABEL, INQ_STYLE } from "./status";

export function AssignSelect({ id, value, staff, disabled }: { id: string; value: string | null; staff: { id: string; name: string }[]; disabled?: boolean }) {
  const router = useRouter();
  const { t } = useT();
  const [v, setV] = useState(value ?? "");
  const [pending, start] = useTransition();
  return (
    <select
      className={`input w-44 py-1.5 text-xs ${pending ? "opacity-60" : ""}`}
      value={v}
      disabled={disabled || pending}
      onChange={(e) => {
        const next = e.target.value;
        setV(next);
        start(async () => {
          const r = await updateInquiry(id, { assigned_to: next || null });
          if (r.error) alert(r.error);
          router.refresh();
        });
      }}
    >
      <option value="">{t("iq_unassigned_opt")}</option>
      {staff.map((s) => (
        <option key={s.id} value={s.id}>
          {s.name}
        </option>
      ))}
    </select>
  );
}

export function StatusButtons({ id, value }: { id: string; value: string }) {
  const router = useRouter();
  const { t } = useT();
  const [pending, start] = useTransition();
  return (
    <div className="flex flex-wrap gap-1.5">
      {INQUIRY_STATUSES.map((s) => (
        <button
          key={s}
          type="button"
          disabled={pending}
          onClick={() =>
            start(async () => {
              const r = await updateInquiry(id, { status: s as InquiryStatus });
              if (r.error) alert(r.error);
              router.refresh();
            })
          }
          className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset transition ${
            value === s ? INQ_STYLE[s] + " shadow-sm" : "bg-white text-slate-500 ring-slate-200 hover:bg-slate-50"
          }`}
        >
          {t(INQ_LABEL[s])}
        </button>
      ))}
    </div>
  );
}

export function NotesBox({ id, value }: { id: string; value: string | null }) {
  const router = useRouter();
  const { t } = useT();
  const [v, setV] = useState(value ?? "");
  const [saved, setSaved] = useState(false);
  const [pending, start] = useTransition();
  return (
    <div>
      <textarea className="input" rows={4} value={v} onChange={(e) => (setV(e.target.value), setSaved(false))} placeholder={t("iq_notes_ph")} />
      <div className="mt-2 flex items-center justify-end gap-2">
        {saved && <span className="text-xs text-emerald-600">{t("saved")}</span>}
        <button
          type="button"
          className="btn-secondary py-1.5 text-xs"
          disabled={pending}
          onClick={() =>
            start(async () => {
              const r = await updateInquiry(id, { notes: v });
              if (r.error) return alert(r.error);
              setSaved(true);
              router.refresh();
            })
          }
        >
          {t("iq_save_notes")}
        </button>
      </div>
    </div>
  );
}
