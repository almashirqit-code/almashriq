"use client";

import { useTransition } from "react";
import { Trash2 } from "lucide-react";
import { deleteExpense } from "./actions";

export function DeleteExpenseButton({ id }: { id: number }) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      aria-label={`Delete expense #${id}`}
      title="Delete"
      className="btn-ghost p-1.5 text-red-600"
      onClick={() => {
        if (!confirm("Delete this expense? This is recorded in the audit trail.")) return;
        start(async () => {
          const r = await deleteExpense(id);
          if (r.error) alert(r.error);
        });
      }}
    >
      <Trash2 className="h-4 w-4" />
    </button>
  );
}
