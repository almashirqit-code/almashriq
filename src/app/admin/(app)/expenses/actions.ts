"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { assertRole } from "@/lib/auth";
import { CURRENCIES, type Currency } from "@/lib/types";
import { EXPENSE_CATEGORIES } from "@/lib/expenses";
import { readChatFile, fileMeta } from "@/lib/support-files";
import { storePrivateFile, removePrivateFile } from "@/lib/private-files";

export type ExpenseState = { error?: string; ok?: boolean };

const BUCKET = "expense-receipts";
const clean = (v: FormDataEntryValue | null, max: number) => String(v ?? "").trim().slice(0, max);

function refresh() {
  revalidatePath("/admin/expenses");
  revalidatePath("/admin/ledger");
}

/** Add or edit an expense (RLS: admins, and managers for their office). Optional receipt photo/PDF. */
export async function saveExpense(_prev: ExpenseState, formData: FormData): Promise<ExpenseState> {
  const profile = await assertRole(["admin", "manager"]);
  const id = Number(formData.get("id")) || null;
  const currency = clean(formData.get("currency"), 3) as Currency;
  const amount = Number(clean(formData.get("amount"), 20).replace(/,/g, ""));
  const fx = currency === "JPY" ? 1 : Number(clean(formData.get("fx_rate"), 20));
  const category = clean(formData.get("category"), 40);
  const description = clean(formData.get("description"), 300);
  const date = clean(formData.get("expense_date"), 10);
  const stock = clean(formData.get("stock_no"), 40);

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return { error: "Enter the date." };
  if (!EXPENSE_CATEGORIES.some((c) => c.value === category)) return { error: "Choose a category." };
  if (!description) return { error: "Describe the expense." };
  if (!CURRENCIES.includes(currency)) return { error: "Choose the currency." };
  if (!Number.isFinite(amount) || amount <= 0 || amount >= 1e12) return { error: "Enter the amount." };
  if (!Number.isFinite(fx) || fx <= 0) return { error: `Enter the rate: 1 ${currency} = ? JPY.` };

  const supabase = await createClient();
  let vehicle_id: string | null = null;
  if (stock) {
    const { data: v } = await supabase.from("vehicles").select("id").ilike("stock_no", stock).maybeSingle();
    if (!v) return { error: `No car with stock no. ${stock}.` };
    vehicle_id = v.id as string;
  }
  // A manager with an office books expenses to that office.
  const office = profile.role === "manager" && profile.office ? profile.office : clean(formData.get("office"), 60) || null;

  const row = {
    expense_date: date,
    category,
    description,
    paid_to: clean(formData.get("paid_to"), 120) || null,
    reference: clean(formData.get("reference"), 120) || null,
    payment_method: clean(formData.get("payment_method"), 40) || null,
    currency,
    amount: Math.round(amount * 100) / 100,
    fx_rate: fx,
    vehicle_id,
    office,
  };

  // Optional receipt.
  let receipt: { receipt_path: string; receipt_name: string; receipt_type: string } | null = null;
  const f = formData.get("file");
  if (f instanceof File && f.size > 0) {
    const { file, error: bad } = readChatFile(formData);
    if (!file) return { error: bad };
    const { path, error: upErr } = await storePrivateFile(BUCKET, date.slice(0, 7), file);
    if (!path) return { error: upErr };
    const meta = fileMeta(file);
    receipt = { receipt_path: path, receipt_name: meta.p_file_name, receipt_type: meta.p_file_type };
  }

  if (id) {
    const { data: old } = await supabase.from("company_expenses").select("receipt_path").eq("id", id).maybeSingle();
    if (!old) {
      if (receipt) await removePrivateFile(BUCKET, receipt.receipt_path);
      return { error: "Expense not found." };
    }
    const { error } = await supabase.from("company_expenses").update({ ...row, ...(receipt ?? {}) }).eq("id", id);
    if (error) {
      if (receipt) await removePrivateFile(BUCKET, receipt.receipt_path);
      return { error: "The expense couldn't be saved." };
    }
    if (receipt && old.receipt_path) await removePrivateFile(BUCKET, old.receipt_path as string);
  } else {
    const { error } = await supabase.from("company_expenses").insert({ ...row, ...(receipt ?? {}) });
    if (error) {
      if (receipt) await removePrivateFile(BUCKET, receipt.receipt_path);
      return { error: "The expense couldn't be saved." };
    }
  }
  refresh();
  return { ok: true };
}

export async function deleteExpense(id: number): Promise<ExpenseState> {
  await assertRole(["admin", "manager"]);
  const supabase = await createClient();
  // A commission expense is removed with "Reverse commission" on the car, so the car's label stays right.
  const { data: linked } = await supabase.from("vehicles").select("stock_no").eq("commission_expense_id", id).maybeSingle();
  if (linked) return { error: `This is the commission for ${linked.stock_no}. Use "Reverse" on that car instead.` };
  const { data, error } = await supabase.from("company_expenses").delete().eq("id", id).select("receipt_path");
  if (error || !data?.length) return { error: "The expense couldn't be deleted." };
  if (data[0].receipt_path) await removePrivateFile(BUCKET, data[0].receipt_path as string);
  refresh();
  return { ok: true };
}
