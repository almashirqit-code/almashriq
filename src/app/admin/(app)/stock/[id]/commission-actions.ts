"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { assertRole } from "@/lib/auth";
import { CURRENCIES, type Currency } from "@/lib/types";

type Result = { error?: string; ok?: boolean };

function refresh(vehicleId: string) {
  revalidatePath(`/admin/stock/${vehicleId}`);
  revalidatePath("/admin/stock");
  revalidatePath("/admin/expenses");
  revalidatePath("/admin/ledger");
}

/** Admin marks a car's commission paid; the database also books it in the expense book (migration 0035). */
export async function markCommissionPaid(vehicleId: string, v: { agentId: string; amount: number; currency: Currency; fxRate: number; paidOn: string; note: string }): Promise<Result> {
  await assertRole(["admin"]);
  if (!CURRENCIES.includes(v.currency)) return { error: "Choose the currency." };
  if (!(v.amount > 0)) return { error: "Enter the commission amount." };
  if (v.currency !== "JPY" && !(v.fxRate > 0)) return { error: `Enter the rate: 1 ${v.currency} = ? JPY.` };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v.paidOn)) return { error: "Enter the date it was paid." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("mark_commission_paid", {
    p_vehicle: vehicleId,
    p_agent: v.agentId,
    p_amount: v.amount,
    p_currency: v.currency,
    p_fx_rate: v.currency === "JPY" ? 1 : v.fxRate,
    p_paid_on: v.paidOn,
    p_note: v.note.slice(0, 300),
  });
  if (error) return { error: error.message };
  refresh(vehicleId);
  return { ok: true };
}

/** Undo a commission marked on the wrong car: clears the label and removes its expense. */
export async function reverseCommission(vehicleId: string): Promise<Result> {
  await assertRole(["admin"]);
  const supabase = await createClient();
  const { error } = await supabase.rpc("reverse_commission", { p_vehicle: vehicleId });
  if (error) return { error: error.message };
  refresh(vehicleId);
  return { ok: true };
}
