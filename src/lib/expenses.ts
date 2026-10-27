/** Expense book (migration 0035): categories and row shape, shared by the ERP pages and actions. */
import type { Currency } from "./types";

export const EXPENSE_CATEGORIES = [
  { value: "rent", label: "Rent & yard" },
  { value: "salaries", label: "Salaries & commission" },
  { value: "shipping", label: "Shipping & freight" },
  { value: "transport", label: "Transport & towing" },
  { value: "auction", label: "Auction fees" },
  { value: "repairs", label: "Repairs & cleaning" },
  { value: "inspection", label: "Inspection & documents" },
  { value: "customs", label: "Customs & port charges" },
  { value: "bank", label: "Bank charges" },
  { value: "utilities", label: "Utilities & internet" },
  { value: "marketing", label: "Marketing & ads" },
  { value: "software", label: "Software & subscriptions" },
  { value: "travel", label: "Travel" },
  { value: "office", label: "Office supplies" },
  { value: "tax", label: "Taxes & fees" },
  { value: "other", label: "Other" },
] as const;

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number]["value"];
export const expenseCategoryLabel = (v: string) => EXPENSE_CATEGORIES.find((c) => c.value === v)?.label ?? v;

export const PAYMENT_METHODS = ["Bank transfer", "Cash", "Card", "Cheque", "Other"] as const;

export type Expense = {
  id: number;
  expense_date: string;
  category: string;
  description: string;
  paid_to: string | null;
  reference: string | null;
  payment_method: string | null;
  currency: Currency;
  amount: number;
  fx_rate: number;
  amount_jpy: number;
  vehicle_id: string | null;
  office: string | null;
  receipt_path: string | null;
  receipt_name: string | null;
  receipt_type: string | null;
  created_by: string | null;
  created_at: string;
};
