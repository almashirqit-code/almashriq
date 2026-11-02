"use server";

import { createClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";

const TOPICS = ["stock", "offers", "account"] as const;
export type PushTopic = (typeof TOPICS)[number];
type Sub = { endpoint: string; keys: { p256dh: string; auth: string } };

const B64U = /^[A-Za-z0-9_-]+$/;

/** Saves this phone's push subscription, tied to whoever is signed in (no one for visitors). */
export async function savePushSubscription(sub: Sub, topics: PushTopic[]): Promise<{ ok?: boolean; error?: string }> {
  const endpoint = String(sub?.endpoint ?? "");
  const p256dh = String(sub?.keys?.p256dh ?? "");
  const auth = String(sub?.keys?.auth ?? "");
  if (!/^https:\/\/[^\s]+$/.test(endpoint) || endpoint.length > 1000 || !B64U.test(p256dh) || !B64U.test(auth)) return { error: "Invalid subscription" };
  if (!(await rateLimit("push-save", 30, 3600))) return { error: "Too many requests. Try again later." };
  const clean = [...new Set((topics ?? []).filter((t): t is PushTopic => TOPICS.includes(t)))];
  const supabase = await createClient();
  const { error } = await supabase.rpc("save_push_subscription", { p_endpoint: endpoint, p_p256dh: p256dh, p_auth: auth, p_topics: clean });
  return error ? { error: "Couldn't save your notification settings." } : { ok: true };
}

export async function deletePushSubscription(endpoint: string) {
  if (typeof endpoint !== "string" || endpoint.length > 1000) return;
  const supabase = await createClient();
  await supabase.rpc("delete_push_subscription", { p_endpoint: endpoint });
}
