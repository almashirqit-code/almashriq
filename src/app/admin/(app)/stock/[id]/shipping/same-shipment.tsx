"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Container, Copy, Plus } from "lucide-react";
import { useT } from "@/lib/i18n/client";
import { IconChip } from "@/components/ui";
import { shareShipment } from "./actions";

export type ShipmentMate = { id: string; stock_no: string; title: string; match: string };

/** Other cars on this booking / BL / container, with "copy shipping info" and "add a car". */
export function SameShipment({ vehicleId, mates, hasRef, canEdit }: { vehicleId: string; mates: ShipmentMate[]; hasRef: boolean; canEdit: boolean }) {
  const { t } = useT();
  const router = useRouter();
  const [stockNo, setStockNo] = useState("");
  const [msg, setMsg] = useState<{ ok?: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();

  const run = (to: { ids?: string[]; stockNo?: string }) =>
    start(async () => {
      const r = await shareShipment(vehicleId, to);
      if (r.error) return setMsg({ text: r.error });
      setMsg({ ok: true, text: t("sh_same_applied", { count: r.count ?? 0 }) });
      setStockNo("");
      router.refresh();
    });

  return (
    <section className="card mt-5">
      <div className="flex items-start gap-3 border-b border-slate-100 px-5 py-3.5">
        <IconChip tone="sky" size="sm">
          <Container />
        </IconChip>
        <div>
          <h2 className="text-sm font-semibold">{t("sh_same_title")}</h2>
          <p className="mt-0.5 text-xs text-slate-500">{t("sh_same_help")}</p>
        </div>
      </div>
      {!hasRef ? (
        <p className="px-5 py-4 text-sm text-slate-500">{t("sh_same_save_first")}</p>
      ) : (
        <>
          {mates.length === 0 ? (
            <p className="px-5 py-4 text-sm text-slate-500">{t("sh_same_none")}</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {mates.map((m) => (
                <li key={m.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-5 py-2.5 text-sm">
                  <Link href={`/admin/stock/${m.id}/shipping`} className="font-mono font-semibold text-blue-700 hover:underline">
                    {m.stock_no}
                  </Link>
                  <span className="text-slate-700">{m.title}</span>
                  <span className="ml-auto text-xs text-slate-500">{m.match}</span>
                </li>
              ))}
            </ul>
          )}
          {canEdit && (
            <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 px-5 py-3">
              {mates.length > 0 && (
                <button type="button" className="btn-secondary" disabled={pending} onClick={() => run({ ids: mates.map((m) => m.id) })}>
                  <Copy className="h-4 w-4" />
                  {t("sh_same_apply")}
                </button>
              )}
              <form
                className="flex flex-wrap items-center gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  run({ stockNo });
                }}
              >
                <input
                  value={stockNo}
                  onChange={(e) => setStockNo(e.target.value)}
                  placeholder={t("sh_same_add")}
                  aria-label={t("sh_same_add")}
                  className="input w-56"
                  maxLength={40}
                />
                <button className="btn-secondary" disabled={pending || !stockNo.trim()}>
                  <Plus className="h-4 w-4" />
                  {t("sh_same_add_btn")}
                </button>
              </form>
              {msg && (
                <p role="status" className={`text-sm ${msg.ok ? "text-emerald-600" : "text-red-600"}`}>
                  {msg.text}
                </p>
              )}
            </div>
          )}
        </>
      )}
    </section>
  );
}
