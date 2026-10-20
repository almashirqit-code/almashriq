import "server-only";
import { cookies } from "next/headers";
import { translate, type DictKey, type Locale } from "./dictionaries";

export async function getLocale(): Promise<Locale> {
  const c = (await cookies()).get("locale")?.value;
  return c === "ja" ? "ja" : "en";
}

export async function getT() {
  const locale = await getLocale();
  const t = (key: DictKey, vars?: Record<string, string | number>) => translate(locale, key, vars);
  return { t, locale };
}
