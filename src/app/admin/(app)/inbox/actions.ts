"use server";

import { revalidatePath } from "next/cache";
import { assertRole, getProfile } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { replyTo, sendMail, disconnectMailbox } from "@/lib/zoho-mail";

export type MailResult = { error?: string; ok?: boolean };

const EMAILS = /^\s*[^\s@,;]+@[^\s@,;]+\.[^\s@,;]+\s*(,\s*[^\s@,;]+@[^\s@,;]+\.[^\s@,;]+\s*)*$/;
/** "Name <a@b.com>, c@d.com" → "a@b.com,c@d.com" (Zoho wants plain comma-separated addresses). */
const plain = (v: string) =>
  v
    .split(/[,;]/)
    .map((x) => (x.match(/<([^>]+)>/)?.[1] ?? x).trim())
    .filter(Boolean)
    .join(",");

type Draft = { from: string; to: string; cc: string; subject: string; text: string };

function check(v: Draft) {
  const to = plain(v.to);
  const cc = plain(v.cc);
  if (!to || !EMAILS.test(to)) return { error: "Enter a valid recipient email." };
  if (cc && !EMAILS.test(cc)) return { error: "Check the Cc addresses." };
  if (!v.text.trim()) return { error: "Write your message." };
  return { mail: { from: v.from, to, cc, subject: v.subject.trim().slice(0, 250) || "(no subject)", text: v.text.slice(0, 20000) } };
}

export async function replyAction(mailboxId: string, messageId: string, v: Draft): Promise<MailResult> {
  const me = await getProfile();
  if (!(await rateLimit("mail-send", 60, 3600, me.id))) return { error: "Too many emails sent. Please wait a little." };
  const c = check(v);
  if (!c.mail) return { error: c.error };
  try {
    await replyTo(mailboxId, messageId, c.mail);
  } catch (e) {
    return { error: (e as Error).message };
  }
  revalidatePath("/admin/inbox");
  return { ok: true };
}

export async function sendAction(mailboxId: string, v: Draft): Promise<MailResult> {
  const me = await getProfile();
  if (!(await rateLimit("mail-send", 60, 3600, me.id))) return { error: "Too many emails sent. Please wait a little." };
  const c = check(v);
  if (!c.mail) return { error: c.error };
  try {
    await sendMail(mailboxId, c.mail);
  } catch (e) {
    return { error: (e as Error).message };
  }
  revalidatePath("/admin/inbox");
  return { ok: true };
}

export async function disconnectAction(id: string): Promise<MailResult> {
  await assertRole(["admin"]);
  if (!/^[0-9a-f-]{36}$/i.test(id)) return { error: "Invalid mailbox." };
  await disconnectMailbox(id);
  revalidatePath("/admin/inbox");
  return { ok: true };
}
