"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ROW_OPTIONS, DEFAULT_ROWS } from "@/lib/rows";
import { useT } from "@/lib/i18n/client";

/** "Rows: 100 ▾" — changes ?rows= and goes back to page 1. Also submits with the filter form (name="rows"). */
export function RowsSelect({ value }: { value: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const { t } = useT();
  return (
    <label className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500">
      {t("rem_page_size")}
      <select
        name="rows"
        aria-label={t("rem_page_size")}
        className="input w-auto py-1.5"
        value={value}
        onChange={(e) => {
          const p = new URLSearchParams(sp.toString());
          if (Number(e.target.value) === DEFAULT_ROWS) p.delete("rows");
          else p.set("rows", e.target.value);
          p.delete("size");
          p.delete("page");
          router.push(`${pathname}${p.size ? `?${p}` : ""}`);
        }}
      >
        {ROW_OPTIONS.map((n) => (
          <option key={n} value={n}>
            {n}
          </option>
        ))}
      </select>
    </label>
  );
}
