"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { useT } from "@/lib/i18n/client";
import { deleteRemittance, removeAllAllocations } from "./actions";

export function RowActions({
  id,
  canEdit,
  canDelete,
  allocations = 0,
  remaining = 1,
}: {
  id: number;
  canEdit: boolean;
  canDelete: boolean;
  allocations?: number;
  remaining?: number;
}) {
  const { t } = useT();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  return (
    <div ref={ref} className="relative inline-block text-left">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-xs font-medium ${
          open ? "bg-red-100 text-red-700" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
        }`}
      >
        {t("actions")} <ChevronDown className="h-3.5 w-3.5" />
      </button>
      {open && (
        <div className="absolute right-0 z-20 mt-1 w-44 rounded-lg border border-slate-200 bg-white py-1 text-sm shadow-lg">
          <Link href={`/admin/remittances/${id}`} className="block px-3 py-1.5 hover:bg-slate-50">
            {t("view")}
          </Link>
          {canEdit && (
            <>
              <Link href={`/admin/remittances/${id}/edit`} className="block px-3 py-1.5 hover:bg-slate-50">
                {t("edit")}
              </Link>
              {remaining > 0 && (
                <Link href={`/admin/remittances/${id}/allocate`} className="block px-3 py-1.5 hover:bg-slate-50">
                  {t("rem_allocate")}
                </Link>
              )}
              {allocations > 0 && (
                <>
                  <Link href={`/admin/remittances/${id}#allocations`} className="block px-3 py-1.5 hover:bg-slate-50">
                    {t("rem_unallocate_vehicle")}
                  </Link>
                  <button
                    type="button"
                    disabled={busy}
                    className="block w-full px-3 py-1.5 text-left text-red-600 hover:bg-red-50"
                    onClick={async () => {
                      if (!confirm(t("rem_unallocate_all_confirm", { count: allocations }))) return;
                      setBusy(true);
                      try {
                        await removeAllAllocations(id);
                        setOpen(false);
                        router.refresh();
                      } catch (e) {
                        alert((e as Error).message);
                      }
                      setBusy(false);
                    }}
                  >
                    {t("rem_unallocate_all")}
                  </button>
                </>
              )}
            </>
          )}
          {canDelete && (
            <button
              type="button"
              disabled={busy}
              className="block w-full px-3 py-1.5 text-left text-red-600 hover:bg-red-50"
              onClick={async () => {
                if (!confirm(t("confirm_delete"))) return;
                setBusy(true);
                try {
                  await deleteRemittance(id);
                } catch (e) {
                  if (String((e as { digest?: string })?.digest ?? "").startsWith("NEXT_REDIRECT")) throw e;
                  alert((e as Error).message);
                  setBusy(false);
                }
              }}
            >
              {t("delete")}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
