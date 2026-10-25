"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";
import { readChatFile, storeChatFile, removeChatFile, fileMeta } from "@/lib/support-files";
import type { SendResult, ChatMessage } from "@/components/support-chat";

const TOO_FAST = "You're sending messages very fast. Please wait a moment.";

async function signedIn() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

/** Customer → support. The database creates the conversation on the first message and routes it to the agent. */
export async function sendCustomerMessage(body: string): Promise<SendResult> {
  const text = String(body ?? "").trim().slice(0, 4000);
  if (!text) return { error: "Write a message first." };
  const { supabase, user } = await signedIn();
  if (!user) return { error: "Please sign in again." };
  if (!(await rateLimit("chat", 40, 600, user.id))) return { error: TOO_FAST };

  const { data, error } = await supabase.rpc("portal_send_message", { p_body: text });
  if (error) return { error: /too many/i.test(error.message) ? TOO_FAST : "Your message couldn't be sent. Please try again." };
  revalidatePath("/account", "layout");
  const r = data as { thread_id: string; message: ChatMessage };
  return { thread_id: r.thread_id, message: r.message };
}

/** Customer sends a photo or PDF (optional caption in `body`). */
export async function sendCustomerFile(formData: FormData): Promise<SendResult> {
  const { file, error: bad } = readChatFile(formData);
  if (!file) return { error: bad };
  const { supabase, user } = await signedIn();
  if (!user) return { error: "Please sign in again." };
  if (!(await rateLimit("chat-file", 15, 600, user.id))) return { error: TOO_FAST };

  // Upload into the customer's own thread folder, then send the message pointing at it.
  const { data: threadId, error: openErr } = await supabase.rpc("portal_open_thread");
  if (openErr || !threadId) return { error: "Your file couldn't be sent. Please try again." };
  const { path, error: upErr } = await storeChatFile(String(threadId), file);
  if (!path) return { error: upErr };
  const { data, error } = await supabase.rpc("portal_send_message", {
    p_body: String(formData.get("body") ?? "").trim().slice(0, 4000),
    p_file_path: path,
    ...fileMeta(file),
  });
  if (error) {
    await removeChatFile(path);
    return { error: /too many/i.test(error.message) ? TOO_FAST : "Your file couldn't be sent. Please try again." };
  }
  revalidatePath("/account", "layout");
  const r = data as { thread_id: string; message: ChatMessage };
  return { thread_id: r.thread_id, message: r.message };
}

export async function markCustomerRead() {
  const supabase = await createClient();
  await supabase.rpc("portal_mark_read");
}
