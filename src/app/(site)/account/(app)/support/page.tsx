import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getPortalMe } from "@/lib/portal";
import { SUPPORT_EMAIL } from "@/lib/public-site";
import { SupportChat, type ChatMessage } from "@/components/support-chat";
import { sendCustomerMessage, sendCustomerFile, markCustomerRead } from "./actions";

export const metadata: Metadata = { title: "Support chat", robots: { index: false, follow: false } };

/** The customer's open support conversation (RLS: only their own threads are readable). */
export default async function AccountSupport() {
  const me = await getPortalMe();
  if (!me || me.status === "rejected") redirect("/account");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/account/login");

  const { data: thread } = await supabase.from("support_threads").select("id").eq("portal_user_id", user.id).eq("status", "open").maybeSingle();
  let messages: ChatMessage[] = [];
  if (thread) {
    const { data } = await supabase
      .from("support_messages")
      .select("id, sender_kind, sender_name, body, created_at, attachment_name, attachment_type, attachment_size")
      .eq("thread_id", thread.id)
      .order("created_at", { ascending: false })
      .limit(200);
    messages = ((data ?? []) as ChatMessage[]).reverse();
  }

  return (
    <>
      <p className="mb-3 text-sm text-white/70">
        {me.agent ? `Chat with ${me.agent.name} and our team.` : "Chat with our sales team."} We usually reply within working hours in Japan (JST). You can also email{" "}
        <a href={`mailto:${SUPPORT_EMAIL}`} className="font-semibold text-brand-700 hover:underline">
          {SUPPORT_EMAIL}
        </a>
        .
      </p>
      <SupportChat
        threadId={thread?.id ?? null}
        initial={messages}
        me="customer"
        send={sendCustomerMessage}
        sendFile={sendCustomerFile}
        markRead={markCustomerRead}
        tone="site"
        emptyText="Ask us anything about a car, a payment, shipping or documents. Use the paperclip to send a photo or your TT slip."
      />
    </>
  );
}
