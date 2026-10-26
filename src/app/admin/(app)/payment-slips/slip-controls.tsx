"use client";

import { useState, useTransition } from "react";
import { Check, X, RotateCcw } from "lucide-react";
import { reviewSlip } from "./actions";

/** Received / not matched (with a note the customer sees) / back to waiting. */
export function SlipControls({ id, status }: { id: number; status: "submitted" | "received" | "rejected" }) {
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  const set = (next: "submitted" | "received" | "rejected") =>
    start(async () => {
      setError("");
      if (next === "rejected" && !note.trim()) return setError("Write a note for the customer first.");
      const r = await reviewSlip(id, next, note);
      if (r.error) setError(r.error);
      else setNote("");
    });

  if (status !== "submitted")
    return (
      <button type="button" disabled={pending} onClick={() => set("submitted")} className="btn-ghost py-1.5 text-xs">
        <RotateCcw className="h-3.5 w-3.5" /> Back to waiting
      </button>
    );

  return (
    <div className={`space-y-2 ${pending ? "opacity-60" : ""}`}>
      <input
        className="input py-1.5 text-sm"
        placeholder="Note for the customer (needed to reject)"
        maxLength={500}
        value={note}
        onChange={(e) => setNote(e.target.value)}
        aria-label="Note for the customer"
      />
      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={pending} onClick={() => set("received")} className="btn-primary py-1.5 text-xs">
          <Check className="h-3.5 w-3.5" /> Money received
        </button>
        <button type="button" disabled={pending} onClick={() => set("rejected")} className="btn-secondary py-1.5 text-xs text-red-600">
          <X className="h-3.5 w-3.5" /> Not matched
        </button>
      </div>
      {error && <p className="text-xs font-semibold text-red-600">{error}</p>}
    </div>
  );
}
