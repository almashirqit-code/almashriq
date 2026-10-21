"use client";

import { useTransition } from "react";
import { setLocale } from "@/app/actions";

export function LanguageToggle({ locale, dark = false }: { locale: "en" | "ja"; dark?: boolean }) {
  const [pending, start] = useTransition();
  const base = dark
    ? "border-white/20 text-white/70"
    : "border-slate-200 bg-white text-slate-500 shadow-sm";
  const active = dark ? "bg-white/15 text-white" : "bg-jet-950 text-white";

  return (
    <div className={`inline-flex gap-0.5 overflow-hidden rounded-xl border p-0.5 text-xs font-medium ${base} ${pending ? "opacity-60" : ""}`}>
      {(["en", "ja"] as const).map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => start(() => setLocale(l))}
          className={`rounded-lg px-2.5 py-1 transition ${locale === l ? active : "hover:text-slate-800"}`}
        >
          {l === "en" ? "EN" : "日本語"}
        </button>
      ))}
    </div>
  );
}
