import {
  CURRENCIES,
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
  yard: "location",
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

export type VehicleInput = Partial<Record<VehicleField, string | number | null>>;

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
      data[field] = n === null ? null : field === "price" || field === "purchase_price" || field === "expenses" ? n : Math.round(n);
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

export const TEMPLATE_HEADERS: VehicleField[] = [
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
];

export const TEMPLATE_SAMPLE = [
  "A1023,ZVW50-8012345,Toyota,Prius,S Touring,2018,5,62000,Pearl White,1800,Hybrid,AT,2WD,RHD,5,5,Hatchback,4.5,Yokohama,2026-09-12,980000,85000,8900,USD,in_stock,Sunroof",
  "A1024,NHP10-6123456,Toyota,Aqua,G,2017,11,78000,Silver,1500,Hybrid,AT,2WD,RHD,5,5,Hatchback,4,Kobe,2026-09-20,620000,60000,5600,USD,in_stock,",
];
