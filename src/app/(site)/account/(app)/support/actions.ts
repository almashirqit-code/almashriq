"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";
import type { SendResult, ChatMessage } from "@/components/support-chat";

/** Customer → support. The database creates the conversation on the first message and routes it to the agent. */
export async function sendCustomerMessage(body: string): Promise<SendResult> {
  const text = String(body ?? "").trim().slice(0, 4000);
  if (!text) return { error: "Write a message first." };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Please sign in again." };
  if (!(await rateLimit("chat", 40, 600, user.id))) return { error: "You're sending messages very fast. Please wait a moment." };

  const { data, error } = await supabase.rpc("portal_send_message", { p_body: text });
  if (error) return { error: /too many/i.test(error.message) ? "You're sending messages very fast. Please wait a moment." : "Your message couldn't be sent. Please try again." };
  revalidatePath("/account", "layout");
  const r = data as { thread_id: string; message: ChatMessage };
  return { thread_id: r.thread_id, message: r.message };
}

export async function markCustomerRead() {
  const supabase = await createClient();
  await supabase.rpc("portal_mark_read");
}
