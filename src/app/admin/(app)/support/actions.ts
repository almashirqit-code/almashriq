"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/auth";
import type { SendResult, ChatMessage } from "@/components/support-chat";

// Visibility and permissions are enforced in the database (staff_can_see_thread, migration 0029).

function refresh(threadId: string) {
  revalidatePath("/admin/support");
  revalidatePath(`/admin/support/${threadId}`);
  revalidatePath("/admin", "layout"); // sidebar unread badge
}

export async function sendStaffMessage(threadId: string, body: string): Promise<SendResult> {
  await getProfile();
  const text = String(body ?? "").trim().slice(0, 4000);
  if (!text) return { error: "Write a message first." };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("staff_send_message", { p_thread: threadId, p_body: text });
  if (error) return { error: error.message.includes("closed") ? "This conversation is closed. Reopen it to reply." : error.message };
  refresh(threadId);
  const r = data as { thread_id: string; message: ChatMessage };
  return { thread_id: r.thread_id, message: r.message };
}

export async function markStaffRead(threadId: string) {
  await getProfile();
  const supabase = await createClient();
  await supabase.rpc("staff_mark_read", { p_thread: threadId });
  revalidatePath("/admin", "layout");
}

export async function setThreadStatus(threadId: string, status: "open" | "closed"): Promise<{ error?: string }> {
  await getProfile();
  const supabase = await createClient();
  const { error } = await supabase.rpc("staff_update_thread", { p_thread: threadId, p_status: status });
  if (error) return { error: error.message.includes("already") ? "This customer already has another open conversation." : error.message };
  refresh(threadId);
  return {};
}

export async function assignThread(threadId: string, agentId: string): Promise<{ error?: string }> {
  await getProfile();
  const supabase = await createClient();
  const { error } = await supabase.rpc("staff_update_thread", agentId ? { p_thread: threadId, p_assign: agentId } : { p_thread: threadId, p_unassign: true });
  if (error) return { error: error.message };
  refresh(threadId);
  return {};
}
