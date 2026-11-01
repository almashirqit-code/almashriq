import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { money } from "@/lib/format";
import { CURRENCIES, DEFAULT_RATES, type Currency } from "@/lib/types";

/**
 * Currency the ERP shows its totals in (dashboards, ledger, expenses), chosen with the switch in the
 * header and kept in a cookie. Totals are worked out in JPY (each document converted at its own
 * rate) and shown in this currency at today's rate from Configuration (1 unit = N JPY).
 */
export const DISPLAY_COOKIE = "display_currency";

export const getDisplayCurrency = cache(async () => {
  const c = (await cookies()).get(DISPLAY_COOKIE)?.value as Currency | undefined;
  const cur: Currency = c && CURRENCIES.includes(c) ? c : "JPY";
  let rate = 1;
  if (cur !== "JPY") {
    const supabase = await createClient();
    const { data } = await supabase.from("settings").select("exchange_rates").single();
    const rates = { ...DEFAULT_RATES, ...((data?.exchange_rates ?? {}) as Partial<Record<Currency, number>>) };
    rate = Number(rates[cur]) || 1;
  }
  /** A JPY amount in the display currency. */
  const fromJpy = (jpy: number) => (cur === "JPY" ? jpy : jpy / rate);
  return {
    cur,
    rate,
    fromJpy,
    /** Format a JPY amount in the display currency. */
    fmt: (jpy: number, locale = "en") => money(fromJpy(jpy), cur, locale),
    /** "1 USD = 150 JPY", for a note under converted totals. */
    note: cur === "JPY" ? null : `Shown in ${cur} at 1 ${cur} = ${rate} JPY (Configuration rate).`,
  };
});
