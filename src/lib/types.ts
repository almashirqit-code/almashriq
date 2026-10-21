export type Role = "admin" | "manager" | "sales";
export type VehicleStatus = "in_stock" | "reserved" | "sold" | "shipped";
export type InvoiceStatus = "draft" | "issued" | "partially_paid" | "paid" | "cancelled";
export type Currency = "JPY" | "USD" | "EUR" | "GBP";

export const CURRENCIES: Currency[] = ["JPY", "USD", "EUR", "GBP"];
export const VEHICLE_STATUSES: VehicleStatus[] = ["in_stock", "reserved", "sold", "shipped"];
export const INVOICE_STATUSES: InvoiceStatus[] = ["draft", "issued", "partially_paid", "paid", "cancelled"];
export const ROLES: Role[] = ["admin", "manager", "sales"];
/** Shipment terms. CNF is shown as "C&F". FOB: no freight; C&F: + freight; CIF: + freight + insurance. */
export const INCOTERMS = ["FOB", "CNF", "CIF"];
export const INCOTERM_LABEL: Record<string, string> = { FOB: "FOB", CNF: "C&F", CIF: "CIF" };
export const hasFreight = (incoterm: string | null | undefined) => incoterm === "CNF" || incoterm === "CIF";
export const hasInsurance = (incoterm: string | null | undefined) => incoterm === "CIF";
export type ShipmentType = "roro" | "container_20" | "container_40";
export const SHIPMENT_TYPES: ShipmentType[] = ["roro", "container_20", "container_40"];

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  role: Role;
  active: boolean;
  office: string | null;
  shift: string | null;
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
  offices: string[];
  shifts: string[];
  fax: string | null;
  mobile: string | null;
  stamp_url: string | null;
  intermediary_bank: string | null;
  show_bank_on_website?: boolean;
}

export interface Customer {
  id: string;
  customer_no: number;
  assigned_to: string | null;
  name: string;
  company: string | null;
  country: string | null;
  port: string | null;
  email: string | null;
  phone: string | null;
  whatsapp: string | null;
  address: string | null;
  notes: string | null;
  consignee_name: string | null;
  consignee_address: string | null;
  consignee_phone: string | null;
  consignee_email: string | null;
  notify_party: string | null;
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
  ownership: Ownership;
  supplier_name: string | null;
  supplier_contact: string | null;
  supplier_price: number | null;
  supplier_currency: Currency;
  show_on_website: boolean;
  for_parts: boolean;
  purchase_tax_rate: number;
  purchase_tax: number;
  expense_items: ExpenseItem[];
  fob_fx_rate: number | null;
  fob_usd: number | null;
  auction_house_id: string | null;
  yard_id: string | null;
  created_at: string;
  updated_at: string;
  vehicle_images?: VehicleImage[];
}

export type ExpenseType =
  | "auction_fee"
  | "recycle_fee"
  | "transportation"
  | "inspection"
  | "company_fee"
  | "meter_rewind"
  | "other";
export const EXPENSE_TYPES: ExpenseType[] = ["auction_fee", "recycle_fee", "transportation", "inspection", "company_fee", "meter_rewind", "other"];
/** Expense types that carry the consumption tax (e.g. auction fee + 10%). */
export const TAXED_EXPENSES: ExpenseType[] = ["auction_fee"];
export type ExpenseItem = { type: ExpenseType; amount: number; note?: string };

export type Ownership = "own" | "third_party";
export const OWNERSHIPS: Ownership[] = ["own", "third_party"];

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
  consignee_name: string | null;
  consignee_address: string | null;
  consignee_phone: string | null;
  notify_party: string | null;
  notes: string | null;
  subtotal: number;
  discount: number;
  freight: number;
  insurance: number;
  shipment_type: ShipmentType | null;
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
  "ownership",
  "supplier_name",
  "supplier_contact",
  "supplier_price",
  "supplier_currency",
  "show_on_website",
  "for_parts",
  "purchase_tax_rate",
  "fob_fx_rate",
  "expense_items",
  "auction_house_id",
  "yard_id",
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
  "supplier_price",
  "purchase_tax_rate",
  "fob_fx_rate",
];

/** Cost fields hidden from the sales role. */
export const COST_FIELDS: VehicleField[] = [
  "purchase_price",
  "expenses",
  "purchase_date",
  "supplier_price",
  "supplier_currency",
  "purchase_tax_rate",
  "fob_fx_rate",
  "expense_items",
];

export type RemittanceStatus = "unallocated" | "partial" | "allocated";
export const REMITTANCE_STATUSES: RemittanceStatus[] = ["unallocated", "partial", "allocated"];

export interface Remittance {
  id: number;
  customer_id: string;
  office: string;
  shift: string | null;
  currency: Currency;
  remitter: string;
  bank: string;
  bank_address: string;
  bank_phone: string | null;
  exchange_rate: number;
  instructed_amount: number;
  remit_amount: number;
  bank_charges: number;
  remit_date: string;
  received_date: string;
  remarks: string | null;
  allocated_amount: number;
  remaining_amount: number;
  status: RemittanceStatus;
  created_at: string;
}

export interface RemittanceDocument {
  id: string;
  remittance_id: number;
  path: string;
  file_name: string;
  mime_type: string | null;
  size_bytes: number | null;
  created_at: string;
}

export interface RemittanceAllocation {
  id: string;
  remittance_id: number;
  vehicle_id: string;
  amount: number;
  created_at: string;
}

export type ShipmentMode = "roro" | "container";
export const SHIPMENT_MODES: ShipmentMode[] = ["roro", "container"];

export interface Port {
  id: string;
  name: string;
  shipment_modes: ShipmentMode[];
  region: string | null;
  notes: string | null;
  active: boolean;
}

export interface AuctionHouse {
  id: string;
  name: string;
  port_id: string | null;
  notes: string | null;
  active: boolean;
}

export interface Yard {
  id: string;
  name: string;
  port_id: string | null;
  address: string | null;
  contact: string | null;
  phone: string | null;
  notes: string | null;
  active: boolean;
}

/** RoRo is only possible when the port allows it. */
export const portAllowsRoro = (p: Pick<Port, "shipment_modes"> | null | undefined) => !p || p.shipment_modes.includes("roro");

export interface FreightRate {
  id: string;
  port_id: string | null;
  destination: string;
  country: string | null;
  shipment_type: ShipmentType;
  amount: number;
  currency: Currency;
  valid_until: string | null;
  notes: string | null;
  active: boolean;
}

export type ReservationStatus = "active" | "invoiced" | "cancelled";
export const RESERVATION_STATUSES: ReservationStatus[] = ["active", "invoiced", "cancelled"];

export interface Reservation {
  id: string;
  reservation_no: number;
  vehicle_id: string;
  customer_id: string;
  sales_agent_id: string | null;
  price_term: "FOB" | "CNF" | "CIF";
  shipment_type: ShipmentType | null;
  port_of_loading: string | null;
  port_of_discharge: string | null;
  freight_rate_id: string | null;
  currency: Currency;
  exchange_rate: number;
  sold_price: number;
  freight: number;
  insurance: number;
  buying_cost_jpy: number;
  profit_jpy: number;
  reserved_until: string | null;
  status: ReservationStatus;
  invoice_id: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
}

export type ShippingStatus = "not_booked" | "booked" | "shipped" | "delivered";
export const SHIPPING_STATUSES: ShippingStatus[] = ["not_booked", "booked", "shipped", "delivered"];

export const SHIPPING_DOC_KINDS = ["bl", "amend_bl", "surrender", "draft_bl", "waybill", "shipping_invoice", "shipping_other"] as const;
export const COURIER_DOC_KINDS = [
  "export_cert",
  "export_cert_en",
  "inspection_cert",
  "auction_sheet",
  "courier_bl",
  "spare_key",
  "dhl_docs",
  "courier_other",
] as const;
export type VehicleDocKind = (typeof SHIPPING_DOC_KINDS)[number] | (typeof COURIER_DOC_KINDS)[number];

export interface VehicleDocument {
  id: string;
  vehicle_id: string;
  kind: VehicleDocKind;
  path: string;
  file_name: string;
  mime_type: string | null;
  size_bytes: number | null;
  created_at: string;
}

export interface VehicleShipment {
  vehicle_id: string;
  ship_company: string | null;
  vessel_name: string | null;
  voyage_no: string | null;
  etd: string | null;
  eta: string | null;
  port_of_loading: string | null;
  place_of_delivery: string | null;
  forwarding_agent: string | null;
  cut_off_date: string | null;
  bl_no: string | null;
  bl_date: string | null;
  booking_no: string | null;
  track_url: string | null;
  shipment_type: ShipmentType | null;
  container_no: string | null;
  freight_charges: number | null;
  freight_currency: Currency;
  vanning_charges: number | null;
  ship_invoice_details: string | null;
  courier_service: string | null;
  courier_company: string | null;
  courier_tracking: string | null;
  courier_date: string | null;
  courier_details: string | null;
  courier_charges: number | null;
  updated_at: string;
}
