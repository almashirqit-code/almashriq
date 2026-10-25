"use server";

import { createClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";

type Kind = "vehicle" | "part" | "machine";
const KINDS: Kind[] = ["vehicle", "part", "machine"];
const UUID = /^[0-9a-f-]{36}$/i;

/** Logs a heart click (anonymous or signed in); the database keeps the customer's saved list in sync. */
export async function recordFavorite(kind: Kind, id: string, action: "add" | "remove", visitor: string | null, title: string) {
  if (!KINDS.includes(kind) || !UUID.test(id) || (action !== "add" && action !== "remove")) return;
  if (!(await rateLimit("fav", 200, 3600))) return;
  const supabase = await createClient();
  await supabase.rpc("record_favorite", {
    p_kind: kind,
    p_item: id,
    p_action: action,
    p_visitor: visitor && UUID.test(visitor) ? visitor : null,
    p_title: String(title ?? "").slice(0, 200),
  });
}

export type ServerFav = { item_kind: Kind; item_id: string; stock_no: string | null; title: string | null; created_at: string };

/** Signed-in customers: merge the browser list into the account and get the full saved list back (null if not a customer). */
export async function mergeFavorites(items: { kind: Kind; id: string; title: string }[]): Promise<ServerFav[] | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const clean = (Array.isArray(items) ? items : [])
    .filter((i) => KINDS.includes(i.kind) && UUID.test(i.id))
    .slice(0, 200)
    .map((i) => ({ kind: i.kind, id: i.id, title: String(i.title ?? "").slice(0, 200) }));
  const { data, error } = await supabase.rpc("portal_merge_favorites", { p_items: clean });
  if (error) return null;
  return (data ?? []) as ServerFav[];
}

/** Signed-in customers: one inquiry for the whole list, routed to their agent. */
export async function requestQuoteForFavorites(message: string): Promise<{ ok?: boolean; no?: number; error?: string }> {
  const text = String(message ?? "").trim().slice(0, 4000);
  if (!text) return { error: "Your list is empty." };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Please sign in again." };
  if (!(await rateLimit("portal-inquiry", 10, 3600, user.id))) return { error: "You've sent several requests already. Please try again later." };
  const { data, error } = await supabase.rpc("portal_create_inquiry", { p_message: text, p_stock_no: null });
  if (error) return { error: "We couldn't send your request. Please try again." };
  return { ok: true, no: Number(data) };
}
