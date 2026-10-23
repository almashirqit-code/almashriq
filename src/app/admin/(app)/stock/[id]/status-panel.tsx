"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { History, Lock, Unlock } from "lucide-react";
import { useT } from "@/lib/i18n/client";
import type { DictKey } from "@/lib/i18n/dictionaries";
import { VEHICLE_STATUSES, type VehicleStatus } from "@/lib/types";
import { releaseVehicleStatus, setVehicleStatusManual } from "../actions";

export type StatusChange = {
  id: number;
  old_status: VehicleStatus | null;
  new_status: VehicleStatus;
  manual: boolean;
  note: string;
  created_at: string;
  profiles: { full_name: string | null; email: string | null } | null;
};

/**
 * Admin-only: set a car's status by hand (to settle old data). A reason is required and every change
 * is logged. While the status is manual, invoices and reservations no longer change it automatically;
 * "Back to automatic" hands it back to those rules.
 */
export function StatusPanel({
  vehicleId,
  status,
  manual,
  history,
}: {
  vehicleId: string;
  status: VehicleStatus;
  manual: boolean;
  history: StatusChange[];
}) {
  const { t, locale } = useT();
  const router = useRouter();
  const [next, setNext] = useState<VehicleStatus>(status);
  const [note, setNote] = useState("");
  const [err, setErr] = useState("");
  const [pending, start] = useTransition();
  const label = (s: VehicleStatus | null) => (s ? t(`vs_${s}` as DictKey) : "—");

  const save = () =>
    start(async () => {
      setErr("");
      const r = await setVehicleStatusManual(vehicleId, next, note);
      if (r.error) return setErr(r.error);
      setNote("");
      router.refresh();
    });
  const release = () =>
    start(async () => {
      setErr("");
      const r = await releaseVehicleStatus(vehicleId);
      if (r.error) return setErr(r.error);
      router.refresh();
    });

  return (
    <section className="card overflow-hidden">
      <div className="card-head">
        <h2 className="card-title">
          {manual ? <Lock className="h-4 w-4 text-amber-600" /> : <Unlock className="h-4 w-4 text-slate-400" />}
          Change status
        </h2>
        {manual ? (
          <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-bold text-amber-800 ring-1 ring-amber-200">Manual</span>
        ) : (
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-600">Automatic</span>
        )}
      </div>
      <div className="space-y-3 px-5 py-4">
        <p className="text-xs text-slate-500">
          {manual
            ? "Set by hand: invoices and reservations won't change this car's status until you hand it back to automatic."
            : "Normally set automatically from invoices and reservations. Change it here to settle old data — a reason is required and the change is logged."}
        </p>
        <div className="grid gap-2 sm:grid-cols-[10rem_1fr]">
          <select className="input" value={next} onChange={(e) => setNext(e.target.value as VehicleStatus)} aria-label="New status">
            {VEHICLE_STATUSES.map((s) => (
              <option key={s} value={s}>
                {label(s)}
              </option>
            ))}
          </select>
          <input className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Reason (e.g. sold in 2025 before the ERP)" aria-label="Reason" maxLength={300} />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" className="btn-primary" disabled={pending || !note.trim() || (next === status && manual)} onClick={save}>
            {pending ? t("saving") : "Save status"}
          </button>
          {manual && (
            <button type="button" className="btn-secondary" disabled={pending} onClick={release}>
              Back to automatic
            </button>
          )}
          {err && <span className="text-sm font-semibold text-red-600">{err}</span>}
        </div>
      </div>
      {history.length > 0 && (
        <div className="border-t border-slate-100">
          <div className="flex items-center gap-1.5 px-5 pt-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            <History className="h-3.5 w-3.5" /> History
          </div>
          <ul className="divide-y divide-slate-100 px-5 pb-2 text-sm">
            {history.map((h) => (
              <li key={h.id} className="py-2">
                <div className="flex flex-wrap items-center justify-between gap-x-3">
                  <span className="font-semibold text-slate-900">
                    {label(h.old_status)} → {label(h.new_status)}
                    {!h.manual && <span className="ml-1.5 text-xs font-normal text-slate-500">(automatic)</span>}
                  </span>
                  <span className="text-xs text-slate-500">
                    {new Date(h.created_at).toLocaleString(locale === "ja" ? "ja-JP" : "en-GB", { dateStyle: "medium", timeStyle: "short" })}
                  </span>
                </div>
                <div className="text-slate-600">{h.note}</div>
                <div className="text-xs text-slate-500">{h.profiles?.full_name || h.profiles?.email || "—"}</div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
