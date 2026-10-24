"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";

export type InquiryState = { ok?: boolean; no?: number; error?: string };

/** Sends an inquiry from the customer's account; the database routes it to their agent. */
export async function sendPortalInquiry(_prev: InquiryState, formData: FormData): Promise<InquiryState> {
  const message = String(formData.get("message") ?? "").trim();
  const stock = String(formData.get("stock_no") ?? "").trim();
  if (!message) return { error: "Please write your message." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Please sign in again." };
  if (!(await rateLimit("portal-inquiry", 10, 3600, user.id))) return { error: "You've sent several inquiries already. Please try again later." };

  const { data, error } = await supabase.rpc("portal_create_inquiry", { p_message: message.slice(0, 4000), p_stock_no: stock.slice(0, 40) || null });
  if (error) return { error: /too many/i.test(error.message) ? "You've sent several inquiries already. Please try again later." : "We couldn't send your inquiry. Please try again." };
  revalidatePath("/account/inquiries");
  return { ok: true, no: Number(data) };
}
