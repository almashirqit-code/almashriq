"use client";

import { useState, useTransition } from "react";
import { assignThread, setThreadStatus } from "./actions";

/** Assign the conversation (admin/manager) and close or reopen it. */
export function ThreadControls({
  threadId,
  status,
  assignedTo,
  staff,
  canAssign,
}: {
  threadId: string;
  status: "open" | "closed";
  assignedTo: string | null;
  staff: { id: string; name: string }[];
  canAssign: boolean;
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  const run = (fn: () => Promise<{ error?: string }>) =>
    start(async () => {
      setError("");
      const r = await fn();
      if (r.error) setError(r.error);
    });

  return (
    <div className="flex flex-wrap items-center gap-2">
      {canAssign && (
        <select
          className="input w-auto py-1.5 text-sm"
          defaultValue={assignedTo ?? ""}
          disabled={pending}
          onChange={(e) => run(() => assignThread(threadId, e.target.value))}
          aria-label="Assigned agent"
        >
          <option value="">Unassigned</option>
          {staff.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      )}
      <button
        type="button"
        disabled={pending}
        onClick={() => run(() => setThreadStatus(threadId, status === "open" ? "closed" : "open"))}
        className="btn-secondary py-1.5 text-sm"
      >
        {status === "open" ? "Close conversation" : "Reopen"}
      </button>
      {error && <span className="text-xs font-semibold text-red-600">{error}</span>}
    </div>
  );
}
