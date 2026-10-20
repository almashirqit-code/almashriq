export type Role = "admin" | "manager" | "sales";
export type VehicleStatus = "in_stock" | "reserved" | "sold" | "shipped";
export type InvoiceStatus = "draft" | "issued" | "partially_paid" | "paid" | "cancelled";
export type Currency = "JPY" | "USD" | "EUR" | "GBP";

export const CURRENCIES: Currency[] = ["JPY", "USD", "EUR", "GBP"];
export const VEHICLE_STATUSES: VehicleStatus[] = ["in_stock", "reserved", "sold", "shipped"];
export const INVOICE_STATUSES: InvoiceStatus[] = ["draft", "issued", "partially_paid", "paid", "cancelled"];
export const ROLES: Role[] = ["admin", "manager", "sales"];
export const INCOTERMS = ["FOB", "CNF", "CIF", "EXW", "DDP"];

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  role: Role;
  active: boolean;
  created_at: string;
}

export interface Settings {
  id: number;
  company_name: string;
  company_name_ja: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  logo_url: string | null;
  bank_details: string | null;
  default_currency: Currency;
  invoice_prefix: string;
  next_invoice_no: number;
  tax_rate: number;
  invoice_terms: string | null;
  exchange_rates: Record<Currency, number>;
}

export interface Customer {
  id: string;
  name: string;
  company: string | null;
  country: string | null;
  port: string | null;
  email: string | null;
  phone: string | null;
  whatsapp: string | null;
  address: string | null;
  notes: string | null;
  created_at: string;
}

export interface Vehicle {
  id: string;
  stock_no: string;
  chassis_no: string | null;
  make: string;
  model: string;
  grade: string | null;
  year: number | null;
  month: number | null;
  mileage: number | null;
  color: string | null;
  engine_cc: number | null;
  fuel: string | null;
  transmission: string | null;
  drive: string | null;
  steering: string | null;
  doors: number | null;
  seats: number | null;
  body_type: string | null;
  auction_grade: string | null;
  location: string | null;
  purchase_date: string | null;
  purchase_price: number | null;
  expenses: number | null;
  price: number | null;
  price_currency: Currency;
  status: VehicleStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
  vehicle_images?: VehicleImage[];
}

export interface VehicleImage {
  id: string;
  vehicle_id: string;
  path: string;
  sort_order: number;
}

export interface Invoice {
  id: string;
  invoice_no: string;
  customer_id: string;
  issue_date: string;
  due_date: string | null;
  currency: Currency;
  exchange_rate: number;
  status: InvoiceStatus;
  incoterm: string | null;
  port_of_loading: string | null;
  port_of_discharge: string | null;
  notes: string | null;
  subtotal: number;
  discount: number;
  tax_rate: number;
  tax: number;
  total: number;
  amount_paid: number;
  created_at: string;
  customers?: Pick<Customer, "id" | "name" | "company" | "country"> | null;
}

export interface InvoiceItem {
  id: string;
  invoice_id: string;
  vehicle_id: string | null;
  description: string;
  quantity: number;
  unit_price: number;
  amount: number;
  sort_order: number;
}

export interface Payment {
  id: string;
  invoice_id: string;
  paid_on: string;
  amount: number;
  method: string | null;
  reference: string | null;
}

/** Vehicle fields accepted by the editor and bulk import, in display order. */
export const VEHICLE_FIELDS = [
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
] as const;

export type VehicleField = (typeof VEHICLE_FIELDS)[number];

export const NUMERIC_VEHICLE_FIELDS: VehicleField[] = [
  "year",
  "month",
  "mileage",
  "engine_cc",
  "doors",
  "seats",
  "purchase_price",
  "expenses",
  "price",
];

/** Cost fields hidden from the sales role. */
export const COST_FIELDS: VehicleField[] = ["purchase_price", "expenses", "purchase_date"];
