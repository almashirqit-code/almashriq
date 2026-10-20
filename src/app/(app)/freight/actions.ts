"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { assertRole } from "@/lib/auth";
import { CURRENCIES, SHIPMENT_TYPES, type Currency, type ShipmentType } from "@/lib/types";

type Result = { error?: string; ok?: boolean };

export type FreightInput = {
  port_id: string | null;
  destination: string;
  country: string | null;
  shipment_type: ShipmentType;
  amount: number;
  currency: Currency;
  valid_until: string | null;
  notes: string | null;
  active: boolean;
};

export async function saveFreightRate(id: string | null, v: FreightInput): Promise<Result> {
  await assertRole(["admin", "manager"]);
  const destination = String(v.destination ?? "").trim();
  if (!destination) return { error: "Destination is required" };
  if (!SHIPMENT_TYPES.includes(v.shipment_type)) return { error: "Pick a shipment type" };
  const amount = Number(v.amount);
  if (!Number.isFinite(amount) || amount < 0) return { error: "Enter the freight amount" };
  const row = {
    port_id: v.port_id && /^[0-9a-f-]{36}$/i.test(v.port_id) ? v.port_id : null,
    destination,
    country: v.country?.trim() || null,
    shipment_type: v.shipment_type,
    amount,
    currency: CURRENCIES.includes(v.currency) ? v.currency : "USD",
    valid_until: v.valid_until || null,
    notes: v.notes?.trim() || null,
    active: v.active !== false,
  };
  const supabase = await createClient();
  const { error } = id ? await supabase.from("freight_rates").update(row).eq("id", id) : await supabase.from("freight_rates").insert(row);
  if (error) return { error: error.code === "23505" ? "fr_dup" : error.message };
  revalidatePath("/freight");
  return { ok: true };
}

export async function deleteFreightRate(id: string): Promise<Result> {
  await assertRole(["admin", "manager"]);
  const supabase = await createClient();
  const { error } = await supabase.from("freight_rates").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/freight");
  return { ok: true };
}
