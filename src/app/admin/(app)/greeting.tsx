"use client";

import { useEffect, useState } from "react";
import { useT } from "@/lib/i18n/client";

/** Time-of-day greeting in the viewer's own timezone. */
export function Greeting({ name }: { name: string }) {
  const { t } = useT();
  const [h, setH] = useState<number | null>(null);
  useEffect(() => setH(new Date().getHours()), []);
  const key = h === null ? null : h < 12 ? "dash_greeting_morning" : h < 18 ? "dash_greeting_afternoon" : "dash_greeting_evening";
  return (
    <>
      {key ? t(key) : "👋"}
      {name ? `, ${name}` : ""} {key && "👋"}
    </>
  );
}
