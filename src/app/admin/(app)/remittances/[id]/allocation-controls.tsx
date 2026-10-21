"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Undo2, Check, X } from "lucide-react";
import { useT } from "@/lib/i18n/client";
import type { DictKey } from "@/lib/i18n/dictionaries";
import { removeAllocation, removeAllAllocations, updateAllocationAmount } from "../actions";

function errText(t: (k: DictKey) => string, e: string) {
  return e.startsWith("rem_") ? t(e as DictKey) : e;
}

/** Amount cell + "Change amount" / "Unallocate" buttons for one allocated vehicle. */
export function AllocationRowControls({
  allocationId,
  remittanceId,
  amount,
  maxAmount,
  amountLabel,
  stockNo,
  canEdit,
}: {
  allocationId: string;
  remittanceId: number;
  amount: number;
  /** current amount + what's still unallocated on the remittance */
  maxAmount: number;
  amountLabel: string;
  stockNo: string;
  canEdit: boolean;
}) {
  const { t } = useT();
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(String(amount));
  const [pending, start] = useTransition();

  const save = () =>
    start(async () => {
      const n = Number(value);
      if (!Number.isFinite(n) || n < 0) return alert(t("error"));
      if (n > maxAmount + 0.005) return alert(t("rem_over_allocated"));
      const res = await updateAllocationAmount(allocationId, remittanceId, n);
      if (res.error) return alert(errText(t, res.error));
      setEditing(false);
      router.refresh();
    });

  const unallocate = () => {
    if (!confirm(t("rem_unallocate_confirm", { stock: stockNo }))) return;
    start(async () => {
      try {
        await removeAllocation(allocationId, remittanceId);
        router.refresh();
      } catch (e) {
        alert((e as Error).message);
      }
    });
  };

  return (
    <>
      <td className="text-right tabular-nums">
        {editing ? (
          <div className="flex items-center justify-end gap-1">
            <input
              type="number"
              step="any"
              min={0}
              max={maxAmount}
              value={value}
              autoFocus
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") save();
                if (e.key === "Escape") setEditing(false);
              }}
              className="input w-32 py-1 text-right"
            />
            <button type="button" onClick={save} disabled={pending} className="rounded p-1 text-emerald-600 hover:bg-emerald-50" title={t("save")}>
              <Check className="h-4 w-4" />
            </button>
            <button type="button" onClick={() => setEditing(false)} className="rounded p-1 text-slate-400 hover:bg-slate-100" title={t("cancel")}>
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          amountLabel
        )}
      </td>
      <td className="whitespace-nowrap text-right">
        {canEdit && !editing && (
          <div className="inline-flex gap-1.5">
            <button
              type="button"
              disabled={pending}
              onClick={() => {
                setValue(String(amount));
                setEditing(true);
              }}
              className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              <Pencil className="h-3.5 w-3.5" />
              {t("rem_change_amount")}
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={unallocate}
              className="inline-flex items-center gap-1 rounded-md border border-red-200 bg-red-50 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-100"
            >
              <Undo2 className="h-3.5 w-3.5" />
              {pending ? t("saving") : t("rem_unallocate_btn")}
            </button>
          </div>
        )}
      </td>
    </>
  );
}

/** Header button: removes every allocation on the remittance. */
export function UnallocateAllButton({ remittanceId, count, className }: { remittanceId: number; count: number; className?: string }) {
  const { t } = useT();
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      className={className ?? "btn border border-red-200 bg-white text-red-700 hover:bg-red-50"}
      onClick={() => {
        if (!confirm(t("rem_unallocate_all_confirm", { count }))) return;
        start(async () => {
          try {
            await removeAllAllocations(remittanceId);
            router.refresh();
          } catch (e) {
            alert((e as Error).message);
          }
        });
      }}
    >
      <Undo2 className="h-4 w-4" />
      {pending ? t("saving") : t("rem_unallocate_all")}
    </button>
  );
}
