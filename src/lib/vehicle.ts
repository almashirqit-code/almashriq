import {
  CURRENCIES,
  EXPENSE_TYPES,
  type ExpenseItem,
  NUMERIC_VEHICLE_FIELDS,
  VEHICLE_FIELDS,
  VEHICLE_STATUSES,
  type Currency,
  type VehicleField,
  type VehicleStatus,
} from "./types";

/** Header aliases accepted by bulk import (lower-cased, non-alphanumerics stripped). */
const ALIASES: Record<string, VehicleField> = {
  stockno: "stock_no",
  stock: "stock_no",
  stocknumber: "stock_no",
  refno: "stock_no",
  ref: "stock_no",
  在庫番号: "stock_no",
  chassisno: "chassis_no",
  chassis: "chassis_no",
  chassisnumber: "chassis_no",
  vin: "chassis_no",
  frameno: "chassis_no",
  車台番号: "chassis_no",
  make: "make",
  maker: "make",
  manufacturer: "make",
  brand: "make",
  メーカー: "make",
  model: "model",
  車種: "model",
  車名: "model",
  grade: "grade",
  trim: "grade",
  グレード: "grade",
  year: "year",
  modelyear: "year",
  regyear: "year",
  年式: "year",
  month: "month",
  regmonth: "month",
  mileage: "mileage",
  km: "mileage",
  odometer: "mileage",
  走行距離: "mileage",
  color: "color",
  colour: "color",
  色: "color",
  enginecc: "engine_cc",
  engine: "engine_cc",
  cc: "engine_cc",
  displacement: "engine_cc",
  排気量: "engine_cc",
  fuel: "fuel",
  fueltype: "fuel",
  燃料: "fuel",
  transmission: "transmission",
  trans: "transmission",
  gearbox: "transmission",
  ミッション: "transmission",
  drive: "drive",
  drivetrain: "drive",
  駆動: "drive",
  steering: "steering",
  ハンドル: "steering",
  doors: "doors",
  ドア数: "doors",
  seats: "seats",
  乗車定員: "seats",
  bodytype: "body_type",
  body: "body_type",
  ボディタイプ: "body_type",
  auctiongrade: "auction_grade",
  score: "auction_grade",
  評価点: "auction_grade",
  location: "location",
  yard: "yard_id",
  yardname: "yard_id",
  ヤード: "yard_id",
  auction: "auction_house_id",
  auctionhouse: "auction_house_id",
  auctionname: "auction_house_id",
  auctionyard: "auction_house_id",
  オークション会場: "auction_house_id",
  保管場所: "location",
  purchasedate: "purchase_date",
  仕入日: "purchase_date",
  purchaseprice: "purchase_price",
  cost: "purchase_price",
  仕入価格: "purchase_price",
  expenses: "expenses",
  expense: "expenses",
  諸経費: "expenses",
  price: "price",
  sellingprice: "price",
  saleprice: "price",
  fobprice: "price",
  販売価格: "price",
  pricecurrency: "price_currency",
  currency: "price_currency",
  通貨: "price_currency",
  status: "status",
  ステータス: "status",
  notes: "notes",
  remarks: "notes",
  comment: "notes",
  備考: "notes",
  ownership: "ownership",
  owner: "ownership",
  type: "ownership",
  所有: "ownership",
  supplier: "supplier_name",
  suppliername: "supplier_name",
  partner: "supplier_name",
  dealer: "supplier_name",
  仕入先: "supplier_name",
  suppliercontact: "supplier_contact",
  supplierphone: "supplier_contact",
  supplierprice: "supplier_price",
  dealerprice: "supplier_price",
  partnerprice: "supplier_price",
  仕入先価格: "supplier_price",
  suppliercurrency: "supplier_currency",
  showonwebsite: "show_on_website",
  website: "show_on_website",
  publish: "show_on_website",
  published: "show_on_website",
  web: "show_on_website",
  サイト掲載: "show_on_website",
  taxrate: "purchase_tax_rate",
  purchasetaxrate: "purchase_tax_rate",
  consumptiontax: "purchase_tax_rate",
  fxrate: "fob_fx_rate",
  fobfxrate: "fob_fx_rate",
  usdrate: "fob_fx_rate",
  jpyusd: "fob_fx_rate",
  為替レート: "fob_fx_rate",
  forparts: "for_parts",
  parts: "for_parts",
  partscar: "for_parts",
  partsonly: "for_parts",
  部品取り: "for_parts",
};

export function normalizeHeader(h: string): VehicleField | null {
  const raw = String(h ?? "").trim();
  if ((VEHICLE_FIELDS as readonly string[]).includes(raw)) return raw as VehicleField;
  const k = raw.toLowerCase().replace(/[\s_\-\.\(\)\/]+/g, "").replace(/km$|jpy$|yen$/, "");
  return ALIASES[k] ?? ALIASES[raw] ?? null;
}

const STATUS_ALIASES: Record<string, VehicleStatus> = {
  instock: "in_stock",
  stock: "in_stock",
  available: "in_stock",
  在庫あり: "in_stock",
  reserved: "reserved",
  商談中: "reserved",
  sold: "sold",
  売約済: "sold",
  shipped: "shipped",
  船積済: "shipped",
};

const OWNERSHIP_ALIASES: Record<string, "own" | "third_party"> = {
  own: "own",
  owned: "own",
  stock: "own",
  ownstock: "own",
  自社: "own",
  自社在庫: "own",
  thirdparty: "third_party",
  "3rdparty": "third_party",
  consignment: "third_party",
  partner: "third_party",
  supplier: "third_party",
  dealer: "third_party",
  委託: "third_party",
  委託車両: "third_party",
};

/** Accepts the JSON array from the form (or a spreadsheet cell); drops invalid lines. */
function parseExpenseItems(v: unknown): ExpenseItem[] {
  let arr: unknown = v;
  if (typeof v === "string") {
    try {
      arr = v.trim() ? JSON.parse(v) : [];
    } catch {
      arr = [];
    }
  }
  if (!Array.isArray(arr)) return [];
  return arr
    .map((e) => {
      const o = (e ?? {}) as Record<string, unknown>;
      const type = String(o.type ?? "") as ExpenseItem["type"];
      const amount = Number(o.amount);
      const note = typeof o.note === "string" ? o.note.trim().slice(0, 200) : undefined;
      return EXPENSE_TYPES.includes(type) && Number.isFinite(amount) && amount > 0 ? { type, amount, ...(note ? { note } : {}) } : null;
    })
    .filter(Boolean) as ExpenseItem[];
}

function toBool(v: unknown, fallback: boolean): boolean {
  if (v === null || v === undefined || v === "") return fallback;
  if (typeof v === "boolean") return v;
  const s = String(v).trim().toLowerCase();
  if (["1", "true", "yes", "y", "on", "はい", "掲載"].includes(s)) return true;
  if (["0", "false", "no", "n", "off", "いいえ", "非掲載"].includes(s)) return false;
  return fallback;
}

function toNumber(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  const n = Number(String(v).replace(/[,¥$€£\s]|km|cc/gi, ""));
  return Number.isFinite(n) ? n : null;
}

function toDate(v: unknown): string | null {
  if (v === null || v === undefined || v === "") return null;
  if (v instanceof Date && !isNaN(v.getTime())) return v.toISOString().slice(0, 10);
  const s = String(v).trim().replace(/\//g, "-");
  const m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}

export type VehicleInput = Partial<Record<VehicleField, string | number | boolean | null | ExpenseItem[]>>;

/**
 * Normalizes raw values (from a form or spreadsheet row) into a DB-ready vehicle record.
 * Only keys present in `raw` are returned, so partial updates don't wipe other columns.
 */
export function parseVehicle(raw: Record<string, unknown>): { data: VehicleInput; errors: string[] } {
  const data: VehicleInput = {};
  const errors: string[] = [];

  for (const field of VEHICLE_FIELDS) {
    if (!(field in raw)) continue;
    const v = raw[field];
    if (NUMERIC_VEHICLE_FIELDS.includes(field)) {
      const n = toNumber(v);
      if (v !== "" && v !== null && v !== undefined && n === null) errors.push(`${field}: not a number`);
      data[field] =
        n === null
          ? field === "purchase_tax_rate"
            ? 10
            : null
          : ["price", "purchase_price", "expenses", "supplier_price", "purchase_tax_rate", "fob_fx_rate"].includes(field)
            ? n
            : Math.round(n);
    } else if (field === "ownership") {
      const k = String(v ?? "").trim().toLowerCase().replace(/[\s_\-]/g, "");
      data.ownership = OWNERSHIP_ALIASES[k] ?? OWNERSHIP_ALIASES[String(v ?? "").trim()] ?? "own";
    } else if (field === "show_on_website") {
      data.show_on_website = toBool(v, true);
    } else if (field === "for_parts") {
      data.for_parts = toBool(v, false);
    } else if (field === "expense_items") {
      data.expense_items = parseExpenseItems(v);
    } else if (field === "supplier_currency") {
      const c = String(v ?? "").trim().toUpperCase();
      data.supplier_currency = (CURRENCIES as string[]).includes(c) ? c : "JPY";
    } else if (field === "purchase_date") {
      data[field] = toDate(v);
    } else if (field === "status") {
      const s = String(v ?? "").trim();
      const key = s.toLowerCase().replace(/[\s_\-]/g, "");
      data.status = (VEHICLE_STATUSES as string[]).includes(s) ? s : STATUS_ALIASES[key] ?? STATUS_ALIASES[s] ?? "in_stock";
    } else if (field === "price_currency") {
      const c = String(v ?? "").trim().toUpperCase();
      data.price_currency = (CURRENCIES as string[]).includes(c) ? (c as Currency) : c === "" ? "JPY" : (errors.push(`price_currency: ${c}`), "JPY");
    } else {
      const s = v === null || v === undefined ? "" : String(v).trim();
      data[field] = s === "" ? null : s;
    }
  }

  if ("month" in data && data.month !== null && (Number(data.month) < 1 || Number(data.month) > 12)) {
    data.month = null;
  }

  // Stock no. falls back to chassis no.
  if (!data.stock_no && data.chassis_no) data.stock_no = data.chassis_no;
  if (!data.stock_no) errors.push("stock_no or chassis_no required");
  if (!data.make) errors.push("make required");
  if (!data.model) errors.push("model required");

  return { data, errors };
}

/** Column names for the downloadable CSV template (aliases are resolved on import). */
export const TEMPLATE_HEADERS: string[] = [
  "stock_no",
  "chassis_no",
  "make",
  "model",
  "grade",
  "year",
  "month",
  "mileage",
  "color",
  "engine_cc",
  "fuel",
  "transmission",
  "drive",
  "steering",
  "doors",
  "seats",
  "body_type",
  "auction_grade",
  "location",
  "purchase_date",
  "purchase_price",
  "expenses",
  "price",
  "price_currency",
  "status",
  "notes",
  "ownership",
  "supplier_name",
  "supplier_contact",
  "supplier_price",
  "supplier_currency",
  "show_on_website",
  "for_parts",
  "purchase_tax_rate",
  "fob_fx_rate",
  "auction_house",
  "yard",
];

export const TEMPLATE_SAMPLE = [
  "A1023,ZVW50-8012345,Toyota,Prius,S Touring,2018,5,62000,Pearl White,1800,Hybrid,AT,2WD,RHD,5,5,Hatchback,4.5,Yokohama,2026-09-12,980000,85000,8900,USD,in_stock,Sunroof,own,,,,,yes,no,10,150,USS Tokyo,",
  "P2001,NHP10-6123456,Toyota,Aqua,G,2017,11,78000,Silver,1500,Hybrid,AT,2WD,RHD,5,5,Hatchback,4,Kobe,,,,5600,USD,in_stock,Partner car,third_party,Sakura Motors,+81 90 1234 5678,700000,JPY,yes,no,10,150,USS Kobe,",
];
