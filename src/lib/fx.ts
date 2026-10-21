import "server-only";

export type Fx = { rate: number; date: string; source: string };

async function get(url: string) {
  const res = await fetch(url, { next: { revalidate: 3600 }, signal: AbortSignal.timeout(4000) });
  if (!res.ok) throw new Error(`${res.status}`);
  return res.json();
}

/**
 * USD → JPY reference rate, refreshed hourly.
 * Primary: Frankfurter (open-source, European Central Bank data, no key).
 * Fallback: open.er-api.com (free, no key).
 */
export async function getUsdJpy(): Promise<Fx | null> {
  try {
    const d = await get("https://api.frankfurter.dev/v1/latest?base=USD&symbols=JPY");
    const rate = Number(d?.rates?.JPY);
    if (rate > 0) return { rate, date: String(d.date), source: "ECB via Frankfurter" };
  } catch {}
  try {
    const d = await get("https://open.er-api.com/v6/latest/USD");
    const rate = Number(d?.rates?.JPY);
    if (rate > 0) return { rate, date: new Date((Number(d.time_last_update_unix) || Date.now() / 1000) * 1000).toISOString().slice(0, 10), source: "ExchangeRate-API" };
  } catch {}
  return null;
}
