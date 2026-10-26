"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { assertRole } from "@/lib/auth";
import { notifySlipReviewed } from "@/lib/notify";

type Result = { error?: string; ok?: boolean };
const STATUSES = ["submitted", "received", "rejected"] as const;

/** Marks a customer's payment slip received / rejected (with a note the customer sees), or back to waiting. */
export async function reviewSlip(id: number, status: (typeof STATUSES)[number], note: string): Promise<Result> {
  await assertRole(["admin", "manager"]);
  if (!Number.isInteger(id) || !STATUSES.includes(status)) return { error: "Invalid request." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("staff_review_slip", { p_id: id, p_status: status, p_note: note.trim().slice(0, 500) });
  if (error) return { error: error.message };
  if (status !== "submitted") notifySlipReviewed(id);
  revalidatePath("/admin/payment-slips");
  revalidatePath("/admin", "layout"); // sidebar badge
  return { ok: true };
}
