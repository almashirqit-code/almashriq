import type { Branch, BranchCode, Currency } from "./types";

/** Built-in branch list (the `branches` table can change currency, tax and active). */
export const BRANCH_CODES: BranchCode[] = ["JP", "SG", "TW", "TH"];

export const DEFAULT_BRANCHES: Branch[] = [
  { code: "JP", name: "Japan", currency: "JPY", default_tax_rate: 10, sort_order: 1, active: true },
  { code: "SG", name: "Singapore", currency: "SGD", default_tax_rate: 9, sort_order: 2, active: true },
  { code: "TW", name: "Taiwan", currency: "TWD", default_tax_rate: 5, sort_order: 3, active: true },
  { code: "TH", name: "Thailand", currency: "THB", default_tax_rate: 7, sort_order: 4, active: true },
];

export const branchName = (code: string | null | undefined) => DEFAULT_BRANCHES.find((b) => b.code === code)?.name ?? code ?? "";
export const branchFlag = (code: string | null | undefined) => (code && BRANCH_CODES.includes(code as BranchCode) ? `/flags/${code.toLowerCase()}.svg` : null);

const NAME_ALIASES: Record<string, BranchCode> = {
  jp: "JP", jpn: "JP", japan: "JP", 日本: "JP",
  sg: "SG", sgp: "SG", singapore: "SG", シンガポール: "SG",
  tw: "TW", twn: "TW", taiwan: "TW", 台湾: "TW",
  th: "TH", tha: "TH", thailand: "TH", タイ: "TH",
};

/** "Singapore" / "sg" / "SGP" → "SG"; null when not recognised. */
export function parseBranch(v: unknown): BranchCode | null {
  const s = String(v ?? "").trim();
  if (!s) return null;
  return NAME_ALIASES[s.toLowerCase()] ?? NAME_ALIASES[s] ?? null;
}

/** Rows from the database merged over the defaults, sorted. */
export function mergeBranches(rows: Partial<Branch>[] | null | undefined): Branch[] {
  const byCode = new Map((rows ?? []).map((r) => [r.code, r]));
  return DEFAULT_BRANCHES.map((d) => ({ ...d, ...(byCode.get(d.code) ?? {}) }) as Branch).sort((a, b) => a.sort_order - b.sort_order);
}

/** Suggested FX rate (1 unit = N JPY) for a cost currency from Configuration's exchange rates. */
export function jpyRate(currency: Currency, rates: Partial<Record<Currency, number>> | null | undefined) {
  if (currency === "JPY") return 1;
  return Number(rates?.[currency] || 0) || null;
}

/** Total buying cost in JPY: (price + tax + expenses) in the cost currency × rate. */
export function costJpy(v: { purchase_price?: number | null; purchase_tax?: number | null; expenses?: number | null; cost_fx_rate?: number | null }) {
  const local = Number(v.purchase_price || 0) + Number(v.purchase_tax || 0) + Number(v.expenses || 0);
  return Math.round(local * (Number(v.cost_fx_rate) || 1));
}

/** Expenses alone in JPY (third-party cars: supplier price + our expenses). */
export const expensesJpy = (v: { expenses?: number | null; cost_fx_rate?: number | null }) => Math.round(Number(v.expenses || 0) * (Number(v.cost_fx_rate) || 1));
