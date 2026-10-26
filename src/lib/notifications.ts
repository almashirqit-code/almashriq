import "server-only";
import { createClient } from "@/lib/supabase/server";

export type NotificationItem = { id: number; kind: string; title: string; body: string | null; link: string | null; read_at: string | null; created_at: string };

/** The signed-in user's latest bell notifications and unread count (RLS: own rows only, migration 0034). */
export async function getMyNotifications(): Promise<{ items: NotificationItem[]; unread: number }> {
  const supabase = await createClient();
  const [{ data }, { count }] = await Promise.all([
    supabase.from("notifications").select("id, kind, title, body, link, read_at, created_at").order("created_at", { ascending: false }).limit(20),
    supabase.from("notifications").select("id", { count: "exact", head: true }).is("read_at", null),
  ]);
  return { items: (data ?? []) as NotificationItem[], unread: count ?? 0 };
}
