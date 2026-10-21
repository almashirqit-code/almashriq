/** Rows-per-page choices for admin lists (?rows=). Default 100, up to 500. */
export const ROW_OPTIONS = [25, 50, 100, 200, 500] as const;
export const DEFAULT_ROWS = 100;
export function rowsParam(v: string | undefined | null) {
  const n = Number(v);
  return (ROW_OPTIONS as readonly number[]).includes(n) ? n : DEFAULT_ROWS;
}
