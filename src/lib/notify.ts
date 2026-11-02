import "server-only";
import { after } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { SITE_URL, SUPPORT_EMAIL } from "@/lib/public-site";
import { money } from "@/lib/format";
import type { Currency } from "@/lib/types";
import { sendPush, pushConfigured, type PushMessage } from "@/lib/web-push";

/**
 * Notifications: an email through Resend (REST API, no SDK), a row in `notifications` for the bell
 * (migration 0034) and a push to the person's subscribed phones (migration 0042). All run after the response with after(), so a slow or failing delivery never blocks
 * or breaks the action that triggered it. Without RESEND_API_KEY only the bell rows are written.
 *
 * Recipients are looked up with the service key (server only): customer-triggered events need staff
 * addresses that customers can never read. Only ids, names and email addresses are read here.
 */
const FROM = "Al Mashriq Trading <noreply@almashriqtrading.site>";
const REPLY_TO = SUPPORT_EMAIL;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** A person to tell: a login (bell) and/or an email address. */
type Recipient = { id?: string | null; email?: string | null };
type Note = { kind: string; subject: string; title: string; lines: string[]; path: string; cta: string };

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

function html(n: Note) {
  const body = n.lines.map((l) => `<p style="margin:0 0 12px;font-size:15px;line-height:22px;color:#1e293b">${esc(l)}</p>`).join("");
  return `<!doctype html><html><body style="margin:0;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:24px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:14px;overflow:hidden">
<tr><td style="background:#1b2f5a;padding:16px 24px;color:#ffffff;font-weight:900;font-size:18px">Al Mashriq Trading</td></tr>
<tr><td style="padding:24px"><h1 style="margin:0 0 16px;font-size:20px;color:#0f172a">${esc(n.title)}</h1>${body}
<p style="margin:20px 0 4px"><a href="${esc(SITE_URL + n.path)}" style="display:inline-block;background:#d71920;color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;padding:12px 22px;border-radius:10px">${esc(n.cta)}</a></p></td></tr>
<tr><td style="padding:14px 24px;background:#f8fafc;color:#64748b;font-size:12px;line-height:18px">
We only accept payment into the company bank account printed on our invoices. Not sure a message is from us? Check at ${esc(SITE_URL)}/verify-agent
</td></tr></table></td></tr></table></body></html>`;
}

const text = (n: Note) => [n.title, "", ...n.lines, "", `${n.cta}: ${SITE_URL}${n.path}`].join("\n");

async function email(to: string[], n: Note) {
  const key = process.env.RESEND_API_KEY;
  if (!key || !to.length) return;
  // Each recipient gets their own copy, so staff addresses aren't shared between them.
  const res = await fetch("https://api.resend.com/emails/batch", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify(to.map((addr) => ({ from: FROM, to: [addr], reply_to: REPLY_TO, subject: n.subject, html: html(n), text: text(n) }))),
  });
  if (!res.ok) console.error("[notify] Resend error", res.status, (await res.text().catch(() => "")).slice(0, 300));
}

async function bell(ids: string[], n: Note) {
  if (!ids.length) return;
  const db = createAdminClient();
  const { error } = await db.from("notifications").insert(
    ids.map((user_id) => ({ user_id, kind: n.kind, title: n.title.slice(0, 200), body: (n.lines[0] ?? "").slice(0, 500) || null, link: n.path }))
  );
  if (error) console.error("[notify] bell insert failed", error.message);
  else await db.rpc("prune_notifications");
}

type PushRow = { id: number; endpoint: string; p256dh: string; auth: string };

/** Sends to each phone in small batches and removes subscriptions the push service says are gone. */
async function pushTo(rows: PushRow[], msg: PushMessage) {
  const gone: number[] = [];
  for (let i = 0; i < rows.length; i += 50) {
    const batch = rows.slice(i, i + 50);
    const res = await Promise.all(batch.map((r) => sendPush(r, msg)));
    res.forEach((r, j) => r === "gone" && gone.push(batch[j].id));
  }
  if (gone.length) await createAdminClient().from("push_subscriptions").delete().in("id", gone);
}

/** Account alerts: phones where one of these logins is signed in and wants account alerts. */
async function push(ids: string[], n: Note) {
  if (!ids.length || !pushConfigured()) return;
  const { data } = await createAdminClient().from("push_subscriptions").select("id, endpoint, p256dh, auth").in("user_id", ids).contains("topics", ["account"]);
  await pushTo((data ?? []) as PushRow[], { title: n.title.slice(0, 120), body: (n.lines[0] ?? "").slice(0, 240), url: n.path, tag: n.kind });
}

/** Every phone subscribed to a topic (newest 900, so one event stays within Workers' request limits). */
async function broadcast(topic: "stock" | "offers", msg: PushMessage) {
  if (!pushConfigured()) return;
  const { data } = await createAdminClient()
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .contains("topics", [topic])
    .order("updated_at", { ascending: false })
    .limit(900);
  await pushTo((data ?? []) as PushRow[], msg);
}

async function deliver(people: Recipient[], n: Note) {
  const emails = [...new Set(people.map((p) => (p.email ?? "").trim().toLowerCase()).filter((e) => EMAIL.test(e)))];
  const ids = [...new Set(people.map((p) => p.id).filter(Boolean) as string[])];
  const results = await Promise.allSettled([email(emails, n), bell(ids, n), push(ids, n)]);
  for (const r of results) if (r.status === "rejected") console.error("[notify]", r.reason);
}

/** Runs after the response is sent; errors are logged, never thrown. */
function later(job: () => Promise<void>) {
  after(() => job().catch((e) => console.error("[notify]", e)));
}

// ---------------------------------------------------------------------------------------------------
// Recipients
// ---------------------------------------------------------------------------------------------------

/** Active admins and managers (they approve sign-ups and check payment slips). */
async function managers(): Promise<Recipient[]> {
  const { data } = await createAdminClient().from("profiles").select("id, email").eq("active", true).in("role", ["admin", "manager"]);
  return (data ?? []) as Recipient[];
}

async function staff(id: string | null | undefined): Promise<Recipient | null> {
  if (!id) return null;
  const { data } = await createAdminClient().from("profiles").select("id, email, active").eq("id", id).maybeSingle();
  return data?.active ? { id: data.id as string, email: data.email as string } : null;
}

/** The assigned agent, or admins/managers when nobody is assigned. */
async function agentOrManagers(agentId: string | null | undefined): Promise<Recipient[]> {
  const agent = await staff(agentId);
  return agent ? [agent] : managers();
}

/** The customer record's email plus their active portal logins (bell + email). */
async function customerPeople(customerId: string): Promise<Recipient[]> {
  const db = createAdminClient();
  const [{ data: c }, { data: logins }] = await Promise.all([
    db.from("customers").select("email").eq("id", customerId).maybeSingle(),
    db.from("portal_accounts").select("user_id, email").eq("customer_id", customerId).eq("status", "active"),
  ]);
  return [{ email: c?.email as string | null }, ...(logins ?? []).map((l) => ({ id: l.user_id as string, email: l.email as string }))];
}

// ---------------------------------------------------------------------------------------------------
// Staff alerts
// ---------------------------------------------------------------------------------------------------

export function notifySignup(v: { name: string; email: string; company?: string; country?: string }) {
  later(async () =>
    deliver(await managers(), {
      kind: "signup",
      subject: `New website sign-up: ${v.name}`,
      title: `New sign-up: ${v.name}`,
      lines: [
        `${v.name}${v.company ? ` (${v.company})` : ""}${v.country ? ` from ${v.country}` : ""} created an account on the website.`,
        `Email: ${v.email}`,
        "Link them to a customer record and assign their agent.",
      ],
      path: "/admin/portal-signups",
      cta: "Open portal sign-ups",
    })
  );
}

export function notifySlipSubmitted(v: { customerId: string; amount: number; currency: Currency; reference: string }) {
  later(async () => {
    const { data: c } = await createAdminClient().from("customers").select("customer_no, name, assigned_to").eq("id", v.customerId).maybeSingle();
    const who = c ? `#${c.customer_no} ${c.name}` : "A customer";
    const agent = await staff(c?.assigned_to as string | null);
    await deliver([...(await managers()), ...(agent ? [agent] : [])], {
      kind: "slip",
      subject: `Payment slip: ${money(v.amount, v.currency)} from ${c?.name ?? "a customer"}`,
      title: `Payment slip ${money(v.amount, v.currency)} to check`,
      lines: [`${who} uploaded a payment slip for ${money(v.amount, v.currency)}.`, ...(v.reference ? [`Reference: ${v.reference}`] : []), "Check the bank, enter the TT, then mark the slip received."],
      path: "/admin/payment-slips",
      cta: "Open payment slips",
    });
  });
}

/** Website form (agent or admins/managers) or customer account inquiry (their agent). */
export function notifyInquiry(inquiryNo: number | null | undefined) {
  if (!inquiryNo) return;
  later(async () => {
    const { data: q } = await createAdminClient()
      .from("inquiries")
      .select("inquiry_no, name, country, stock_no, message, source, assigned_to")
      .eq("inquiry_no", inquiryNo)
      .maybeSingle();
    if (!q) return;
    await deliver(await agentOrManagers(q.assigned_to as string | null), {
      kind: "inquiry",
      subject: `Inquiry INQ-${q.inquiry_no}: ${q.name}${q.stock_no ? ` · ${q.stock_no}` : ""}`,
      title: `Inquiry INQ-${q.inquiry_no} from ${q.name}`,
      lines: [
        `${q.name}${q.country ? ` (${q.country})` : ""} sent an inquiry${q.source === "portal" ? " from their account" : " on the website"}${q.stock_no ? ` about ${q.stock_no}` : ""}.`,
        ...(q.message ? [`“${String(q.message).slice(0, 500)}”`] : []),
      ],
      path: "/admin/inquiries",
      cta: "Open inquiries",
    });
  });
}

/** Only the first unread customer message since staff last read the chat, so a conversation isn't a flood of alerts. */
export function notifyCustomerMessage(threadId: string | null | undefined, preview: string) {
  if (!threadId) return;
  later(async () => {
    const { data: t } = await createAdminClient().from("support_threads").select("display_name, assigned_to, staff_unread").eq("id", threadId).maybeSingle();
    if (!t || Number(t.staff_unread) !== 1) return;
    await deliver(await agentOrManagers(t.assigned_to as string | null), {
      kind: "chat",
      subject: `Support chat: new message from ${t.display_name}`,
      title: `New chat message from ${t.display_name}`,
      lines: [`“${preview.slice(0, 500)}”`],
      path: "/admin/support",
      cta: "Reply in support chat",
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
    await deliver([{ id: userId, email: a.email as string }], {
      kind: "approved",
      subject: "Your Al Mashriq account is ready",
      title: `Welcome${a.full_name ? `, ${a.full_name}` : ""} — your account is ready`,
      lines: [
        "Your customer account has been approved.",
        "You can now see your invoices, payments, reservations, your cars' shipping and documents, and chat with your agent.",
      ],
      path: "/account",
      cta: "Open my account",
    });
  });
}

export function notifySlipReviewed(slipId: number) {
  later(async () => {
    const db = createAdminClient();
    const { data: s } = await db.from("payment_slips").select("customer_id, portal_user_id, amount, currency, sent_on, status, staff_note").eq("id", slipId).maybeSingle();
    if (!s || s.status === "submitted") return;
    const { data: login } = s.portal_user_id ? await db.from("portal_accounts").select("email").eq("user_id", s.portal_user_id).maybeSingle() : { data: null };
    const people = login?.email ? [{ id: s.portal_user_id as string, email: login.email as string }] : await customerPeople(s.customer_id as string);
    const amount = money(Number(s.amount), s.currency as Currency);
    const ok = s.status === "received";
    await deliver(people, {
      kind: "slip_reviewed",
      subject: ok ? `Payment received: ${amount}` : `About your payment slip for ${amount}`,
      title: ok ? `Payment of ${amount} received` : `Payment slip for ${amount} not matched yet`,
      lines: [
        ok ? `Your transfer of ${amount} (sent ${s.sent_on}) has reached our bank. Thank you.` : `We couldn't match your slip for ${amount} (sent ${s.sent_on}) with our bank yet.`,
        ...(s.staff_note ? [`Note from us: ${s.staff_note}`] : []),
      ],
      path: "/account/payments",
      cta: "See my payments",
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
    await deliver(await customerPeople(i.customer_id as string), {
      kind: "invoice",
      subject: `${label} ${i.invoice_no} from Al Mashriq Trading`,
      title: `${label} ${i.invoice_no} — ${total}`,
      lines: [
        `We've issued ${label.toLowerCase()} ${i.invoice_no} for ${total}.`,
        ...(i.due_date ? [`Due date: ${i.due_date}`] : []),
        ...(i.valid_until ? [`Valid until: ${i.valid_until}`] : []),
        "Open it in your account to view or print it. Every invoice has a QR code you can scan to check it is genuine.",
      ],
      path: `/account/invoices/${i.id}`,
      cta: `View ${label.toLowerCase()}`,
    });
  });
}

// ---------------------------------------------------------------------------------------------------
// Shipment updates (customer)
// ---------------------------------------------------------------------------------------------------

/**
 * Tells the car's customer when its shipment moves on: booked on a vessel, shipped (B/L issued),
 * released (waybill / surrender B/L), or original documents sent by courier. The step last told is
 * kept on the car ("status|courier tracking"), so saving the shipping page again repeats nothing.
 */
const STEPS = ["not_booked", "booked", "shipped", "delivered"];

export function notifyShipping(vehicleId: string) {
  later(async () => {
    const db = createAdminClient();
    const [{ data: v }, { data: s }, { data: docs }] = await Promise.all([
      db.from("vehicles").select("stock_no, make, model, year, shipping_status, notified_shipping").eq("id", vehicleId).maybeSingle(),
      db.from("vehicle_shipments").select("vessel_name, voyage_no, etd, eta, port_of_loading, place_of_delivery, courier_service, courier_tracking").eq("vehicle_id", vehicleId).maybeSingle(),
      db.from("vehicle_documents").select("kind").eq("vehicle_id", vehicleId).eq("kind", "surrender").limit(1),
    ]);
    if (!v) return;
    const courier = String(s?.courier_tracking ?? "").trim();
    const prev = (v.notified_shipping as string | null) ?? "not_booked|";
    const state = `${v.shipping_status}|${courier}`;
    if (state === prev) return;
    // Claim the change first, so two quick saves can't both send it.
    const claim = db.from("vehicles").update({ notified_shipping: state }).eq("id", vehicleId);
    const { data: claimed } = await (v.notified_shipping == null ? claim.is("notified_shipping", null) : claim.eq("notified_shipping", prev)).select("id");
    if (!claimed?.length) return;

    const [prevStatus, prevCourier] = prev.split("|");
    const status = v.shipping_status as string;
    const car = `${v.stock_no} ${[v.year, v.make, v.model].filter(Boolean).join(" ")}`.trim();
    const vessel = [s?.vessel_name, s?.voyage_no].filter(Boolean).join(" / ");
    const released = docs?.length ? "Surrender B/L" : "Waybill";
    let note: Omit<Note, "path" | "cta"> | null = null;
    const forward = STEPS.indexOf(status) > STEPS.indexOf(prevStatus); // a removed document never re-sends an older step
    if (forward && status === "booked")
      note = {
        kind: "ship_booked",
        subject: `Shipment booked: ${car}`,
        title: `${car} is booked for shipping`,
        lines: [
          `Your car is booked${vessel ? ` on ${vessel}` : ""}${s?.etd ? `, departing ${s.etd}` : ""}${s?.eta ? `, arriving ${s.eta}` : ""}.`,
          ...(s?.port_of_loading || s?.place_of_delivery ? [`Route: ${s?.port_of_loading || "Japan"} → ${s?.place_of_delivery || "your port"}`] : []),
        ],
      };
    else if (forward && status === "shipped")
      note = {
        kind: "ship_shipped",
        subject: `Shipped: ${car}`,
        title: `${car} has been shipped`,
        lines: [`Your car is on its way${vessel ? ` on ${vessel}` : ""}${s?.eta ? `, arriving ${s.eta}` : ""}. The Bill of Lading is in your account.`],
      };
    else if (forward && status === "delivered")
      note = {
        kind: "ship_released",
        subject: `${released} released: ${car}`,
        title: `${released} released for ${car}`,
        lines: [`The ${released.toLowerCase()} for your car is released, so it can be collected at the port. Download it from your account.`],
      };
    else if (courier && courier !== prevCourier)
      note = {
        kind: "ship_courier",
        subject: `Documents sent: ${car}`,
        title: `Original documents sent for ${car}`,
        lines: [`We sent the original documents${s?.courier_service ? ` by ${s.courier_service}` : ""}. Tracking no.: ${courier}`],
      };
    if (!note) return;

    const { data: owners } = await db.rpc("vehicle_customer_ids", { p_vehicle_id: vehicleId });
    const people = (await Promise.all(((owners ?? []) as string[]).map((id) => customerPeople(id)))).flat();
    if (people.length) await deliver(people, { ...note, path: "/account/cars", cta: "Track my car" });
  });
}

// ---------------------------------------------------------------------------------------------------
// Broadcasts to subscribed phones (push only, no email)
// ---------------------------------------------------------------------------------------------------

export function notifyNewStock(v: { stock_no: string; make?: string | null; model?: string | null; year?: number | string | null }) {
  later(() =>
    broadcast("stock", {
      title: "New in stock",
      body: `${[v.year, v.make, v.model].filter(Boolean).join(" ") || "A new car"} (${v.stock_no}) just arrived. See photos and price.`,
      url: `/cars/${encodeURIComponent(v.stock_no)}`,
      tag: `stock-${v.stock_no}`,
    })
  );
}

export function notifyNewOffer(o: { title: string; summary?: string | null }) {
  later(() =>
    broadcast("offers", { title: `New offer: ${o.title}`.slice(0, 120), body: (o.summary || "See the deal before it ends.").slice(0, 240), url: "/offers", tag: "offers" })
  );
}
