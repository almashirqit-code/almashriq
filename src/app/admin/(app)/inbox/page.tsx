import Link from "next/link";
import { Mail, Plus, Paperclip, Link2, AlertTriangle, CheckCircle2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/auth";
import { PageHeader, Empty } from "@/components/ui";
import { zohoConfigured, myMailboxes, listFolders, listMessages, ZOHO_REDIRECT, type MailSummary } from "@/lib/zoho-mail";
import { DisconnectButton } from "./mail-form";
import { mailTime, emailOf } from "./format";

export const metadata = { title: "Inbox" };
export const dynamic = "force-dynamic";

const SIZE = 50;

/** ERP inbox: the company's Zoho mailboxes (sales@, support@ ...) — read, reply and send from the ERP. */
export default async function InboxPage({ searchParams }: { searchParams: Promise<{ mb?: string; folder?: string; unread?: string; page?: string; connected?: string; error?: string }> }) {
  const profile = await getProfile();
  const sp = await searchParams;
  const isAdmin = profile.role === "admin";
  const banner = sp.connected ? (
    <p className="mb-4 flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-900 ring-1 ring-emerald-200">
      <CheckCircle2 className="h-4 w-4" /> Connected {sp.connected}.
    </p>
  ) : sp.error ? (
    <p className="mb-4 flex items-center gap-2 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800 ring-1 ring-red-200">
      <AlertTriangle className="h-4 w-4" /> Couldn&apos;t connect the mailbox: {sp.error}
    </p>
  ) : null;

  if (!zohoConfigured()) {
    return (
      <>
        <PageHeader icon={<Mail />} tone="sky" title="Inbox" />
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
            <li>Come back here and click &quot;Connect mailbox&quot; for sales@ and support@.</li>
          </ol>
        </div>
      </>
    );
  }

  const boxes = await myMailboxes();
  const connect = isAdmin ? (
    <a href="/api/zoho/connect" className="btn-secondary">
      <Link2 className="h-4 w-4" /> Connect mailbox
    </a>
  ) : null;

  if (boxes.length === 0) {
    return (
      <>
        <PageHeader icon={<Mail />} tone="sky" title="Inbox" actions={connect} />
        {banner}
        <Empty>{isAdmin ? "No mailbox connected yet. Click “Connect mailbox”, then sign in to Zoho as sales@ (repeat for support@)." : "No mailbox is shared with you yet. Ask an admin."}</Empty>
      </>
    );
  }

  const box = boxes.find((b) => b.id === sp.mb) ?? boxes[0];
  const page = Math.max(1, Number(sp.page) || 1);
  const unreadOnly = sp.unread === "1";
  let error = "";
  let mails: MailSummary[] = [];
  let folderId = "";
  let folderName = "Inbox";
  try {
    const folders = await listFolders(box.id);
    const wantSent = sp.folder === "sent";
    const f = folders.find((x) => x.folderType === (wantSent ? "Sent" : "Inbox")) ?? folders[0];
    folderId = f?.folderId ?? "";
    folderName = wantSent ? "Sent" : "Inbox";
    if (folderId) mails = await listMessages(box.id, folderId, { start: (page - 1) * SIZE + 1, limit: SIZE, unreadOnly });
  } catch (e) {
    error = (e as Error).message;
  }

  // Link senders to customer records (RLS: customers this user can see).
  const supabase = await createClient();
  const addrs = [...new Set(mails.map((m) => emailOf(sp.folder === "sent" ? m.toAddress.split(",")[0] : m.fromAddress)).filter(Boolean))];
  const { data: custs } = addrs.length ? await supabase.from("customers").select("id, name, customer_no, email").in("email", addrs) : { data: [] };
  const byEmail = new Map((custs ?? []).map((c) => [String(c.email).toLowerCase(), c]));
  const q = (x: Record<string, string>) => {
    const u = new URLSearchParams({ mb: box.id, ...(sp.folder === "sent" ? { folder: "sent" } : {}), ...(unreadOnly ? { unread: "1" } : {}), ...x });
    return `/admin/inbox?${u}`;
  };

  return (
    <>
      <PageHeader
        icon={<Mail />}
        tone="sky"
        title="Inbox"
        subtitle="Company mailboxes from Zoho Mail. Replies are sent from the mailbox and also appear in Zoho."
        actions={
          <div className="flex flex-wrap gap-2">
            {connect}
            <Link href={`/admin/inbox/compose?mb=${box.id}`} className="btn-primary">
              <Plus className="h-4 w-4" /> New email
            </Link>
          </div>
        }
      />
      {banner}

      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <nav className="flex flex-wrap gap-1.5" aria-label="Mailboxes">
          {boxes.map((b) => (
            <Link
              key={b.id}
              href={`/admin/inbox?mb=${b.id}`}
              aria-current={b.id === box.id ? "page" : undefined}
              className={`rounded-xl px-3.5 py-2 text-sm font-semibold ring-1 ${b.id === box.id ? "bg-slate-900 text-white ring-slate-900" : "bg-white text-slate-600 ring-slate-200 hover:bg-slate-50"}`}
            >
              {b.email}
            </Link>
          ))}
        </nav>
        <div className="flex flex-wrap gap-1.5 text-sm">
          <Link href={`/admin/inbox?mb=${box.id}`} className={`btn-ghost py-1.5 ${sp.folder !== "sent" ? "bg-slate-100" : ""}`}>
            Inbox
          </Link>
          <Link href={`/admin/inbox?mb=${box.id}&folder=sent`} className={`btn-ghost py-1.5 ${sp.folder === "sent" ? "bg-slate-100" : ""}`}>
            Sent
          </Link>
          {sp.folder !== "sent" && (
            <Link href={q({ unread: unreadOnly ? "0" : "1" })} className={`btn-ghost py-1.5 ${unreadOnly ? "bg-slate-100" : ""}`}>
              Unread only
            </Link>
          )}
        </div>
      </div>

      <div className="card overflow-hidden">
        {error ? (
          <p className="flex items-start gap-2 p-5 text-sm text-red-700">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> {error}
          </p>
        ) : mails.length === 0 ? (
          <Empty>{unreadOnly ? "No unread emails." : `${folderName} is empty.`}</Empty>
        ) : (
          <ul className="divide-y divide-slate-100">
            {mails.map((m) => {
              const other = sp.folder === "sent" ? m.toAddress : m.sender || m.fromAddress;
              const cust = byEmail.get(emailOf(sp.folder === "sent" ? m.toAddress.split(",")[0] : m.fromAddress));
              return (
                <li key={m.messageId}>
                  <Link
                    href={`/admin/inbox/message?mb=${box.id}&f=${m.folderId}&m=${m.messageId}`}
                    className={`grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 px-4 py-3 hover:bg-slate-50 ${m.unread ? "bg-sky-50/40" : ""}`}
                  >
                    <div className="min-w-0">
                      <div className="flex min-w-0 items-center gap-2">
                        {m.unread && <span className="h-2 w-2 shrink-0 rounded-full bg-sky-600" aria-label="Unread" />}
                        <span className={`truncate text-sm ${m.unread ? "font-bold text-slate-900" : "font-medium text-slate-700"}`}>{sp.folder === "sent" ? `To: ${other}` : other}</span>
                        {cust && <span className="shrink-0 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">#{cust.customer_no} {cust.name}</span>}
                      </div>
                      <div className={`truncate text-sm ${m.unread ? "font-semibold text-slate-900" : "text-slate-700"}`}>{m.subject}</div>
                      <div className="truncate text-xs text-slate-500">{m.summary}</div>
                    </div>
                    <div className="flex flex-col items-end gap-1 text-xs text-slate-500">
                      <span className="whitespace-nowrap">{mailTime(m.receivedTime)}</span>
                      {m.hasAttachment && <Paperclip className="h-3.5 w-3.5" aria-label="Has attachment" />}
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
      <div className="mt-3 flex justify-between text-sm">
        {page > 1 ? <Link href={q({ page: String(page - 1) })} className="btn-ghost">← Newer</Link> : <span />}
        {mails.length === SIZE && <Link href={q({ page: String(page + 1) })} className="btn-ghost">Older →</Link>}
      </div>

      {isAdmin && (
        <div className="mt-6 card p-4 text-sm">
          <div className="mb-2 font-semibold text-slate-700">Connected mailboxes</div>
          <ul className="space-y-1">
            {boxes.map((b) => (
              <li key={b.id} className="flex items-center justify-between gap-2">
                <span>{b.email}</span>
                <DisconnectButton id={b.id} email={b.email} />
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-slate-500">To add support@, click &quot;Connect mailbox&quot; and sign in to Zoho as that mailbox (sign out of the other one first).</p>
        </div>
      )}
    </>
  );
}
