"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronDown, Eye, FileText, Globe, EyeOff, Wrench, Trash2, BookmarkCheck, BookmarkPlus, RotateCcw, Ship, Package } from "lucide-react";
import { useT } from "@/lib/i18n/client";
import type { VehicleStatus } from "@/lib/types";
import { deleteVehicle, setVehicleFlag } from "./actions";
import { useMakeAvailable } from "./make-available";

/**
 * Per-vehicle "Actions" dropdown on the stock list.
 * New actions can be added here as menu items.
 */
export function VehicleRowActions({
  id,
  stockNo,
  status,
  showOnWebsite,
  forParts,
  canEdit,
  canDelete,
  canInvoice,
  reservationId = null,
}: {
  id: string;
  stockNo: string;
  status: VehicleStatus;
  showOnWebsite: boolean;
  forParts: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canInvoice: boolean;
  /** active reservation on this vehicle, if any */
  reservationId?: string | null;
}) {
  const { t } = useT();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const avail = useMakeAvailable();
  const ref = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const [pos, setPos] = useState<{ top?: number; bottom?: number; right: number }>({ right: 0 });

  function toggle() {
    if (!open && btnRef.current) {
      // Fixed position so the menu isn't clipped by the scrolling table.
      const r = btnRef.current.getBoundingClientRect();
      const right = Math.max(8, window.innerWidth - r.right);
      setPos(window.innerHeight - r.bottom < 300 ? { bottom: window.innerHeight - r.top + 4, right } : { top: r.bottom + 4, right });
    }
    setOpen((o) => !o);
  }

  useEffect(() => {
    if (!open) return;
    const onScroll = () => setOpen(false);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onScroll);
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", esc);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onScroll);
    };
  }, [open]);

  async function run(fn: () => Promise<unknown>) {
    setBusy(true);
    try {
      await fn();
      setOpen(false);
      router.refresh();
    } catch (e) {
      if (String((e as { digest?: string })?.digest ?? "").startsWith("NEXT_REDIRECT")) {
        setOpen(false);
        router.refresh();
        return;
      }
      alert((e as Error).message === "forbidden" ? t("forbidden") : (e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const item = "flex w-full items-center gap-2 px-3 py-1.5 text-left hover:bg-slate-50 disabled:opacity-50";

  return (
    <div ref={ref} className="relative inline-block text-left">
      <button
        ref={btnRef}
        type="button"
        onClick={toggle}
        aria-expanded={open}
        className={`inline-flex items-center gap-1 whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-medium ${
          open ? "bg-brand-100 text-brand-700" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
        }`}
      >
        {t("actions")} <ChevronDown className="h-3.5 w-3.5" />
      </button>
      {open && (
        <div style={pos} className="fixed z-50 w-52 rounded-lg border border-slate-200 bg-white py-1 text-sm shadow-lg">
          <Link href={`/stock/${id}`} className={item}>
            <Eye className="h-4 w-4 text-slate-400" />
            {t("va_view")}
          </Link>
          <Link href={`/stock/${id}/shipping`} className={item}>
            <Ship className="h-4 w-4 text-slate-400" />
            {t("sh_tab_shipping")}
          </Link>
          <Link href={`/stock/${id}/shipping?tab=courier`} className={item}>
            <Package className="h-4 w-4 text-slate-400" />
            {t("sh_tab_courier")}
          </Link>
          <div className="my-1 border-t border-slate-100" />
          {status === "in_stock" && !reservationId && (
            <Link href={`/reservations/new?vehicle=${id}`} className={`${item} font-semibold text-amber-700`}>
              <BookmarkPlus className="h-4 w-4 text-amber-500" />
              {t("rv_reserve")}
            </Link>
          )}
          {reservationId && (
            <Link href={`/reservations/${reservationId}`} className={`${item} font-semibold text-amber-700`}>
              <BookmarkCheck className="h-4 w-4 text-amber-500" />
              {t("rv_current")}
            </Link>
          )}
          {canInvoice && (status === "in_stock" || status === "reserved") && (
            <Link href={reservationId ? `/invoices/new?reservation=${reservationId}` : `/invoices/new?vehicle=${id}`} className={item}>
              <FileText className="h-4 w-4 text-slate-400" />
              {t("va_create_invoice")}
            </Link>
          )}
          {canEdit && (
            <>
              <div className="my-1 border-t border-slate-100" />
              <button type="button" disabled={busy} className={item} onClick={() => run(() => setVehicleFlag(id, "show_on_website", !showOnWebsite))}>
                {showOnWebsite ? <EyeOff className="h-4 w-4 text-slate-400" /> : <Globe className="h-4 w-4 text-slate-400" />}
                {showOnWebsite ? t("va_hide_web") : t("va_show_web")}
              </button>
              <button type="button" disabled={busy} className={item} onClick={() => run(() => setVehicleFlag(id, "for_parts", !forParts))}>
                <Wrench className="h-4 w-4 text-slate-400" />
                {forParts ? t("va_unmark_parts") : t("va_mark_parts")}
              </button>
            </>
          )}
          {canEdit && status !== "in_stock" && (
            <>
              <div className="my-1 border-t border-slate-100" />
              <button
                type="button"
                disabled={avail.pending}
                className={`${item} font-semibold text-emerald-700 hover:bg-emerald-50`}
                onClick={() => avail.run(id, stockNo, () => setOpen(false))}
              >
                <RotateCcw className="h-4 w-4 text-emerald-500" />
                {t("va_make_available")}
              </button>
            </>
          )}
          {canDelete && (
            <>
              <div className="my-1 border-t border-slate-100" />
              <button
                type="button"
                disabled={busy}
                className={`${item} text-red-600 hover:bg-red-50`}
                onClick={() => confirm(t("confirm_delete")) && run(() => deleteVehicle(id))}
              >
                <Trash2 className="h-4 w-4" />
                {t("delete")}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
