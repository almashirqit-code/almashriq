import Link from "next/link";
import { Mail, Plus, Paperclip, Link2, AlertTriangle, CheckCircle2, RefreshCw, Search, ArrowLeft, Inbox as InboxIcon, Send, MailOpen, X } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/auth";
import { Empty } from "@/components/ui";
import {
  zohoConfigured,
  myMailboxes,
  listFolders,
  listMessages,
  searchMessages,
  getMessage,
  markRead,
  getSendAddresses,
  ZOHO_REDIRECT,
  type MailSummary,
  type Mailbox,
} from "@/lib/zoho-mail";
import { DisconnectButton } from "./mail-form";
import { EmailFrame } from "./email-frame";
import { ReplyBox } from "./reply-box";
import { mailTime, emailOf, groupAddress } from "./format";

export const metadata = { title: "Inbox" };
export const dynamic = "force-dynamic";

const SIZE = 50;
const ID = /^\d{1,20}$/;
type SP = { mb?: string; folder?: string; unread?: string; page?: string; q?: string; f?: string; m?: string; connected?: string; error?: string };

/**
 * ERP inbox for the company's Zoho mailboxes. Wide screens: email list and reading pane side by side,
 * each scrolling on its own. Phones: the list, or the open email with a back button.
 */
export default async function InboxPage({ searchParams }: { searchParams: Promise<SP> }) {
  const profile = await getProfile();
  const sp = await searchParams;
  const isAdmin = profile.role === "admin";
  const banner = sp.connected ? (
    <p className="mb-3 flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-2.5 text-sm text-emerald-900 ring-1 ring-emerald-200">
      <CheckCircle2 className="h-4 w-4" /> Connected {sp.connected}.
    </p>
  ) : sp.error ? (
    <p className="mb-3 flex items-center gap-2 rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-800 ring-1 ring-red-200">
      <AlertTriangle className="h-4 w-4" /> Couldn&apos;t connect the mailbox: {sp.error}
    </p>
  ) : null;

  if (!zohoConfigured()) return <Setup banner={banner} />;

  const boxes = await myMailboxes();
  if (boxes.length === 0) {
    return (
      <>
        <Title isAdmin={isAdmin} />
        {banner}
        <Empty>{isAdmin ? "No mailbox connected yet. Click “Connect mailbox” and sign in to Zoho." : "No mailbox is shared with you yet. Ask an admin."}</Empty>
      </>
    );
  }

  const box = boxes.find((b) => b.id === sp.mb) ?? boxes[0];
  const sent = sp.folder === "sent";
  const q = (sp.q ?? "").trim().slice(0, 80);
  const unreadOnly = sp.unread === "1" && !q && !sent;
  const page = Math.max(1, Number(sp.page) || 1);
  const selected = ID.test(sp.f ?? "") && ID.test(sp.m ?? "") ? { f: sp.f!, m: sp.m! } : null;

  // Keep the list's filters on every link; "x" overrides.
  const href = (x: Partial<Record<keyof SP, string | null>>) => {
    const base: Record<string, string> = { mb: box.id };
    if (sent) base.folder = "sent";
    if (unreadOnly) base.unread = "1";
    if (q) base.q = q;
    if (page > 1) base.page = String(page);
    for (const [k, v] of Object.entries(x)) {
      if (v === null || v === "") delete base[k];
      else if (v !== undefined) base[k] = v;
    }
    return `/admin/inbox?${new URLSearchParams(base)}`;
  };

  let error = "";
  let mails: MailSummary[] = [];
  try {
    if (q) mails = await searchMessages(box.id, q, { start: (page - 1) * SIZE + 1, limit: SIZE });
    else {
      const folders = await listFolders(box.id);
      const f = folders.find((x) => x.folderType === (sent ? "Sent" : "Inbox")) ?? folders[0];
      if (f) mails = await listMessages(box.id, f.folderId, { start: (page - 1) * SIZE + 1, limit: SIZE, unreadOnly });
    }
  } catch (e) {
    error = (e as Error).message;
  }

  // Link senders to customer records (RLS: customers this user can see).
  const supabase = await createClient();
  const party = (m: MailSummary) => emailOf((sent ? m.toAddress : m.fromAddress).split(",")[0]);
  const addrs = [...new Set(mails.map(party).filter(Boolean))];
  const { data: custs } = addrs.length ? await supabase.from("customers").select("id, name, customer_no, email").in("email", addrs) : { data: [] };
  const byEmail = new Map((custs ?? []).map((c) => [String(c.email).toLowerCase(), c]));

  return (
    <>
      <Title isAdmin={isAdmin} composeHref={`/admin/inbox/compose?mb=${box.id}`} />
      {banner}

      {/* Mailboxes + folders + search */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {boxes.length > 1 && (
          <nav className="flex flex-wrap gap-1.5" aria-label="Mailboxes">
            {boxes.map((b) => (
              <Link key={b.id} href={`/admin/inbox?mb=${b.id}`} aria-current={b.id === box.id ? "page" : undefined} className={`rounded-lg px-3 py-1.5 text-sm font-semibold ring-1 ${b.id === box.id ? "bg-slate-900 text-white ring-slate-900" : "bg-white text-slate-600 ring-slate-200 hover:bg-slate-50"}`}>
                {b.email}
              </Link>
            ))}
          </nav>
        )}
        <div className="flex rounded-lg bg-white p-0.5 ring-1 ring-slate-200" role="tablist" aria-label="Folder">
          <Link href={href({ folder: null, page: null, q: null, f: null, m: null })} aria-current={!sent && !q ? "page" : undefined} className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-semibold ${!sent && !q ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-50"}`}>
            <InboxIcon className="h-4 w-4" /> Inbox
          </Link>
          <Link href={href({ folder: "sent", unread: null, page: null, q: null, f: null, m: null })} aria-current={sent ? "page" : undefined} className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-semibold ${sent ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-50"}`}>
            <Send className="h-4 w-4" /> Sent
          </Link>
        </div>
        {!sent && !q && (
          <Link href={href({ unread: unreadOnly ? null : "1", page: null })} className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold ring-1 ${unreadOnly ? "bg-sky-600 text-white ring-sky-600" : "bg-white text-slate-600 ring-slate-200 hover:bg-slate-50"}`}>
            <MailOpen className="h-4 w-4" /> Unread
          </Link>
        )}
        <form action="/admin/inbox" className="ml-auto flex min-w-[14rem] flex-1 items-center gap-1.5 sm:max-w-sm">
          <input type="hidden" name="mb" value={box.id} />
          <label className="relative flex-1">
            <span className="sr-only">Search mail</span>
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input name="q" defaultValue={q} placeholder="Search name, subject, text…" className="input py-1.5 pl-8" />
          </label>
          {q && (
            <Link href={`/admin/inbox?mb=${box.id}`} className="btn-ghost p-2" aria-label="Clear search">
              <X className="h-4 w-4" />
            </Link>
          )}
        </form>
        <Link href={href({})} className="btn-ghost p-2" aria-label="Refresh" title="Refresh">
          <RefreshCw className="h-4 w-4" />
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-3 lg:h-[calc(100vh-13.5rem)] lg:min-h-[32rem] lg:grid-cols-[minmax(18rem,26rem)_minmax(0,1fr)]">
        {/* List */}
        <section className={`card flex min-h-0 flex-col overflow-hidden ${selected ? "hidden lg:flex" : "flex"}`} aria-label="Emails">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2 text-xs text-slate-500">
            <span>{q ? `Results for “${q}”` : sent ? "Sent" : unreadOnly ? "Unread" : "Inbox"}</span>
            <span>{box.email}</span>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
            {error ? (
              <p className="flex items-start gap-2 p-4 text-sm text-red-700">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> {error}
              </p>
            ) : mails.length === 0 ? (
              <div className="p-8 text-center text-sm text-slate-500">{q ? "No emails match your search." : unreadOnly ? "No unread emails. 🎉" : "Nothing here yet."}</div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {mails.map((m) => {
                  const active = selected?.m === m.messageId;
                  const unread = m.unread && !active;
                  const cust = byEmail.get(party(m));
                  const group = !sent ? groupAddress(m.toAddress, "", box.email) : null;
                  return (
                    <li key={m.messageId}>
                      <Link
                        href={href({ f: m.folderId, m: m.messageId })}
                        scroll={false}
                        aria-current={active ? "true" : undefined}
                        className={`block border-l-4 px-3.5 py-3 transition-colors ${active ? "border-sky-600 bg-sky-50" : unread ? "border-sky-400 bg-white hover:bg-slate-50" : "border-transparent hover:bg-slate-50"}`}
                      >
                        <div className="flex items-baseline gap-2">
                          <span className={`min-w-0 flex-1 truncate text-sm ${unread ? "font-bold text-slate-900" : "font-medium text-slate-700"}`}>{sent ? `To: ${m.toAddress}` : m.sender || m.fromAddress}</span>
                          <span className={`shrink-0 text-xs ${unread ? "font-semibold text-sky-700" : "text-slate-400"}`}>{mailTime(m.receivedTime)}</span>
                        </div>
                        <div className="mt-0.5 flex items-center gap-1.5">
                          <span className={`min-w-0 flex-1 truncate text-sm ${unread ? "font-semibold text-slate-900" : "text-slate-600"}`}>{m.subject}</span>
                          {m.hasAttachment && <Paperclip className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-label="Has attachment" />}
                        </div>
                        <div className="truncate text-xs text-slate-400">{m.summary}</div>
                        {(cust || group) && (
                          <div className="mt-1 flex flex-wrap gap-1">
                            {group && <span className="rounded-full bg-violet-50 px-2 py-0.5 text-[11px] font-semibold text-violet-700">{group.split("@")[0]}@</span>}
                            {cust && <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">#{cust.customer_no} {cust.name}</span>}
                          </div>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
          {(page > 1 || mails.length === SIZE) && (
            <div className="flex justify-between border-t border-slate-100 px-3 py-2 text-sm">
              {page > 1 ? (
                <Link href={href({ page: String(page - 1), f: null, m: null })} className="btn-ghost py-1">
                  ← Newer
                </Link>
              ) : (
                <span />
              )}
              {mails.length === SIZE && (
                <Link href={href({ page: String(page + 1), f: null, m: null })} className="btn-ghost py-1">
                  Older →
                </Link>
              )}
            </div>
          )}
        </section>

        {/* Reading pane */}
        <section className={`card min-h-0 flex-col overflow-hidden ${selected ? "flex" : "hidden lg:flex"}`} aria-label="Email">
          {selected ? (
            <Reader box={box} f={selected.f} m={selected.m} backHref={href({ f: null, m: null })} />
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 p-10 text-center text-slate-400">
              <Mail className="h-10 w-10" />
              <p className="text-sm">Select an email to read it here.</p>
            </div>
          )}
        </section>
      </div>

      {isAdmin && (
        <details className="mt-4 rounded-xl bg-white p-4 text-sm ring-1 ring-slate-200">
          <summary className="cursor-pointer font-semibold text-slate-700">Connected mailboxes ({boxes.length})</summary>
          <ul className="mt-2 space-y-1">
            {boxes.map((b) => (
              <li key={b.id} className="flex items-center justify-between gap-2">
                <span>{b.email}</span>
                <DisconnectButton id={b.id} email={b.email} />
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-slate-500">To add another mailbox, click &quot;Connect mailbox&quot; in a private window and sign in to Zoho as that mailbox.</p>
        </details>
      )}
    </>
  );
}

function Title({ isAdmin, composeHref }: { isAdmin: boolean; composeHref?: string }) {
  return (
    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
      <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-slate-900">
        <Mail className="h-6 w-6 text-sky-600" /> Inbox
      </h1>
      <div className="flex flex-wrap gap-2">
        {isAdmin && (
          <a href="/api/zoho/connect" className="btn-ghost text-sm">
            <Link2 className="h-4 w-4" /> Connect mailbox
          </a>
        )}
        {composeHref && (
          <Link href={composeHref} className="btn-primary">
            <Plus className="h-4 w-4" /> New email
          </Link>
        )}
      </div>
    </div>
  );
}

function Setup({ banner }: { banner: React.ReactNode }) {
  return (
    <>
      <Title isAdmin={false} />
      {banner}
      <div className="card max-w-2xl space-y-3 p-6 text-sm text-slate-700">
        <h2 className="text-base font-semibold text-slate-900">Connect Zoho Mail first</h2>
        <ol className="list-decimal space-y-1.5 pl-5">
          <li>
            Open <b>api-console.zoho.com</b> (signed in as the Zoho admin) → <b>Add client</b> → <b>Server-based Applications</b>.
          </li>
          <li>
            Homepage URL: <code>https://www.almashriqtrading.site</code> · Authorized redirect URI: <code>{ZOHO_REDIRECT}</code>
          </li>
          <li>
            Copy the <b>Client ID</b> and <b>Client Secret</b> into Vercel → Project → Settings → Environment Variables as <code>ZOHO_CLIENT_ID</code> and <code>ZOHO_CLIENT_SECRET</code>, then redeploy.
          </li>
          <li>Come back here and click &quot;Connect mailbox&quot;.</li>
        </ol>
      </div>
    </>
  );
}

/** The open email: header, body (auto height), reply. Marks it read in Zoho. */
async function Reader({ box, f, m, backHref }: { box: Mailbox; f: string; m: string; backHref: string }) {
  let mail;
  try {
    mail = await getMessage(box.id, f, m);
  } catch (e) {
    return (
      <p className="flex items-start gap-2 p-5 text-sm text-red-700">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> {(e as Error).message}
      </p>
    );
  }
  const [fromOptions] = await Promise.all([getSendAddresses(box.id).catch(() => [box.email]), mail.unread ? markRead(box.id, [m]).catch(() => undefined) : Promise.resolve()]);
  const group = groupAddress(mail.toAddress, mail.ccAddress, box.email);
  const replyFrom = group && fromOptions.includes(group) ? group : box.email;
  const sentByUs = fromOptions.includes(emailOf(mail.fromAddress));
  const replyTo = sentByUs ? mail.toAddress : mail.fromAddress;
  const supabase = await createClient();
  const { data: cust } = await supabase.from("customers").select("id, name, customer_no").eq("email", emailOf(replyTo.split(",")[0])).maybeSingle();
  const subject = /^re:/i.test(mail.subject) ? mail.subject : `Re: ${mail.subject}`;
  const initials = (mail.sender || mail.fromAddress || "?").replace(/[^A-Za-z]/g, "").slice(0, 2).toUpperCase() || "?";

  return (
    <>
      <div className="flex items-center gap-2 border-b border-slate-100 px-3 py-2 lg:hidden">
        <Link href={backHref} scroll={false} className="btn-ghost py-1 text-sm">
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <header className="border-b border-slate-100 px-5 py-4">
          <h2 className="text-lg font-bold leading-snug text-slate-900">{mail.subject}</h2>
          <div className="mt-3 flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sky-100 text-sm font-bold text-sky-700">{initials}</span>
            <div className="min-w-0 flex-1 text-sm">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                <span className="font-semibold text-slate-900">{mail.sender || mail.fromAddress}</span>
                <span className="text-xs text-slate-500">{mailTime(mail.receivedTime, true)}</span>
              </div>
              <div className="break-all text-xs text-slate-500">{mail.fromAddress}</div>
              <div className="mt-1 break-all text-xs text-slate-500">
                To: {mail.toAddress}
                {mail.ccAddress && <> · Cc: {mail.ccAddress}</>}
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {group && <span className="rounded-full bg-violet-50 px-2 py-0.5 text-[11px] font-semibold text-violet-700">via {group}</span>}
                {cust && (
                  <Link href={`/admin/customers/${cust.id}`} className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 hover:underline">
                    #{cust.customer_no} {cust.name}
                  </Link>
                )}
                {mail.hasAttachment && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">Attachments — open in Zoho Mail to download</span>}
              </div>
            </div>
          </div>
        </header>
        <div className="px-5 py-3">
          <EmailFrame html={mail.html} />
        </div>
        <ReplyBox
          mailboxId={box.id}
          from={replyFrom}
          fromOptions={fromOptions}
          messageId={m}
          to={replyTo}
          subject={subject}
          doneHref={backHref}
          hint={group && !fromOptions.includes(group) ? `This email went to ${group}. To reply as ${group}, add it in Zoho → Settings → Mail accounts → Send mail as.` : null}
        />
      </div>
    </>
  );
}
