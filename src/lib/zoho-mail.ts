import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { SITE_URL } from "@/lib/public-site";

/**
 * Zoho Mail for the ERP inbox (migration 0036). An admin connects each mailbox once with OAuth
 * (server-based client: ZOHO_CLIENT_ID / ZOHO_CLIENT_SECRET); the refresh token is kept in
 * mail_accounts, which only the service key can read. Every call checks the staff member may use
 * that mailbox (staff_mailboxes()) before touching Zoho.
 *
 * Zoho ids are 64-bit numbers, larger than JavaScript can hold exactly, so responses are parsed with
 * long digit runs turned into strings first.
 */

export const ZOHO_SCOPES = "ZohoMail.messages.ALL,ZohoMail.accounts.READ,ZohoMail.folders.READ";
export const ZOHO_REDIRECT = `${SITE_URL}/api/zoho/callback`;
export const zohoConfigured = () => !!(process.env.ZOHO_CLIENT_ID && process.env.ZOHO_CLIENT_SECRET);

export type Mailbox = { id: string; email: string; display_name: string | null };
type Account = Mailbox & { zoho_account_id: string; mail_domain: string; accounts_server: string; refresh_token: string };

export type MailSummary = {
  messageId: string;
  threadId: string | null;
  folderId: string;
  subject: string;
  summary: string;
  sender: string;
  fromAddress: string;
  toAddress: string;
  receivedTime: string;
  unread: boolean;
  hasAttachment: boolean;
};
export type Folder = { folderId: string; folderName: string; folderType: string };

const ZOHO_HOST = /^https:\/\/accounts\.zoho\.(com|eu|in|com\.au|jp|com\.cn|sa|ca|uk)$/;

/** JSON with 15+ digit numbers kept as strings (message, folder and account ids). */
const parse = (text: string) => JSON.parse(text.replace(/([:,[]\s*)(-?\d{15,})(?=\s*[,}\]])/g, '$1"$2"'));

// ---------------------------------------------------------------------------------------------------
// OAuth: connect a mailbox
// ---------------------------------------------------------------------------------------------------

/** Signed, short-lived state tying the Zoho callback to the admin who started it. */
export function signState(userId: string) {
  const body = `${userId}.${Date.now()}`;
  const sig = createHmac("sha256", process.env.ZOHO_CLIENT_SECRET!).update(body).digest("hex").slice(0, 32);
  return `${body}.${sig}`;
}
export function checkState(state: string, userId: string) {
  const [uid, ts, sig] = state.split(".");
  if (!uid || !ts || !sig || uid !== userId || Date.now() - Number(ts) > 10 * 60_000) return false;
  const want = createHmac("sha256", process.env.ZOHO_CLIENT_SECRET!).update(`${uid}.${ts}`).digest("hex").slice(0, 32);
  return want.length === sig.length && timingSafeEqual(Buffer.from(want), Buffer.from(sig));
}

export function authorizeUrl(state: string) {
  const u = new URL("https://accounts.zoho.com/oauth/v2/auth");
  u.search = new URLSearchParams({
    client_id: process.env.ZOHO_CLIENT_ID!,
    response_type: "code",
    redirect_uri: ZOHO_REDIRECT,
    scope: ZOHO_SCOPES,
    access_type: "offline",
    prompt: "consent",
    state,
  }).toString();
  return u.toString();
}

/** Exchanges the callback code, finds the mailbox address and stores (or refreshes) the connection. */
export async function connectMailbox(code: string, accountsServer: string, adminId: string): Promise<{ email?: string; error?: string }> {
  const server = ZOHO_HOST.test(accountsServer) ? accountsServer : "https://accounts.zoho.com";
  const tokenRes = await fetch(`${server}/oauth/v2/token`, {
    method: "POST",
    body: new URLSearchParams({
      code,
      grant_type: "authorization_code",
      client_id: process.env.ZOHO_CLIENT_ID!,
      client_secret: process.env.ZOHO_CLIENT_SECRET!,
      redirect_uri: ZOHO_REDIRECT,
    }),
  });
  const tok = (await tokenRes.json().catch(() => ({}))) as { access_token?: string; refresh_token?: string; error?: string };
  if (!tok.access_token || !tok.refresh_token) return { error: `Zoho didn't return a token (${tok.error ?? tokenRes.status}).` };

  const mailDomain = server.replace("://accounts.", "://mail.");
  const accRes = await fetch(`${mailDomain}/api/accounts`, { headers: { Authorization: `Zoho-oauthtoken ${tok.access_token}` } });
  const acc = parse(await accRes.text()) as { data?: { accountId: string; primaryEmailAddress?: string; mailboxAddress?: string; displayName?: string }[] };
  const a = acc.data?.[0];
  const email = (a?.primaryEmailAddress ?? a?.mailboxAddress ?? "").toLowerCase();
  if (!a?.accountId || !email) return { error: "Connected, but Zoho didn't return the mailbox. Is Zoho Mail set up for this login?" };

  const { error } = await createAdminClient()
    .from("mail_accounts")
    .upsert(
      { email, display_name: a.displayName ?? null, zoho_account_id: String(a.accountId), mail_domain: mailDomain, accounts_server: server, refresh_token: tok.refresh_token, connected_by: adminId, connected_at: new Date().toISOString() },
      { onConflict: "email" }
    );
  if (error) return { error: "The mailbox couldn't be saved." };
  return { email };
}

export async function disconnectMailbox(id: string) {
  await createAdminClient().from("mail_accounts").delete().eq("id", id);
}

// ---------------------------------------------------------------------------------------------------
// Calls (as the signed-in staff member)
// ---------------------------------------------------------------------------------------------------

/** Mailboxes the signed-in staff member may use (RPC checks their role). */
export async function myMailboxes(): Promise<Mailbox[]> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("staff_mailboxes");
  return (data ?? []) as Mailbox[];
}

async function account(mailboxId: string): Promise<Account> {
  if (!(await myMailboxes()).some((m) => m.id === mailboxId)) throw new Error("You don't have access to this mailbox.");
  const { data } = await createAdminClient().from("mail_accounts").select("*").eq("id", mailboxId).maybeSingle();
  if (!data) throw new Error("Mailbox not found.");
  return data as Account;
}

// Access tokens last an hour; reuse them within one server instance.
const tokens = new Map<string, { token: string; until: number }>();

async function accessToken(a: Account) {
  const hit = tokens.get(a.id);
  if (hit && hit.until > Date.now()) return hit.token;
  const res = await fetch(`${a.accounts_server}/oauth/v2/token`, {
    method: "POST",
    body: new URLSearchParams({ refresh_token: a.refresh_token, grant_type: "refresh_token", client_id: process.env.ZOHO_CLIENT_ID!, client_secret: process.env.ZOHO_CLIENT_SECRET! }),
  });
  const j = (await res.json().catch(() => ({}))) as { access_token?: string; expires_in?: number; error?: string };
  if (!j.access_token) throw new Error(`Zoho sign-in for ${a.email} failed (${j.error ?? res.status}). Reconnect the mailbox.`);
  tokens.set(a.id, { token: j.access_token, until: Date.now() + ((j.expires_in ?? 3600) - 120) * 1000 });
  return j.access_token;
}

async function zoho<T>(a: Account, path: string, init?: { method?: string; body?: unknown }): Promise<T> {
  const res = await fetch(`${a.mail_domain}/api/accounts/${a.zoho_account_id}${path}`, {
    method: init?.method ?? "GET",
    headers: { Authorization: `Zoho-oauthtoken ${await accessToken(a)}`, ...(init?.body ? { "Content-Type": "application/json" } : {}) },
    body: init?.body ? JSON.stringify(init.body) : undefined,
    cache: "no-store",
  });
  const text = await res.text();
  const j = text ? parse(text) : {};
  if (!res.ok) throw new Error(j?.data?.moreInfo ?? j?.status?.description ?? `Zoho error ${res.status}`);
  return j.data as T;
}

export async function getMailbox(mailboxId: string): Promise<Mailbox> {
  const a = await account(mailboxId);
  return { id: a.id, email: a.email, display_name: a.display_name };
}

export async function listFolders(mailboxId: string): Promise<Folder[]> {
  const a = await account(mailboxId);
  const rows = await zoho<{ folderId: string; folderName: string; folderType: string }[]>(a, "/folders");
  return rows.map((f) => ({ folderId: String(f.folderId), folderName: f.folderName, folderType: f.folderType }));
}

type RawMail = Record<string, string | number | boolean | null | undefined>;
/** Zoho sends address fields HTML-encoded ("Name &lt;a@b.com&gt;") and "Not Provided" when empty. */
const addr = (v: unknown) => {
  const s = String(v ?? "");
  return s === "Not Provided" ? "" : s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, "&");
};
const toSummary = (m: RawMail): MailSummary => ({
  messageId: String(m.messageId),
  threadId: m.threadId ? String(m.threadId) : null,
  folderId: String(m.folderId),
  subject: String(m.subject ?? "(no subject)"),
  summary: String(m.summary ?? ""),
  sender: String(m.sender ?? m.fromAddress ?? ""),
  fromAddress: addr(m.fromAddress),
  toAddress: addr(m.toAddress),
  receivedTime: String(m.receivedTime ?? m.sentDateInGMT ?? ""),
  // status "0" = unread, "1" = read
  unread: String(m.status) === "0",
  hasAttachment: String(m.hasAttachment) === "1" || m.hasAttachment === true,
});

export async function listMessages(mailboxId: string, folderId: string, opts: { start: number; limit: number; unreadOnly: boolean }): Promise<MailSummary[]> {
  const a = await account(mailboxId);
  const q = new URLSearchParams({ folderId, start: String(opts.start), limit: String(opts.limit), status: opts.unreadOnly ? "unread" : "all", includeto: "true" });
  const rows = await zoho<RawMail[]>(a, `/messages/view?${q}`);
  return (rows ?? []).map(toSummary);
}

/** Search the whole mailbox (subject, sender, body) — Zoho search syntax "entire:". */
export async function searchMessages(mailboxId: string, q: string, opts: { start: number; limit: number }): Promise<MailSummary[]> {
  const a = await account(mailboxId);
  const term = q.replace(/[:"]/g, " ").trim().slice(0, 80);
  if (!term) return [];
  const p = new URLSearchParams({ searchKey: `entire:${term}`, receivedTime: String(Date.now()), start: String(opts.start), limit: String(opts.limit), includeto: "true" });
  const rows = await zoho<RawMail[]>(a, `/messages/search?${p}`);
  return (rows ?? []).map(toSummary);
}

export async function getMessage(mailboxId: string, folderId: string, messageId: string) {
  const a = await account(mailboxId);
  const [details, content] = await Promise.all([
    zoho<RawMail>(a, `/folders/${folderId}/messages/${messageId}/details`),
    zoho<{ content: string }>(a, `/folders/${folderId}/messages/${messageId}/content`),
  ]);
  return { ...toSummary({ ...details, folderId, messageId }), ccAddress: addr(details.ccAddress), html: content?.content ?? "" };
}

export async function markRead(mailboxId: string, messageIds: string[]) {
  const a = await account(mailboxId);
  // Ids go as raw 64-bit numbers: build that part of the JSON by hand.
  const res = await fetch(`${a.mail_domain}/api/accounts/${a.zoho_account_id}/updatemessage`, {
    method: "PUT",
    headers: { Authorization: `Zoho-oauthtoken ${await accessToken(a)}`, "Content-Type": "application/json" },
    body: `{"mode":"markAsRead","messageId":[${messageIds.filter((x) => /^\d+$/.test(x)).join(",")}]}`,
  });
  if (!res.ok) throw new Error(`Zoho error ${res.status}`);
}

const htmlBody = (text: string) =>
  `<div style="font-family:Arial,sans-serif;font-size:14px">${text.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!).replace(/\r?\n/g, "<br>")}</div>`;

/**
 * Addresses this mailbox may send from: its own address, aliases, and "Send mail as" addresses such
 * as the sales@ / support@ groups (Zoho → Settings → Send mail as).
 */
export async function getSendAddresses(mailboxId: string): Promise<string[]> {
  const a = await account(mailboxId);
  const d = await zoho<{ sendMailDetails?: { fromAddress?: string }[]; emailAddress?: { mailId?: string }[] }>(a, "");
  const all = [a.email, ...(d?.emailAddress ?? []).map((x) => x.mailId), ...(d?.sendMailDetails ?? []).map((x) => x.fromAddress)];
  return [...new Set(all.map((x) => (x ?? "").trim().toLowerCase()).filter((x) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(x)))];
}

async function fromFor(a: Account, from: string) {
  const f = from.trim().toLowerCase() || a.email;
  if (f !== a.email && !(await getSendAddresses(a.id)).includes(f)) throw new Error(`This mailbox can't send as ${f}. Add it in Zoho → Settings → Send mail as.`);
  return f;
}

export async function replyTo(mailboxId: string, messageId: string, v: { from: string; to: string; cc: string; subject: string; text: string }) {
  const a = await account(mailboxId);
  await zoho(a, `/messages/${messageId}`, {
    method: "POST",
    body: { fromAddress: await fromFor(a, v.from), toAddress: v.to, ...(v.cc ? { ccAddress: v.cc } : {}), subject: v.subject, content: htmlBody(v.text), action: "reply", mailFormat: "html" },
  });
}

export async function sendMail(mailboxId: string, v: { from: string; to: string; cc: string; subject: string; text: string }) {
  const a = await account(mailboxId);
  await zoho(a, "/messages", {
    method: "POST",
    body: { fromAddress: await fromFor(a, v.from), toAddress: v.to, ...(v.cc ? { ccAddress: v.cc } : {}), subject: v.subject, content: htmlBody(v.text), mailFormat: "html" },
  });
}
