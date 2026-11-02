"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { assertRole } from "@/lib/auth";
import { CURRENCIES, type Currency } from "@/lib/types";

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
      show_bank_on_website: formData.get("show_bank_on_website") === "on",
      next_invoice_no: Number.isInteger(nextNo) && nextNo > 0 ? nextNo : 1,
      tax_rate: Math.max(0, Number(formData.get("tax_rate")) || 0),
      exchange_rates: rates,
      updated_at: new Date().toISOString(),
    })
    .eq("id", 1);
  if (error) return { error: error.message };
  revalidatePath("/", "layout");
  revalidateTag("public-site"); // company details on the website
  return { ok: true };
}

export async function saveBranch(b: { code: string; currency: string; default_tax_rate: number; active: boolean }): Promise<{ error?: string }> {
  await assertRole(["admin"]);
  if (!CURRENCIES.includes(b.currency as Currency)) return { error: "Unknown currency" };
  const tax = Number(b.default_tax_rate);
  if (!(tax >= 0 && tax <= 100)) return { error: "Tax must be between 0 and 100" };
  const supabase = await createClient();
  const { error } = await supabase.from("branches").update({ currency: b.currency, default_tax_rate: tax, active: !!b.active }).eq("code", b.code);
  if (error) return { error: error.message };
  revalidatePath("/", "layout");
  revalidateTag("public-site"); // company details on the website
  return {};
}

type Place = "office" | "shift";
const column = (kind: Place) => (kind === "office" ? "offices" : "shifts");
const placeName = (v: string) => v.trim().replace(/\s+/g, " ").slice(0, 60);

function refreshPlaces() {
  revalidatePath("/admin/settings");
  revalidatePath("/admin", "layout");
}

/** Configuration → Offices: add an office or shift to the list staff, remittances and expenses use. */
export async function addPlace(kind: Place, name: string): Promise<{ error?: string }> {
  await assertRole(["admin"]);
  if (kind !== "office" && kind !== "shift") return { error: "Unknown kind" };
  const n = placeName(name);
  if (!n) return { error: "Enter a name" };
  const supabase = await createClient();
  const { data } = await supabase.from("settings").select("offices, shifts").single();
  const list = ((data?.[column(kind)] ?? []) as string[]);
  if (list.some((x) => x.toLowerCase() === n.toLowerCase())) return { error: kind === "office" ? "That office already exists." : "That shift already exists." };
  const { error } = await supabase.from("settings").update({ [column(kind)]: [...list, n], updated_at: new Date().toISOString() }).eq("id", 1);
  if (error) return { error: error.message };
  refreshPlaces();
  return {};
}

/** Renames everywhere it is used (staff, remittances, expenses) in one database transaction. */
export async function renamePlace(kind: Place, from: string, to: string): Promise<{ error?: string }> {
  await assertRole(["admin"]);
  const supabase = await createClient();
  const { error } = await supabase.rpc("rename_place", { p_kind: kind, p_from: from, p_to: placeName(to) });
  if (error) return { error: error.message };
  refreshPlaces();
  return {};
}

/** Removes an office or shift from the list; refused while active staff are still on it. */
export async function removePlace(kind: Place, name: string): Promise<{ error?: string; inUse?: number }> {
  await assertRole(["admin"]);
  if (kind !== "office" && kind !== "shift") return { error: "Unknown kind" };
  const supabase = await createClient();
  const { count } = await supabase.from("profiles").select("id", { count: "exact", head: true }).eq(kind, name).eq("active", true);
  if (count) return { inUse: count };
  const { data } = await supabase.from("settings").select("offices, shifts").single();
  const list = ((data?.[column(kind)] ?? []) as string[]).filter((x) => x !== name);
  if (kind === "office" && !list.length) return { error: "Keep at least one office." };
  const { error } = await supabase.from("settings").update({ [column(kind)]: list, updated_at: new Date().toISOString() }).eq("id", 1);
  if (error) return { error: error.message };
  refreshPlaces();
  return {};
}
