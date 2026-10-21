"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { assertRole } from "@/lib/auth";
import { CURRENCIES, type Currency } from "@/lib/types";

const lines = (v: FormDataEntryValue | null) =>
  [...new Set(String(v ?? "").split(/\r?\n|,/).map((s) => s.trim()).filter(Boolean))];

export type SettingsState = { error?: string; ok?: boolean };

export async function saveSettings(_prev: SettingsState, formData: FormData): Promise<SettingsState> {
  await assertRole(["admin"]);
  const s = (k: string) => {
    const v = String(formData.get(k) ?? "").trim();
    return v === "" ? null : v;
  };
  const rates: Record<string, number> = { JPY: 1 };
  for (const c of CURRENCIES) {
    if (c === "JPY") continue;
    const n = Number(formData.get(`rate_${c}`));
    if (!n || n <= 0) return { error: `Invalid exchange rate for ${c}` };
    rates[c] = n;
  }
  const currency = String(formData.get("default_currency")) as Currency;
  const nextNo = Number(formData.get("next_invoice_no"));

  const supabase = await createClient();
  const { error } = await supabase
    .from("settings")
    .update({
      company_name: s("company_name") ?? "Al Mashriq",
      company_name_ja: s("company_name_ja"),
      address: s("address"),
      phone: s("phone"),
      email: s("email"),
      website: s("website"),
      logo_url: s("logo_url"),
      bank_details: s("bank_details"),
      invoice_terms: s("invoice_terms"),
      default_currency: CURRENCIES.includes(currency) ? currency : "USD",
      // Blank prefix = plain invoice numbers (e.g. 1079733)
      invoice_prefix: String(formData.get("invoice_prefix") ?? "").trim(),
      fax: s("fax"),
      mobile: s("mobile"),
      stamp_url: s("stamp_url"),
      intermediary_bank: s("intermediary_bank"),
      next_invoice_no: Number.isInteger(nextNo) && nextNo > 0 ? nextNo : 1,
      tax_rate: Math.max(0, Number(formData.get("tax_rate")) || 0),
      exchange_rates: rates,
      offices: lines(formData.get("offices")),
      shifts: lines(formData.get("shifts")),
      updated_at: new Date().toISOString(),
    })
    .eq("id", 1);
  if (error) return { error: error.message };
  revalidatePath("/", "layout");
  return { ok: true };
}
