"use client";

import { createContext, useContext } from "react";
import { translate, type DictKey, type Locale } from "./dictionaries";

const I18nContext = createContext<Locale>("en");

export function I18nProvider({ locale, children }: { locale: Locale; children: React.ReactNode }) {
  return <I18nContext.Provider value={locale}>{children}</I18nContext.Provider>;
}

export function useT() {
  const locale = useContext(I18nContext);
  const t = (key: DictKey, vars?: Record<string, string | number>) => translate(locale, key, vars);
  return { t, locale };
}
