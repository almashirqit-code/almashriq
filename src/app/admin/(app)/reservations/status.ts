import type { ReservationStatus } from "@/lib/types";

export const RES_STATUS_BADGE: Record<ReservationStatus, string> = {
  active: "bg-amber-50 text-amber-700 ring-amber-600/20",
  invoiced: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  cancelled: "bg-slate-100 text-slate-500 ring-slate-400/20",
};
