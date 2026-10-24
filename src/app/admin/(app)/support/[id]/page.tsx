import Link from "next/link";
import { notFound } from "next/navigation";
import { MessagesSquare } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/auth";
import { PageHeader } from "@/components/ui";
import { SupportChat, type ChatMessage } from "@/components/support-chat";
import { loadStaff } from "../../customers/staff";
import { sendStaffMessage, markStaffRead } from "../actions";
import { ThreadControls } from "../thread-controls";

export const metadata = { title: "Support chat" };

export default async function SupportThread({ params }: { params: Promise<{ id: string }> }) {
  const me = await getProfile();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const supabase = await createClient();

  // RLS: only conversations this staff member may see.
  const { data: thread } = await supabase.from("support_threads").select("id, display_name, email, customer_id, assigned_to, status").eq("id", id).maybeSingle();
  if (!thread) notFound();
  const [{ data: msgs }, staff] = await Promise.all([
    supabase.from("support_messages").select("id, sender_kind, sender_name, body, created_at").eq("thread_id", id).order("created_at", { ascending: false }).limit(200),
    me.role === "sales" ? Promise.resolve([]) : loadStaff(),
  ]);
  const messages = ((msgs ?? []) as ChatMessage[]).reverse();
  const canAssign = me.role === "admin" || me.role === "manager";

  return (
    <>
      <PageHeader
        back={{ href: "/admin/support", label: "Support" }}
        icon={<MessagesSquare />}
        tone="fuchsia"
        title={thread.display_name}
        subtitle={
          <>
            {thread.email}
            {thread.customer_id ? (
              <>
                {" · "}
                <Link href={`/admin/customers/${thread.customer_id}`} className="font-semibold text-brand-700 hover:underline">
                  Open customer
                </Link>
              </>
            ) : canAssign ? (
              <>
                {" · "}
                <Link href="/admin/portal-signups" className="font-semibold text-amber-700 hover:underline">
                  Not linked yet — approve the sign-up
                </Link>
              </>
            ) : null}
          </>
        }
        actions={<ThreadControls threadId={thread.id} status={thread.status} assignedTo={thread.assigned_to} staff={staff} canAssign={canAssign} />}
      />
      <SupportChat
        threadId={thread.id}
        initial={messages}
        me="staff"
        send={sendStaffMessage.bind(null, thread.id)}
        markRead={markStaffRead.bind(null, thread.id)}
        tone="erp"
        closed={thread.status === "closed"}
      />
    </>
  );
}
