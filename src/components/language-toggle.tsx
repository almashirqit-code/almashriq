"use client";

import { useTransition } from "react";
import { setLocale } from "@/app/actions";

export function LanguageToggle({ locale, dark = false }: { locale: "en" | "ja"; dark?: boolean }) {
  const [pending, start] = useTransition();
  const base = dark
    ? "border-white/20 text-white/70"
    : "border-slate-200 text-slate-500";
  const active = dark ? "bg-white/15 text-white" : "bg-brand-50 text-brand-700";

  return (
    <div className={`inline-flex overflow-hidden rounded-lg border text-xs font-medium ${base} ${pending ? "opacity-60" : ""}`}>
      {(["en", "ja"] as const).map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => start(() => setLocale(l))}
          className={`px-2.5 py-1.5 ${locale === l ? active : ""}`}
        >
          {l === "en" ? "EN" : "日本語"}
        </button>
      ))}
    </div>
  );
}
