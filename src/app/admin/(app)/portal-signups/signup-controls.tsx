"use client";

import { useState, useTransition } from "react";
import { Check, X } from "lucide-react";
import { approveSignup, rejectSignup } from "./actions";

type Option = { id: string; label: string };

/** Link a pending sign-up to a customer (new, matched by email, or by customer no.) and assign the agent. */
export function SignupControls({ userId, matches, staff }: { userId: string; matches: Option[]; staff: Option[] }) {
  const [target, setTarget] = useState<string>(matches[0]?.id ?? "new");
  const [customerNo, setCustomerNo] = useState("");
  const [agent, setAgent] = useState("");
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  const approve = () =>
    start(async () => {
      setError("");
      const customer = target === "new" ? "" : target === "byno" ? customerNo : target;
      if (target === "byno" && !/^\d+$/.test(customerNo.trim())) return setError("Enter the customer no.");
      const r = await approveSignup(userId, customer, agent);
      if (r.error) setError(r.error);
    });
  const reject = () =>
    start(async () => {
      if (!confirm("Reject this sign-up? They will not be able to see any account data.")) return;
      setError("");
      const r = await rejectSignup(userId);
      if (r.error) setError(r.error);
    });

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <select className="input w-auto py-1.5 text-sm" value={target} onChange={(e) => setTarget(e.target.value)} aria-label="Customer record">
          {matches.map((m) => (
            <option key={m.id} value={m.id}>
              Link: {m.label}
            </option>
          ))}
          <option value="new">Create a new customer</option>
          <option value="byno">Link to customer no.…</option>
        </select>
        {target === "byno" && (
          <input
            className="input w-28 py-1.5 text-sm"
            inputMode="numeric"
            placeholder="Customer no."
            value={customerNo}
            onChange={(e) => setCustomerNo(e.target.value)}
            aria-label="Customer no."
          />
        )}
        <select className="input w-auto py-1.5 text-sm" value={agent} onChange={(e) => setAgent(e.target.value)} aria-label="Sales agent">
          <option value="">Assign agent later</option>
          {staff.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>
      </div>
      <div className="flex items-center gap-2">
        <button type="button" onClick={approve} disabled={pending} className="btn-primary py-1.5 text-xs">
          <Check className="h-3.5 w-3.5" /> Approve
        </button>
        <button type="button" onClick={reject} disabled={pending} className="btn-ghost py-1.5 text-xs text-red-600">
          <X className="h-3.5 w-3.5" /> Reject
        </button>
        {error && <span className="text-xs font-semibold text-red-600">{error}</span>}
      </div>
    </div>
  );
}
