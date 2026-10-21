import { CURRENCIES, type BranchCode, type Currency, type VehicleStatus } from "./types";
import { DEFAULT_BRANCHES, parseBranch } from "./branches";

export type MachineCondition = "new" | "used" | "rebuilt";

export const MACHINE_CONDITIONS: MachineCondition[] = ["used", "new", "rebuilt"];
export const MACHINE_STATUSES: VehicleStatus[] = ["in_stock", "reserved", "sold", "shipped"];
export const MACHINE_CATEGORIES = [
  "Excavator",
  "Mini excavator",
  "Wheel loader",
  "Skid steer",
  "Bulldozer",
  "Backhoe loader",
  "Motor grader",
  "Road roller",
  "Crane",
  "Forklift",
  "Dump truck",
  "Concrete equipment",
  "Generator",
  "Agricultural",
  "Attachment",
  "Other",
];
export const MACHINE_MAKES = ["Komatsu", "Caterpillar", "Hitachi", "Kobelco", "Kubota", "Yanmar", "Sumitomo", "Takeuchi", "Volvo", "Toyota", "Tadano", "Kato", "Isuzu", "Hino", "Doosan", "Hyundai"];

export type MachineInput = {
  stock_no: string;
  category: string | null;
  make: string;
  model: string;
  year: number | null;
  hours: number | null;
  serial_no: string | null;
  operating_weight_kg: number | null;
  engine_power_hp: number | null;
  bucket_capacity_m3: number | null;
  attachments: string | null;
  condition: MachineCondition;
  location: string | null;
  branch: BranchCode;
  cost_currency: Currency;
  /** 1 unit of cost_currency = N JPY. */
  cost_fx_rate: number;
  /** In cost_currency. */
  purchase_price: number | null;
  expenses: number | null;
  price: number | null;
  price_currency: Currency;
  status: VehicleStatus;
  show_on_website: boolean;
  description: string | null;
  notes: string | null;
};

export type MachineField = keyof MachineInput;

export const blankMachine = (): MachineInput => ({
  stock_no: "",
  category: null,
  make: "",
  model: "",
  year: null,
  hours: null,
  serial_no: null,
  operating_weight_kg: null,
  engine_power_hp: null,
  bucket_capacity_m3: null,
  attachments: null,
  condition: "used",
  location: null,
  branch: "JP",
  cost_currency: "JPY",
  cost_fx_rate: 1,
  purchase_price: null,
  expenses: null,
  price: null,
  price_currency: "USD",
  status: "in_stock",
  show_on_website: true,
  description: null,
  notes: null,
});

export const MACHINE_TEMPLATE_HEADERS: MachineField[] = [
  "stock_no",
  "category",
  "make",
  "model",
  "year",
  "hours",
  "serial_no",
  "operating_weight_kg",
  "engine_power_hp",
  "bucket_capacity_m3",
  "attachments",
  "condition",
  "location",
  "branch",
  "cost_currency",
  "cost_fx_rate",
  "purchase_price",
  "expenses",
  "price",
  "price_currency",
  "status",
  "show_on_website",
  "description",
  "notes",
];
export const MACHINE_TEMPLATE_SAMPLE = [
  "M-2001,Excavator,Komatsu,PC200-8,2014,6200,PC200-8-312345,20100,148,0.9,Standard bucket + breaker line,used,Yokohama yard,JP,JPY,1,3800000,150000,38500,USD,in_stock,yes,Good undercarriage,",
  "M-2002,Wheel loader,Caterpillar,950GC,2019,2100,CAT950GC-0042,18000,200,3.1,,used,Singapore yard,SG,SGD,112,92000,3500,98000,USD,in_stock,yes,One owner,",
  "M-2003,Forklift,Toyota,8FD25,2017,3900,,3900,55,,3-stage mast,used,Bangkok yard,TH,THB,4.2,310000,8000,6900,USD,in_stock,yes,,",
];

const ALIASES: Record<string, MachineField> = {
  stock_no: "stock_no", stockno: "stock_no", stock: "stock_no", id: "stock_no", ref: "stock_no", sku: "stock_no", 管理番号: "stock_no",
  category: "category", type: "category", group: "category", 種類: "category",
  make: "make", maker: "make", brand: "make", manufacturer: "make", メーカー: "make",
  model: "model", 型式: "model", 機種: "model",
  year: "year", model_year: "year", 年式: "year",
  hours: "hours", hour_meter: "hours", working_hours: "hours", meter: "hours", アワー: "hours", 稼働時間: "hours",
  serial_no: "serial_no", serial: "serial_no", serial_number: "serial_no", machine_no: "serial_no", 車台番号: "serial_no",
  operating_weight_kg: "operating_weight_kg", weight: "operating_weight_kg", operating_weight: "operating_weight_kg", weight_kg: "operating_weight_kg", 運転質量: "operating_weight_kg",
  engine_power_hp: "engine_power_hp", power: "engine_power_hp", hp: "engine_power_hp", engine_hp: "engine_power_hp", engine_power: "engine_power_hp", 出力: "engine_power_hp",
  bucket_capacity_m3: "bucket_capacity_m3", bucket: "bucket_capacity_m3", bucket_capacity: "bucket_capacity_m3", bucket_m3: "bucket_capacity_m3", バケット容量: "bucket_capacity_m3",
  attachments: "attachments", attachment: "attachments", accessories: "attachments", アタッチメント: "attachments",
  condition: "condition", 状態: "condition",
  location: "location", yard: "location", 保管場所: "location",
  branch: "branch", source: "branch", source_country: "branch", 拠点: "branch",
  cost_currency: "cost_currency", purchase_currency: "cost_currency",
  cost_fx_rate: "cost_fx_rate", cost_rate: "cost_fx_rate", jpy_rate: "cost_fx_rate",
  purchase_price: "purchase_price", cost: "purchase_price", buying_price: "purchase_price", 仕入価格: "purchase_price",
  expenses: "expenses", expense: "expenses", 諸経費: "expenses",
  price: "price", fob: "price", fob_price: "price", selling_price: "price", 販売価格: "price",
  price_currency: "price_currency", currency: "price_currency",
  status: "status",
  show_on_website: "show_on_website", website: "show_on_website", publish: "show_on_website",
  description: "description", details: "description", 説明: "description",
  notes: "notes", note: "notes", memo: "notes", 備考: "notes",
};

export function normalizeMachineHeader(h: string): MachineField | null {
  const k = h.trim().toLowerCase().replace(/[\s.\-/#()]+/g, "_").replace(/^_|_$/g, "");
  return ALIASES[k] ?? ALIASES[k.replace(/_/g, "")] ?? ALIASES[h.trim()] ?? null;
}

const str = (v: unknown) => {
  const s = v === null || v === undefined ? "" : String(v).trim();
  return s || null;
};
const num = (v: unknown) => {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(String(v).replace(/[,\s¥$€£]|kg|hp|m3|m³/gi, ""));
  return Number.isFinite(n) ? n : NaN;
};

const STATUS_ALIASES: Record<string, VehicleStatus> = {
  in_stock: "in_stock", instock: "in_stock", stock: "in_stock", available: "in_stock", 在庫あり: "in_stock",
  reserved: "reserved", 商談中: "reserved",
  sold: "sold", 売約済: "sold",
  shipped: "shipped", 船積済: "shipped",
};

/** Turns a raw spreadsheet row (already keyed by field) into a machine, with validation errors. */
export function parseMachine(raw: Partial<Record<MachineField, unknown>>): { data: MachineInput; errors: string[] } {
  const errors: string[] = [];
  const d = blankMachine();
  d.stock_no = str(raw.stock_no) ?? "";
  d.make = str(raw.make) ?? "";
  d.model = str(raw.model) ?? "";
  if (!d.stock_no) errors.push("stock_no is required");
  if (!d.make) errors.push("make is required");
  if (!d.model) errors.push("model is required");
  for (const f of ["category", "serial_no", "attachments", "location", "description", "notes"] as const) d[f] = str(raw[f]);

  const nums: Partial<Record<"year" | "hours" | "operating_weight_kg" | "engine_power_hp" | "bucket_capacity_m3" | "purchase_price" | "expenses" | "price", number>> = {};
  for (const f of ["year", "hours", "operating_weight_kg", "engine_power_hp", "bucket_capacity_m3", "purchase_price", "expenses", "price"] as const) {
    const n = num(raw[f]);
    if (Number.isNaN(n)) errors.push(`${f} is not a number`);
    else if (n !== null && n < 0) errors.push(`${f} can't be negative`);
    else if (n !== null) nums[f] = f === "year" || f === "hours" ? Math.round(n) : n;
  }
  Object.assign(d, nums);
  if (d.year !== null && (d.year < 1950 || d.year > 2100)) errors.push("year must be between 1950 and 2100");

  const cond = str(raw.condition)?.toLowerCase();
  if (cond) {
    const c = cond === "中古" ? "used" : cond === "新品" ? "new" : cond === "リビルト" || cond === "rebuild" ? "rebuilt" : cond;
    if (MACHINE_CONDITIONS.includes(c as MachineCondition)) d.condition = c as MachineCondition;
    else errors.push(`condition "${cond}" must be new / used / rebuilt`);
  }
  const cur = str(raw.price_currency)?.toUpperCase();
  if (cur) {
    if (CURRENCIES.includes(cur as Currency)) d.price_currency = cur as Currency;
    else errors.push(`currency "${cur}" must be one of ${CURRENCIES.join("/")}`);
  }
  const st = str(raw.status);
  if (st) {
    const key = st.toLowerCase().replace(/[\s\-]+/g, "_");
    const s = STATUS_ALIASES[key] ?? STATUS_ALIASES[key.replace(/_/g, "")] ?? STATUS_ALIASES[st];
    if (s) d.status = s;
    else errors.push(`status "${st}" must be in_stock / reserved / sold / shipped`);
  }
  const web = str(raw.show_on_website)?.toLowerCase();
  if (web) d.show_on_website = !["no", "n", "false", "0", "hidden", "いいえ"].includes(web);

  const br = str(raw.branch);
  if (br) {
    const b = parseBranch(br);
    if (b) d.branch = b;
    else errors.push(`branch "${br}" must be JP / SG / TW / TH`);
  }
  const cc = str(raw.cost_currency)?.toUpperCase();
  if (cc && !CURRENCIES.includes(cc as Currency)) errors.push(`cost currency "${cc}" must be one of ${CURRENCIES.join("/")}`);
  d.cost_currency = cc && CURRENCIES.includes(cc as Currency) ? (cc as Currency) : DEFAULT_BRANCHES.find((x) => x.code === d.branch)!.currency;
  const fx = num(raw.cost_fx_rate);
  if (Number.isNaN(fx) || (fx !== null && fx <= 0)) errors.push("cost_fx_rate must be a number above 0");
  d.cost_fx_rate = d.cost_currency === "JPY" ? 1 : fx && fx > 0 ? fx : 0;
  return { data: d, errors };
}

/** Total buying cost in JPY. */
export const machineCostJpy = (m: { purchase_price: number | null; expenses: number | null; cost_fx_rate: number | null }) =>
  Math.round((Number(m.purchase_price || 0) + Number(m.expenses || 0)) * (Number(m.cost_fx_rate) || 1));

/** "Komatsu PC200-8 2014" */
export const machineTitle = (m: { year?: number | null; make: string; model: string }) => [m.make, m.model, m.year].filter(Boolean).join(" ");
