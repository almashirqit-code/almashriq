"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";
import { readChatFile, fileMeta } from "@/lib/support-files";
import { storeSlipFile, removeSlipFile, SLIP_CURRENCIES } from "@/lib/payment-slips";

export type SlipResult = { error?: string; ok?: boolean };

const clean = (v: FormDataEntryValue | null, max: number) => String(v ?? "").trim().slice(0, max);

/** Customer uploads a TT / bank transfer slip. Staff check it against the bank and mark it received. */
export async function submitSlip(formData: FormData): Promise<SlipResult> {
  const currency = clean(formData.get("currency"), 3);
  const amount = Number(clean(formData.get("amount"), 20).replace(/,/g, ""));
  const sentOn = clean(formData.get("sent_on"), 10);
  if (!(SLIP_CURRENCIES as readonly string[]).includes(currency)) return { error: "Choose the currency." };
  if (!Number.isFinite(amount) || amount <= 0 || amount >= 1e12) return { error: "Enter the amount you sent." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(sentOn)) return { error: "Enter the date you sent the money." };
  const { file, error: bad } = readChatFile(formData);
  if (!file) return { error: bad };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Please sign in again." };
  if (!(await rateLimit("pay-slip", 10, 3600, user.id))) return { error: "Too many uploads. Please try again later." };

  // Upload into the customer's own folder, then record the slip pointing at it.
  const { data: customerId } = await supabase.rpc("portal_customer_id");
  if (!customerId) return { error: "Your account isn't linked yet. Please contact us." };
  const { path, error: upErr } = await storeSlipFile(String(customerId), file);
  if (!path) return { error: upErr };
  const meta = fileMeta(file);
  const { error } = await supabase.rpc("portal_submit_slip", {
    p_currency: currency,
    p_amount: amount,
    p_sent_on: sentOn,
    p_bank: clean(formData.get("bank"), 120),
    p_reference: clean(formData.get("reference"), 120),
    p_note: clean(formData.get("note"), 1000),
    p_file_path: path,
    ...meta,
  });
  if (error) {
    await removeSlipFile(path);
    if (/transfer date/i.test(error.message)) return { error: "Check the transfer date." };
    if (/too many/i.test(error.message)) return { error: "Too many slips today. Please try again tomorrow." };
    return { error: "Your slip couldn't be sent. Please try again." };
  }
  revalidatePath("/account/payments");
  return { ok: true };
}
