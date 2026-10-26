import "server-only";
import { after } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { SITE_URL } from "@/lib/public-site";
import { money } from "@/lib/format";
import type { Currency } from "@/lib/types";

/**
 * Email notifications through Resend (REST API, no SDK). Sent after the response with after(), so a
 * slow or failing email never blocks or breaks the action that triggered it. Without RESEND_API_KEY
 * nothing is sent.
 *
 * Recipients are looked up with the service key (server only): customer-triggered events need staff
 * addresses that customers can never read. Only email addresses and names are read here.
 */
const FROM = "Al Mashriq Trading <noreply@almashriqtrading.site>";
const REPLY_TO = "info@almashriqtrading.site";
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Mail = { to: (string | null | undefined)[]; subject: string; title: string; lines: string[]; cta?: { label: string; href: string } };

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

function html(m: Mail) {
  const body = m.lines.map((l) => `<p style="margin:0 0 12px;font-size:15px;line-height:22px;color:#1e293b">${esc(l)}</p>`).join("");
  const button = m.cta
    ? `<p style="margin:20px 0 4px"><a href="${esc(m.cta.href)}" style="display:inline-block;background:#d71920;color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;padding:12px 22px;border-radius:10px">${esc(m.cta.label)}</a></p>`
    : "";
  return `<!doctype html><html><body style="margin:0;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:24px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:14px;overflow:hidden">
<tr><td style="background:#1b2f5a;padding:16px 24px;color:#ffffff;font-weight:900;font-size:18px">Al Mashriq Trading</td></tr>
<tr><td style="padding:24px"><h1 style="margin:0 0 16px;font-size:20px;color:#0f172a">${esc(m.title)}</h1>${body}${button}</td></tr>
<tr><td style="padding:14px 24px;background:#f8fafc;color:#64748b;font-size:12px;line-height:18px">
We only accept payment into the company bank account printed on our invoices. Not sure a message is from us? Check at ${esc(SITE_URL)}/verify-agent
</td></tr></table></td></tr></table></body></html>`;
}

const text = (m: Mail) => [m.title, "", ...m.lines, ...(m.cta ? ["", `${m.cta.label}: ${m.cta.href}`] : [])].join("\n");

async function send(m: Mail) {
  const key = process.env.RESEND_API_KEY;
  const to = [...new Set(m.to.map((e) => (e ?? "").trim().toLowerCase()).filter((e) => EMAIL.test(e)))];
  if (!key || !to.length) return;
  try {
    // Several staff recipients each get their own copy, so addresses aren't shared between them.
    const res = await fetch("https://api.resend.com/emails/batch", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify(to.map((addr) => ({ from: FROM, to: [addr], reply_to: REPLY_TO, subject: m.subject, html: html(m), text: text(m) }))),
    });
    if (!res.ok) console.error("[notify] Resend error", res.status, (await res.text().catch(() => "")).slice(0, 300));
  } catch (e) {
    console.error("[notify] send failed", e);
  }
}

/** Runs after the response is sent; errors are logged, never thrown. */
function later(job: () => Promise<void>) {
  after(() => job().catch((e) => console.error("[notify]", e)));
}

// ---------------------------------------------------------------------------------------------------
// Recipients
// ---------------------------------------------------------------------------------------------------

/** Active admins and managers (they approve sign-ups and check payment slips). */
async function managers(): Promise<string[]> {
  const { data } = await createAdminClient().from("profiles").select("email").eq("active", true).in("role", ["admin", "manager"]);
  return (data ?? []).map((p) => p.email as string);
}

async function staffEmail(id: string | null | undefined): Promise<string | null> {
  if (!id) return null;
  const { data } = await createAdminClient().from("profiles").select("email, active").eq("id", id).maybeSingle();
  return data?.active ? (data.email as string) : null;
}

/** The assigned agent, or admins/managers when nobody is assigned. */
async function agentOrManagers(agentId: string | null | undefined) {
  const agent = await staffEmail(agentId);
  return agent ? [agent] : managers();
}

/** Every email a customer reads: the customer record's email plus their active portal logins. */
async function customerEmails(customerId: string): Promise<string[]> {
  const db = createAdminClient();
  const [{ data: c }, { data: logins }] = await Promise.all([
    db.from("customers").select("email").eq("id", customerId).maybeSingle(),
    db.from("portal_accounts").select("email").eq("customer_id", customerId).eq("status", "active"),
  ]);
  return [c?.email as string | null, ...(logins ?? []).map((l) => l.email as string)].filter(Boolean) as string[];
}

// ---------------------------------------------------------------------------------------------------
// Staff alerts
// ---------------------------------------------------------------------------------------------------

export function notifySignup(v: { name: string; email: string; company?: string; country?: string }) {
  later(async () =>
    send({
      to: await managers(),
      subject: `New website sign-up: ${v.name}`,
      title: "New customer sign-up",
      lines: [
        `${v.name}${v.company ? ` (${v.company})` : ""}${v.country ? ` from ${v.country}` : ""} created an account on the website.`,
        `Email: ${v.email}`,
        "Link them to a customer record and assign their agent.",
      ],
      cta: { label: "Open portal sign-ups", href: `${SITE_URL}/admin/portal-signups` },
    })
  );
}

export function notifySlipSubmitted(v: { customerId: string; amount: number; currency: Currency; reference: string }) {
  later(async () => {
    const { data: c } = await createAdminClient().from("customers").select("customer_no, name, assigned_to").eq("id", v.customerId).maybeSingle();
    const who = c ? `#${c.customer_no} ${c.name}` : "A customer";
    await send({
      to: [...(await managers()), await staffEmail(c?.assigned_to as string | null)],
      subject: `Payment slip: ${money(v.amount, v.currency)} from ${c?.name ?? "a customer"}`,
      title: "New payment slip to check",
      lines: [`${who} uploaded a payment slip for ${money(v.amount, v.currency)}.`, ...(v.reference ? [`Reference: ${v.reference}`] : []), "Check the bank, enter the TT, then mark the slip received."],
      cta: { label: "Open payment slips", href: `${SITE_URL}/admin/payment-slips` },
    });
  });
}

/** Website form (agentOrManagers) or customer account inquiry (their agent). */
export function notifyInquiry(inquiryNo: number | null | undefined) {
  if (!inquiryNo) return;
  later(async () => {
    const { data: q } = await createAdminClient()
      .from("inquiries")
      .select("id, inquiry_no, name, country, stock_no, message, source, assigned_to")
      .eq("inquiry_no", inquiryNo)
      .maybeSingle();
    if (!q) return;
    await send({
      to: await agentOrManagers(q.assigned_to as string | null),
      subject: `Inquiry INQ-${q.inquiry_no}: ${q.name}${q.stock_no ? ` · ${q.stock_no}` : ""}`,
      title: `New inquiry INQ-${q.inquiry_no}`,
      lines: [
        `${q.name}${q.country ? ` (${q.country})` : ""} sent an inquiry${q.source === "portal" ? " from their account" : " on the website"}.`,
        ...(q.stock_no ? [`Car: ${q.stock_no}`] : []),
        ...(q.message ? [`“${String(q.message).slice(0, 500)}”`] : []),
      ],
      cta: { label: "Open inquiries", href: `${SITE_URL}/admin/inquiries` },
    });
  });
}

/** Only the first unread customer message since staff last read the chat, so a conversation isn't a flood of emails. */
export function notifyCustomerMessage(threadId: string | null | undefined, preview: string) {
  if (!threadId) return;
  later(async () => {
    const { data: t } = await createAdminClient().from("support_threads").select("display_name, assigned_to, staff_unread").eq("id", threadId).maybeSingle();
    if (!t || Number(t.staff_unread) !== 1) return;
    await send({
      to: await agentOrManagers(t.assigned_to as string | null),
      subject: `Support chat: new message from ${t.display_name}`,
      title: "New support chat message",
      lines: [`${t.display_name} wrote:`, `“${preview.slice(0, 500)}”`],
      cta: { label: "Reply in support chat", href: `${SITE_URL}/admin/support` },
    });
  });
}

// ---------------------------------------------------------------------------------------------------
// Customer emails
// ---------------------------------------------------------------------------------------------------

export function notifyAccountApproved(userId: string) {
  later(async () => {
    const { data: a } = await createAdminClient().from("portal_accounts").select("email, full_name, status").eq("user_id", userId).maybeSingle();
    if (!a || a.status !== "active") return;
    await send({
      to: [a.email as string],
      subject: "Your Al Mashriq account is ready",
      title: `Welcome${a.full_name ? `, ${a.full_name}` : ""}`,
      lines: [
        "Your customer account has been approved.",
        "You can now see your invoices, payments, reservations, your cars' shipping and documents, and chat with your agent.",
      ],
      cta: { label: "Open my account", href: `${SITE_URL}/account` },
    });
  });
}

export function notifySlipReviewed(slipId: number) {
  later(async () => {
    const db = createAdminClient();
    const { data: s } = await db.from("payment_slips").select("customer_id, portal_user_id, amount, currency, sent_on, status, staff_note").eq("id", slipId).maybeSingle();
    if (!s || s.status === "submitted") return;
    const { data: login } = s.portal_user_id ? await db.from("portal_accounts").select("email").eq("user_id", s.portal_user_id).maybeSingle() : { data: null };
    const to = login?.email ? [login.email as string] : await customerEmails(s.customer_id as string);
    const amount = money(Number(s.amount), s.currency as Currency);
    const ok = s.status === "received";
    await send({
      to,
      subject: ok ? `Payment received: ${amount}` : `About your payment slip for ${amount}`,
      title: ok ? "We received your payment" : "We couldn't match your payment slip",
      lines: [
        ok ? `Your transfer of ${amount} (sent ${s.sent_on}) has reached our bank. Thank you.` : `We couldn't match your slip for ${amount} (sent ${s.sent_on}) with our bank yet.`,
        ...(s.staff_note ? [`Note from us: ${s.staff_note}`] : []),
      ],
      cta: { label: "See my payments", href: `${SITE_URL}/account/payments` },
    });
  });
}

const DOC_LABEL: Record<string, string> = { invoice: "Invoice", quotation: "Quotation", auction_deposit: "Auction deposit invoice" };

export function notifyInvoiceIssued(invoiceId: string) {
  later(async () => {
    const { data: i } = await createAdminClient()
      .from("invoices")
      .select("id, invoice_no, doc_type, status, currency, total, due_date, valid_until, customer_id")
      .eq("id", invoiceId)
      .maybeSingle();
    if (!i || i.status === "draft" || i.status === "cancelled" || !i.customer_id) return;
    const label = DOC_LABEL[i.doc_type as string] ?? "Invoice";
    const total = money(Number(i.total), i.currency as Currency);
    await send({
      to: await customerEmails(i.customer_id as string),
      subject: `${label} ${i.invoice_no} from Al Mashriq Trading`,
      title: `${label} ${i.invoice_no}`,
      lines: [
        `We've issued ${label.toLowerCase()} ${i.invoice_no} for ${total}.`,
        ...(i.due_date ? [`Due date: ${i.due_date}`] : []),
        ...(i.valid_until ? [`Valid until: ${i.valid_until}`] : []),
        "Open it in your account to view or print it. Every invoice has a QR code you can scan to check it is genuine.",
      ],
      cta: { label: `View ${label.toLowerCase()}`, href: `${SITE_URL}/account/invoices/${i.id}` },
    });
  });
}
