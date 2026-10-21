"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";

export function SortSelect({ value }: { value: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  return (
    <select
      aria-label="Sort"
      value={value}
      onChange={(e) => {
        const p = new URLSearchParams(sp.toString());
        p.set("sort", e.target.value);
        p.delete("page");
        router.push(`${pathname}?${p}`);
      }}
      className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 outline-none focus:border-navy-500"
    >
      <option value="new">Newest first</option>
      <option value="price_asc">Price: low to high</option>
      <option value="price_desc">Price: high to low</option>
      <option value="year">Year: newest</option>
    </select>
  );
}
