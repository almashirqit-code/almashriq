"use server";

import { createClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";
import { avatarSrc } from "@/lib/avatar";
import { SUPPORT_EMAIL } from "@/lib/public-site";

export type VerifyState = {
  query?: string;
  error?: string;
  result?: "staff" | "former" | "company" | "none";
  staff?: { name: string; role: string; office: string | null; avatar: string };
};

const ROLE: Record<string, string> = { admin: "Management", manager: "Manager", sales: "Sales agent" };

/** "Is this agent real?" — matches a phone, WhatsApp or email against staff and the company's own lines. */
export async function verifyContact(_prev: VerifyState, formData: FormData): Promise<VerifyState> {
  const query = String(formData.get("q") ?? "").trim().slice(0, 200);
  if (query.length < 6) return { query, error: "Enter the full phone number, WhatsApp number or email address." };
  if (!(await rateLimit("verify-agent", 20, 600))) return { query, error: "Too many checks. Please wait a few minutes and try again." };
  // The support mailbox isn't a staff login or the company email, but it is ours.
  if (query.toLowerCase() === SUPPORT_EMAIL) return { query, result: "company" };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("public_verify_contact", { p_query: query });
  if (error || !data) return { query, error: "The check isn't available right now. Please contact us directly." };
  const r = data as { result: string; name?: string; role?: string; office?: string | null; avatar_url?: string | null };
  if (r.result === "invalid") return { query, error: "Enter the full phone number (with country code) or the full email address." };
  if (r.result === "staff" && r.name)
    return { query, result: "staff", staff: { name: r.name, role: ROLE[r.role ?? ""] ?? "Staff", office: r.office ?? null, avatar: avatarSrc(r.avatar_url, r.name) } };
  if (r.result === "former" || r.result === "company") return { query, result: r.result };
  return { query, result: "none" };
}
