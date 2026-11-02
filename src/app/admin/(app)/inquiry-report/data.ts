import "server-only";
import { createClient } from "@/lib/supabase/server";
import { fetchAll } from "@/lib/fetch-all";

export const PERIODS = [7, 30, 90, 365] as const;
export const readDays = (v: string | undefined) => (PERIODS as readonly number[]).includes(Number(v)) ? Number(v) : 30;

export type Click = { created_at: string; page: string | null; stock_no: string | null; country: string | null; utm_source: string | null; utm_campaign: string | null; referrer: string | null };
type Lead = { created_at: string; stock_no: string | null; country: string | null; page_url: string | null; source: string };

/** One row of a breakdown: WhatsApp clicks and web-form inquiries for the same key. */
export type Bucket = { key: string; clicks: number; leads: number };

const campaignOf = (source: string | null, campaign: string | null) => (source || campaign ? [source || "(no source)", campaign].filter(Boolean).join(" / ") : "(none)");
function utmOf(url: string | null) {
  try {
    const u = new URL(url ?? "");
    return campaignOf(u.searchParams.get("utm_source"), u.searchParams.get("utm_campaign"));
  } catch {
    return "(none)";
  }
}

function tally(rows: { key: string; kind: "clicks" | "leads" }[]) {
  const m = new Map<string, Bucket>();
  for (const r of rows) {
    const b = m.get(r.key) ?? { key: r.key, clicks: 0, leads: 0 };
    b[r.kind]++;
    m.set(r.key, b);
  }
  return [...m.values()].sort((a, b) => b.clicks + b.leads - (a.clicks + a.leads) || a.key.localeCompare(b.key));
}

/** WhatsApp clicks + web inquiries in the last `days` days, broken down by day, car, country and campaign. */
export async function loadReport(days: number) {
  const supabase = await createClient();
  const since = new Date(Date.now() - days * 86400_000).toISOString();
  const [clicks, leads] = await Promise.all([
    fetchAll<Click>((from, to) =>
      supabase.from("whatsapp_clicks").select("created_at, page, stock_no, country, utm_source, utm_campaign, referrer").gte("created_at", since).order("id").range(from, to)
    ),
    fetchAll<Lead>((from, to) =>
      supabase.from("inquiries").select("created_at, stock_no, country, page_url, source").neq("status", "spam").gte("created_at", since).order("id").range(from, to)
    ),
  ]);
  const both = (c: (x: Click) => string, l: (x: Lead) => string) =>
    tally([...clicks.map((x) => ({ key: c(x), kind: "clicks" as const })), ...leads.map((x) => ({ key: l(x), kind: "leads" as const }))]);
  const day = (d: string) => d.slice(0, 10);
  return {
    clicks,
    totals: { clicks: clicks.length, leads: leads.length },
    byDay: both((x) => day(x.created_at), (x) => day(x.created_at)).sort((a, b) => b.key.localeCompare(a.key)),
    byCar: both((x) => x.stock_no || "(no car)", (x) => x.stock_no || "(no car)"),
    // Clicks carry Cloudflare's 2-letter code; the form has the country the customer typed.
    byCountry: both((x) => x.country || "(unknown)", (x) => x.country?.trim() || "(unknown)"),
    byCampaign: both((x) => campaignOf(x.utm_source, x.utm_campaign), (x) => utmOf(x.page_url)),
  };
}

export type Contact = { email: string; phone: string; first_name: string; last_name: string; country: string; consent_at: string; source: string };

/**
 * Contacts who ticked the marketing opt-in on the sign-up or inquiry form — nobody else. One row
 * per email (or phone when there is no email), newest consent wins.
 */
export async function loadAudience() {
  const supabase = await createClient();
  const [leads, accounts] = await Promise.all([
    fetchAll<{ name: string; email: string | null; phone: string | null; country: string | null; marketing_consent_at: string | null }>((from, to) =>
      supabase.from("inquiries").select("name, email, phone, country, marketing_consent_at").eq("marketing_consent", true).neq("status", "spam").order("id").range(from, to)
    ),
    fetchAll<{ full_name: string | null; email: string; phone: string | null; whatsapp: string | null; country: string | null; marketing_consent_at: string | null }>((from, to) =>
      supabase.from("portal_accounts").select("full_name, email, phone, whatsapp, country, marketing_consent_at").eq("marketing_consent", true).neq("status", "rejected").order("created_at").range(from, to)
    ),
  ]);
  const split = (n: string | null) => {
    const parts = (n ?? "").trim().split(/\s+/).filter(Boolean);
    return { first_name: parts[0] ?? "", last_name: parts.slice(1).join(" ") };
  };
  const all: Contact[] = [
    ...leads.map((r) => ({ email: (r.email ?? "").toLowerCase(), phone: r.phone ?? "", ...split(r.name), country: r.country ?? "", consent_at: r.marketing_consent_at ?? "", source: "Inquiry" })),
    ...accounts.map((r) => ({ email: r.email.toLowerCase(), phone: r.whatsapp || r.phone || "", ...split(r.full_name), country: r.country ?? "", consent_at: r.marketing_consent_at ?? "", source: "Sign-up" })),
  ];
  const byKey = new Map<string, Contact>();
  for (const c of all.sort((a, b) => a.consent_at.localeCompare(b.consent_at))) {
    const key = c.email || c.phone.replace(/\D/g, "");
    if (key) byKey.set(key, { ...byKey.get(key), ...Object.fromEntries(Object.entries(c).filter(([, v]) => v)) } as Contact);
  }
  return [...byKey.values()].sort((a, b) => b.consent_at.localeCompare(a.consent_at));
}

/** Phone in E.164-ish form (+ and digits) — what Facebook and Google match on. */
export const e164 = (p: string) => {
  const d = p.replace(/[^\d+]/g, "").replace(/(?!^)\+/g, "");
  return d ? (d.startsWith("+") ? d : d.startsWith("00") ? `+${d.slice(2)}` : `+${d}`) : "";
};
