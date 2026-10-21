"use client";

import { useEffect, useState } from "react";

export const ZONES = {
  japan: { label: "Japan", tz: "Asia/Tokyo" },
  pakistan: { label: "Pakistan", tz: "Asia/Karachi" },
} as const;

/**
 * Live clocks using the IANA time-zone database built into every browser.
 * `serverNow` corrects for a visitor whose device clock is wrong.
 */
export function WorldClock({
  zones = ["japan", "pakistan"],
  serverNow,
  className = "",
  labelClass = "",
  timeClass = "font-semibold",
}: {
  zones?: (keyof typeof ZONES)[];
  serverNow?: number;
  className?: string;
  labelClass?: string;
  timeClass?: string;
}) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    const skew = serverNow ? serverNow - Date.now() : 0;
    // Ignore small differences (network/render delay); only fix clearly wrong device clocks.
    const fix = Math.abs(skew) > 120_000 ? skew : 0;
    const tick = () => setNow(Date.now() + fix);
    tick();
    const t = setInterval(tick, 15_000);
    return () => clearInterval(t);
  }, [serverNow]);

  return (
    <span className={`inline-flex flex-wrap items-center gap-x-3 gap-y-0.5 ${className}`} suppressHydrationWarning>
      {zones.map((z) => {
        const { label, tz } = ZONES[z];
        const txt =
          now == null
            ? "--:--"
            : new Intl.DateTimeFormat("en-GB", { timeZone: tz, weekday: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(now));
        return (
          <span key={z} className="whitespace-nowrap">
            <span className={labelClass}>{label}</span> <span className={timeClass}>{txt}</span>
          </span>
        );
      })}
    </span>
  );
}
