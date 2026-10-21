"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";

export function SortSelect({ value, options = [] }: { value: string; options?: [string, string][] }) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const opts: [string, string][] = options.length
    ? options
    : [
        ["new", "Newest first"],
        ["price_asc", "Price: low to high"],
        ["price_desc", "Price: high to low"],
        ["year", "Year: newest"],
      ];
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
      className="h-11 min-w-0 shrink rounded-xl px-3 text-sm font-semibold"
    >
      {opts.map(([v, l]) => (
        <option key={v} value={v}>
          {l}
        </option>
      ))}
    </select>
  );
}
