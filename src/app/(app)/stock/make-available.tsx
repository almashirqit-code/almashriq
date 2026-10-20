"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { RotateCcw } from "lucide-react";
import { useT } from "@/lib/i18n/client";
import { makeAvailable } from "./actions";

/** Runs "Make available" with the confirm / unallocate-first prompts. */
export function useMakeAvailable() {
  const { t } = useT();
  const router = useRouter();
  const [pending, start] = useTransition();

  const run = (vehicleId: string, stockNo: string, onDone?: () => void) => {
    if (!confirm(t("va_make_available_confirm", { stock: stockNo }))) return;
    start(async () => {
      try {
        const res = await makeAvailable(vehicleId);
        if (res.remittances?.length) {
          const ids = res.remittances.map((r) => `#${r}`).join(", ");
          if (confirm(t("va_unalloc_first", { stock: stockNo, ids }))) router.push(`/remittances/${res.remittances[0]}#allocations`);
          return;
        }
        if (res.blockingInvoices?.length) {
          const b = res.blockingInvoices[0];
          const msg = b.reason === "paid" ? t("va_invoice_paid", { invoice: b.invoice_no }) : t("va_invoice_multi", { invoice: b.invoice_no });
          if (confirm(msg)) router.push(`/invoices/${b.id}`);
          return;
        }
        if (res.error) return alert(res.error);
        onDone?.();
        router.refresh();
      } catch (e) {
        alert((e as Error).message === "forbidden" ? t("forbidden") : (e as Error).message);
      }
    });
  };
  return { run, pending };
}

export function MakeAvailableButton({ vehicleId, stockNo }: { vehicleId: string; stockNo: string }) {
  const { t } = useT();
  const { run, pending } = useMakeAvailable();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => run(vehicleId, stockNo)}
      className="btn border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
    >
      <RotateCcw className="h-4 w-4" />
      {pending ? t("saving") : t("va_make_available")}
    </button>
  );
}
