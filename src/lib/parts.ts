import { CURRENCIES, type BranchCode, type Currency } from "./types";
import { DEFAULT_BRANCHES, parseBranch } from "./branches";

export type PartCondition = "new" | "used" | "rebuilt";
export type PartStatus = "available" | "reserved" | "sold";

export const PART_CONDITIONS: PartCondition[] = ["used", "new", "rebuilt"];
export const PART_STATUSES: PartStatus[] = ["available", "reserved", "sold"];
export const PART_CATEGORIES = [
  "Engine",
  "Transmission",
  "Suspension",
  "Brakes",
  "Body",
  "Lighting",
  "Electrical",
  "Interior",
  "Wheels & tyres",
  "Cooling",
  "Exhaust",
  "Other",
];

export type PartInput = {
  part_no: string;
  name: string;
  category: string | null;
  make: string | null;
  model: string | null;
  model_code: string | null;
  year_from: number | null;
  year_to: number | null;
  oem_no: string | null;
  condition: PartCondition;
  quantity: number;
  price: number | null;
  price_currency: Currency;
  /** In cost_currency; × cost_fx_rate = JPY. */
  cost: number | null;
  location: string | null;
  description: string | null;
  status: PartStatus;
  show_on_website: boolean;
  notes: string | null;
  branch: BranchCode;
  cost_currency: Currency;
  cost_fx_rate: number;
};

export type PartField = keyof PartInput;

export const blankPart = (): PartInput => ({
  part_no: "",
  name: "",
  category: null,
  make: null,
  model: null,
  model_code: null,
  year_from: null,
  year_to: null,
  oem_no: null,
  condition: "used",
  quantity: 1,
  price: null,
  price_currency: "USD",
  cost: null,
  location: null,
  description: null,
  status: "available",
  show_on_website: true,
  notes: null,
  branch: "JP",
  cost_currency: "JPY",
  cost_fx_rate: 1,
});

/** Bulk import columns (in template order). */
export const PART_TEMPLATE_HEADERS: PartField[] = [
  "part_no",
  "name",
  "category",
  "make",
  "model",
  "model_code",
  "year_from",
  "year_to",
  "oem_no",
  "condition",
  "quantity",
  "price",
  "price_currency",
  "cost",
  "location",
  "status",
  "show_on_website",
  "description",
  "notes",
  "branch",
  "cost_currency",
  "cost_fx_rate",
];
export const PART_TEMPLATE_SAMPLE = [
  "P-1001,Front bumper,Body,Toyota,Prius,ZVW30,2009,2015,52119-47906,used,1,180,USD,8000,Yard A,available,yes,Pearl white with fog lamp holes,,JP,JPY,1",
  "P-1002,Headlight (left),Lighting,Honda,Fit,GE6,2007,2013,,used,2,95,USD,4000,Yard A,available,yes,HID,,JP,JPY,1",
  "P-1003,Gearbox (AT),Transmission,Toyota,Hilux,GUN125,2016,2020,,used,1,650,USD,420,Bangkok yard,available,yes,Tested,,TH,THB,4.2",
];

const ALIASES: Record<string, PartField> = {
  part_no: "part_no", partno: "part_no", part_number: "part_no", ref: "part_no", reference: "part_no", stock_no: "part_no", sku: "part_no", id: "part_no",
  name: "name", part: "name", part_name: "name", title: "name", item: "name", 品名: "name", 部品名: "name",
  category: "category", type: "category", group: "category", カテゴリー: "category",
  make: "make", maker: "make", brand: "make", メーカー: "make",
  model: "model", 車種: "model",
  model_code: "model_code", chassis_code: "model_code", 型式: "model_code",
  year_from: "year_from", from_year: "year_from", year: "year_from",
  year_to: "year_to", to_year: "year_to",
  oem_no: "oem_no", oem: "oem_no", oem_number: "oem_no", genuine_no: "oem_no", 品番: "oem_no",
  condition: "condition", 状態: "condition",
  quantity: "quantity", qty: "quantity", stock: "quantity", 数量: "quantity",
  price: "price", fob: "price", fob_price: "price", selling_price: "price", 価格: "price",
  price_currency: "price_currency", currency: "price_currency",
  cost: "cost", purchase_price: "cost", 仕入: "cost",
  location: "location", yard: "location",
  status: "status",
  show_on_website: "show_on_website", website: "show_on_website", publish: "show_on_website",
  description: "description", details: "description", 説明: "description",
  notes: "notes", note: "notes", memo: "notes", 備考: "notes",
  branch: "branch", source: "branch", source_country: "branch", 拠点: "branch",
  cost_currency: "cost_currency", purchase_currency: "cost_currency",
  cost_fx_rate: "cost_fx_rate", cost_rate: "cost_fx_rate", jpy_rate: "cost_fx_rate",
};

export function normalizePartHeader(h: string): PartField | null {
  const k = h.trim().toLowerCase().replace(/[\s.\-/#]+/g, "_").replace(/^_|_$/g, "");
  return ALIASES[k] ?? null;
}

const str = (v: unknown) => {
  const s = v === null || v === undefined ? "" : String(v).trim();
  return s || null;
};
const num = (v: unknown) => {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(String(v).replace(/[,\s¥$€£]/g, ""));
  return Number.isFinite(n) ? n : NaN;
};

/** Turns a raw spreadsheet row (already keyed by field) into a part, with validation errors. */
export function parsePart(raw: Partial<Record<PartField, unknown>>): { data: PartInput; errors: string[] } {
  const errors: string[] = [];
  const d = blankPart();
  d.part_no = str(raw.part_no) ?? "";
  d.name = str(raw.name) ?? "";
  if (!d.part_no) errors.push("part_no is required");
  if (!d.name) errors.push("name is required");
  for (const f of ["category", "make", "model", "model_code", "oem_no", "location", "description", "notes"] as const) d[f] = str(raw[f]);

  const nums: Partial<Record<"year_from" | "year_to" | "quantity" | "price" | "cost", number>> = {};
  for (const f of ["year_from", "year_to", "quantity", "price", "cost"] as const) {
    const n = num(raw[f]);
    if (Number.isNaN(n)) errors.push(`${f} is not a number`);
    else if (n !== null && n < 0) errors.push(`${f} can't be negative`);
    else if (n !== null) nums[f] = f === "price" || f === "cost" ? n : Math.round(n);
  }
  Object.assign(d, nums);

  const cond = str(raw.condition)?.toLowerCase();
  if (cond) {
    const c = cond === "中古" ? "used" : cond === "新品" ? "new" : cond === "リビルト" || cond === "rebuild" ? "rebuilt" : cond;
    if (PART_CONDITIONS.includes(c as PartCondition)) d.condition = c as PartCondition;
    else errors.push(`condition "${cond}" must be new / used / rebuilt`);
  }
  const cur = str(raw.price_currency)?.toUpperCase();
  if (cur) {
    if (CURRENCIES.includes(cur as Currency)) d.price_currency = cur as Currency;
    else errors.push(`currency "${cur}" must be one of ${CURRENCIES.join("/")}`);
  }
  const st = str(raw.status)?.toLowerCase().replace(/\s+/g, "_");
  if (st) {
    const s = st === "in_stock" ? "available" : st;
    if (PART_STATUSES.includes(s as PartStatus)) d.status = s as PartStatus;
    else errors.push(`status "${st}" must be available / reserved / sold`);
  }
  const web = str(raw.show_on_website)?.toLowerCase();
  if (web) d.show_on_website = !["no", "n", "false", "0", "hidden", "いいえ"].includes(web);

  const br = str(raw.branch);
  if (br) {
    const b = parseBranch(br);
    if (b) d.branch = b;
    else errors.push(`branch "${br}" must be JP / SG / TW / TH`);
  }
  // Cost currency: given, or the branch's own currency.
  const cc = str(raw.cost_currency)?.toUpperCase();
  if (cc && !CURRENCIES.includes(cc as Currency)) errors.push(`cost currency "${cc}" must be one of ${CURRENCIES.join("/")}`);
  d.cost_currency = cc && CURRENCIES.includes(cc as Currency) ? (cc as Currency) : DEFAULT_BRANCHES.find((x) => x.code === d.branch)!.currency;
  const fx = num(raw.cost_fx_rate);
  if (Number.isNaN(fx) || (fx !== null && fx <= 0)) errors.push("cost_fx_rate must be a number above 0");
  d.cost_fx_rate = d.cost_currency === "JPY" ? 1 : fx && fx > 0 ? fx : 0;
  return { data: d, errors };
}

/** Cost of one part line in JPY. */
export const partCostJpy = (p: { cost: number | null; cost_fx_rate: number | null }) => Math.round(Number(p.cost || 0) * (Number(p.cost_fx_rate) || 1));

export const partYears = (p: { year_from: number | null; year_to: number | null }) =>
  p.year_from && p.year_to && p.year_from !== p.year_to ? `${p.year_from}–${p.year_to}` : String(p.year_from || p.year_to || "");

export const partFits = (p: { make: string | null; model: string | null; model_code: string | null; year_from: number | null; year_to: number | null }) =>
  [p.make, p.model, p.model_code && `(${p.model_code})`, partYears(p)].filter(Boolean).join(" ");
