"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { useT } from "@/lib/i18n/client";
import { branchFlag } from "@/lib/branches";
import { CURRENCIES, type Branch, type Currency } from "@/lib/types";
import { saveBranch } from "./actions";

/** Branch countries: local cost currency, default purchase tax, on/off. */
export function BranchesManager({ branches, rates, canEdit }: { branches: Branch[]; rates: Partial<Record<Currency, number>>; canEdit: boolean }) {
  const { t } = useT();
  const router = useRouter();
  const [rows, setRows] = useState(branches);
  const [saved, setSaved] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const set = (code: string, patch: Partial<Branch>) => setRows((rs) => rs.map((r) => (r.code === code ? { ...r, ...patch } : r)));

  return (
    <section className="card max-w-4xl">
      <div className="border-b border-slate-100 px-5 py-3.5">
        <h2 className="text-sm font-semibold">{t("settings_branches")}</h2>
        <p className="mt-0.5 text-xs text-slate-500">{t("settings_branches_help")}</p>
      </div>
      <div className="overflow-x-auto">
        <table className="table">
          <thead>
            <tr>
              <th>{t("f_branch")}</th>
              <th>{t("f_cost_currency")}</th>
              <th>1 unit = JPY</th>
              <th>{t("f_purchase_tax_rate")}</th>
              <th>{t("m_active")}</th>
              {canEdit && <th></th>}
            </tr>
          </thead>
          <tbody>
            {rows.map((b) => (
              <tr key={b.code}>
                <td className="whitespace-nowrap font-semibold">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={branchFlag(b.code)!} alt="" className="mr-2 inline h-3.5 w-5 rounded-[2px] object-cover ring-1 ring-black/10" />
                  {b.name} <span className="text-xs text-slate-400">{b.code}</span>
                </td>
                <td>
                  <select className="input w-24" value={b.currency} disabled={!canEdit} onChange={(e) => set(b.code, { currency: e.target.value as Currency })}>
                    {CURRENCIES.map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                </td>
                <td className="tabular-nums text-slate-500">{b.currency === "JPY" ? "1" : rates[b.currency] ?? "—"}</td>
                <td>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step="any"
                    className="input w-24"
                    value={b.default_tax_rate}
                    disabled={!canEdit}
                    onChange={(e) => set(b.code, { default_tax_rate: Number(e.target.value) })}
                  />
                </td>
                <td>
                  <input type="checkbox" checked={b.active} disabled={!canEdit || b.code === "JP"} onChange={(e) => set(b.code, { active: e.target.checked })} className="h-4 w-4" />
                </td>
                {canEdit && (
                  <td className="text-right">
                    <button
                      type="button"
                      className="btn-secondary py-1.5 text-xs"
                      disabled={pending}
                      onClick={() =>
                        start(async () => {
                          const r = await saveBranch(b);
                          if (r.error) return alert(r.error);
                          setSaved(b.code);
                          router.refresh();
                        })
                      }
                    >
                      <Check className="h-3.5 w-3.5" />
                      {saved === b.code ? t("saved") : t("save")}
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="border-t border-slate-100 px-5 py-3 text-xs text-slate-500">{t("settings_rates_help")}</p>
    </section>
  );
}
