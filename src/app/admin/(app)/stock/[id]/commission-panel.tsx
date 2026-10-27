"use client";

import { useState, useTransition } from "react";
import { BadgeCheck, Loader2, RotateCcw, Wallet, AlertTriangle } from "lucide-react";
import { money } from "@/lib/format";
import { CURRENCIES, type Currency } from "@/lib/types";
import { markCommissionPaid, reverseCommission } from "./commission-actions";

export type CommissionInfo = { paidAt: string | null; amount: number | null; currency: Currency | null; agent: string | null; note: string | null };

/**
 * "Commission paid" for one car (admins). Normally marked once the car is paid and delivered; marking
 * books the commission as an expense. Reverse clears it (and that expense) if it was the wrong car.
 */
export function CommissionPanel({
  vehicleId,
  info,
  ready,
  staff,
  defaultAgent,
  rates,
}: {
  vehicleId: string;
  info: CommissionInfo;
  ready: { delivered: boolean; paid: boolean };
  staff: { id: string; name: string }[];
  defaultAgent: string | null;
  rates: Record<Currency, number>;
}) {
  const [agent, setAgent] = useState(defaultAgent ?? "");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState<Currency>("JPY");
  const [fx, setFx] = useState("1");
  const [paidOn, setPaidOn] = useState(new Date().toISOString().slice(0, 10));
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  const mark = () =>
    start(async () => {
      setError("");
      if (!agent) return setError("Choose the agent.");
      const r = await markCommissionPaid(vehicleId, { agentId: agent, amount: Number(amount.replace(/,/g, "")), currency, fxRate: Number(fx), paidOn, note });
      if (r.error) setError(r.error);
    });
  const reverse = () =>
    start(async () => {
      if (!confirm("Reverse the commission for this car? The label is removed and its expense is deleted. This is recorded in the audit trail.")) return;
      setError("");
      const r = await reverseCommission(vehicleId);
      if (r.error) setError(r.error);
    });

  return (
    <section className="card p-5">
      <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold">
        <Wallet className="h-4 w-4 text-slate-500" /> Commission
      </h2>
      {info.paidAt ? (
        <div className="space-y-3">
          <div className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-900 ring-1 ring-emerald-200">
            <div className="flex items-center gap-1.5 font-bold">
              <BadgeCheck className="h-4 w-4" /> Commission paid
            </div>
            <div className="mt-1">
              {info.amount != null && info.currency ? money(info.amount, info.currency) : ""} to {info.agent ?? "—"} on {info.paidAt}
            </div>
            {info.note && <div className="mt-0.5 text-xs">{info.note}</div>}
          </div>
          <button type="button" onClick={reverse} disabled={pending} className="btn-secondary py-1.5 text-xs text-red-600">
            {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />} Reverse (wrong car)
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {(!ready.delivered || !ready.paid) && (
            <p className="flex items-start gap-1.5 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900 ring-1 ring-amber-200">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              {!ready.paid && !ready.delivered ? "This car isn't fully paid or delivered yet." : !ready.paid ? "The invoice for this car isn't fully paid yet." : "This car isn't marked delivered yet."}
            </p>
          )}
          <div>
            <label className="label" htmlFor="cm_agent">Agent *</label>
            <select id="cm_agent" value={agent} onChange={(e) => setAgent(e.target.value)} className="input">
              <option value="">Choose…</option>
              {staff.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-[1fr_6rem] gap-2">
            <div>
              <label className="label" htmlFor="cm_amount">Amount *</label>
              <input id="cm_amount" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} className="input" />
            </div>
            <div>
              <label className="label" htmlFor="cm_cur">Currency</label>
              <select
                id="cm_cur"
                value={currency}
                onChange={(e) => {
                  const c = e.target.value as Currency;
                  setCurrency(c);
                  setFx(String(c === "JPY" ? 1 : rates[c] ?? ""));
                }}
                className="input"
              >
                {CURRENCIES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>
          {currency !== "JPY" && (
            <div>
              <label className="label" htmlFor="cm_fx">Rate: 1 {currency} = ? JPY</label>
              <input id="cm_fx" inputMode="decimal" value={fx} onChange={(e) => setFx(e.target.value)} className="input" />
            </div>
          )}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="label" htmlFor="cm_date">Paid on</label>
              <input id="cm_date" type="date" value={paidOn} onChange={(e) => setPaidOn(e.target.value)} className="input" />
            </div>
            <div>
              <label className="label" htmlFor="cm_note">Note</label>
              <input id="cm_note" maxLength={300} value={note} onChange={(e) => setNote(e.target.value)} className="input" />
            </div>
          </div>
          <button type="button" onClick={mark} disabled={pending} className="btn-primary w-full justify-center">
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <BadgeCheck className="h-4 w-4" />} Mark commission paid
          </button>
          <p className="text-xs text-slate-500">This also adds the commission to the expense book, so it counts in the car&apos;s profit.</p>
        </div>
      )}
      {error && <p className="mt-2 text-sm font-semibold text-red-600">{error}</p>}
    </section>
  );
}
