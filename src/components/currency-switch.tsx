"use client";

import { useTransition } from "react";
import { Coins } from "lucide-react";
import { setDisplayCurrency } from "@/app/actions";
import { CURRENCIES, type Currency } from "@/lib/types";

/** ERP header: the currency dashboards, the ledger and expenses show their totals in. */
export function CurrencySwitch({ value }: { value: Currency }) {
  const [pending, start] = useTransition();
  return (
    <label className={`inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-600 shadow-sm ${pending ? "opacity-60" : ""}`} title="Show totals in">
      <Coins className="h-3.5 w-3.5" aria-hidden />
      <span className="sr-only">Show totals in</span>
      <select value={value} disabled={pending} onChange={(e) => start(() => setDisplayCurrency(e.target.value))} className="cursor-pointer bg-transparent font-semibold text-slate-800 outline-none">
        {CURRENCIES.map((c) => (
          <option key={c}>{c}</option>
        ))}
      </select>
    </label>
  );
}
