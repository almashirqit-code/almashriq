/**
 * Supabase returns at most 1,000 rows per request (the API's max-rows setting), whatever .limit()
 * asks for. For totals and exports that must see every row, read in 1,000-row pages until a short
 * page comes back. `page(from, to)` builds the query with .range(from, to) and a stable .order().
 */
export async function fetchAll<T>(page: (from: number, to: number) => PromiseLike<{ data: unknown[] | null }>, max = 50000): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; from < max; from += 1000) {
    const { data } = await page(from, Math.min(from + 999, max - 1));
    if (!data?.length) break;
    out.push(...(data as T[]));
    if (data.length < 1000) break;
  }
  return out;
}
