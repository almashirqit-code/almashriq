"use client";

import { useEffect, useState } from "react";

/** Current time in Japan (exporters' customers are in many time zones). */
export function JapanClock() {
  const [now, setNow] = useState<string | null>(null);
  useEffect(() => {
    const fmt = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Tokyo", weekday: "short", hour: "2-digit", minute: "2-digit" });
    const tick = () => setNow(fmt.format(new Date()));
    tick();
    const t = setInterval(tick, 30_000);
    return () => clearInterval(t);
  }, []);
  return <span suppressHydrationWarning>Japan time: {now ?? "—"}</span>;
}
