"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { assertRole } from "@/lib/auth";
import { CURRENCIES, type Currency } from "@/lib/types";
import { notifyNewOffer } from "@/lib/notify";

export type OfferInput = {
  id?: string;
  title: string;
  summary: string;
  discount_pct: number | null;
  special_price: number | null;
  price_currency: Currency;
  starts_on: string;
  ends_on: string;
  stock_nos: string;
  banner_path: string | null;
  active: boolean;
};

const DATE = /^\d{4}-\d{2}-\d{2}$/;

function refresh() {
  revalidatePath("/admin/offers");
  revalidatePath("/offers");
  revalidatePath("/");
}

export async function saveOffer(o: OfferInput): Promise<{ error?: string; ok?: boolean }> {
  await assertRole(["admin", "manager"]);
  if (!o.title.trim()) return { error: "Title is required." };
  const pct = o.discount_pct == null || String(o.discount_pct) === "" ? null : Number(o.discount_pct);
  const price = o.special_price == null || String(o.special_price) === "" ? null : Number(o.special_price);
  if (pct != null && !(pct > 0 && pct < 100)) return { error: "Discount must be between 0 and 100%." };
  if (price != null && !(price > 0)) return { error: "Special FOB price must be more than 0." };
  if (!DATE.test(o.starts_on)) return { error: "Start date is required." };
  if (o.ends_on && (!DATE.test(o.ends_on) || o.ends_on < o.starts_on)) return { error: "End date must be on or after the start date." };
  const row = {
    title: o.title.trim().slice(0, 120),
    summary: o.summary.trim().slice(0, 500) || null,
    discount_pct: pct,
    special_price: price,
    price_currency: CURRENCIES.includes(o.price_currency) ? o.price_currency : "USD",
    starts_on: o.starts_on,
    ends_on: o.ends_on || null,
    stock_nos: [...new Set(o.stock_nos.split(/[\s,]+/).map((s) => s.trim().toUpperCase()).filter(Boolean))].slice(0, 50),
    banner_path: o.banner_path,
    active: !!o.active,
    updated_at: new Date().toISOString(),
  };
  const supabase = await createClient();
  const { error } = o.id ? await supabase.from("offers").update(row).eq("id", o.id) : await supabase.from("offers").insert(row);
  if (error) return { error: error.message };
  // New live offer → tell subscribed phones (edits don't repeat it). Dates are Japan dates.
  const today = new Date(Date.now() + 9 * 3600_000).toISOString().slice(0, 10);
  if (!o.id && row.active && row.starts_on <= today) notifyNewOffer(row);
  refresh();
  return { ok: true };
}

export async function setOfferActive(id: string, active: boolean) {
  await assertRole(["admin", "manager"]);
  const supabase = await createClient();
  const { error } = await supabase.from("offers").update({ active, updated_at: new Date().toISOString() }).eq("id", id);
  if (error) throw new Error(error.message);
  refresh();
}

export async function deleteOffer(id: string) {
  await assertRole(["admin", "manager"]);
  const supabase = await createClient();
  const { error } = await supabase.from("offers").delete().eq("id", id);
  if (error) throw new Error(error.message);
  refresh();
}
