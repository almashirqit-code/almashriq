import Link from "next/link";
import { notFound } from "next/navigation";
import { Mail, AlertTriangle } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui";
import { getMailbox, getMessage, markRead, getSendAddresses } from "@/lib/zoho-mail";
import { MailForm } from "../mail-form";
import { mailTime, emailOf, groupAddress } from "../format";

export const metadata = { title: "Email" };
export const dynamic = "force-dynamic";

const ID = /^\d{1,20}$/;

/**
 * One email. The body is shown in a sandboxed frame (no scripts, no access to the ERP page), so a
 * malicious email can't run code or read the session.
 */
export default async function MessagePage({ searchParams }: { searchParams: Promise<{ mb?: string; f?: string; m?: string }> }) {
  const { mb = "", f = "", m = "" } = await searchParams;
  if (!/^[0-9a-f-]{36}$/i.test(mb) || !ID.test(f) || !ID.test(m)) notFound();

  let box, mail;
  try {
    box = await getMailbox(mb);
    mail = await getMessage(mb, f, m);
  } catch (e) {
    return (
      <>
        <PageHeader icon={<Mail />} tone="sky" title="Email" back={{ href: `/admin/inbox?mb=${mb}`, label: "Inbox" }} />
        <p className="card flex items-start gap-2 p-5 text-sm text-red-700">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> {(e as Error).message}
        </p>
      </>
    );
  }
  if (mail.unread) await markRead(mb, [m]).catch(() => undefined);
  const fromOptions = await getSendAddresses(mb).catch(() => [box.email]);
  // Reply from the group the customer wrote to (sales@ / support@) when the mailbox may send as it.
  const group = groupAddress(mail.toAddress, mail.ccAddress, box.email);
  const replyFrom = group && fromOptions.includes(group) ? group : box.email;

  const sentByUs = fromOptions.includes(emailOf(mail.fromAddress)) || emailOf(mail.fromAddress) === box.email;
  const replyTo = sentByUs ? mail.toAddress : mail.fromAddress;
  const supabase = await createClient();
  const { data: cust } = await supabase.from("customers").select("id, name, customer_no").eq("email", emailOf(replyTo.split(",")[0])).maybeSingle();
  const subject = /^re:/i.test(mail.subject) ? mail.subject : `Re: ${mail.subject}`;
  const doc = `<!doctype html><html><head><meta charset="utf-8"><base target="_blank"><style>body{font-family:Arial,sans-serif;font-size:14px;color:#0f172a;margin:16px;word-wrap:break-word}img{max-width:100%;height:auto}</style></head><body>${mail.html}</body></html>`;

  return (
    <>
      <PageHeader icon={<Mail />} tone="sky" title={mail.subject} back={{ href: `/admin/inbox?mb=${mb}`, label: box.email }} />
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_26rem]">
        <section className="card min-w-0 overflow-hidden">
          <dl className="grid grid-cols-[4rem_minmax(0,1fr)] gap-x-3 gap-y-1 border-b border-slate-100 px-5 py-4 text-sm">
            <dt className="text-slate-500">From</dt>
            <dd className="break-all font-medium text-slate-800">{mail.sender && mail.sender !== mail.fromAddress ? `${mail.sender} <${mail.fromAddress}>` : mail.fromAddress}</dd>
            <dt className="text-slate-500">To</dt>
            <dd className="break-all text-slate-700">{mail.toAddress}</dd>
            {mail.ccAddress && (
              <>
                <dt className="text-slate-500">Cc</dt>
                <dd className="break-all text-slate-700">{mail.ccAddress}</dd>
              </>
            )}
            <dt className="text-slate-500">Date</dt>
            <dd className="text-slate-700">{mailTime(mail.receivedTime, true)}</dd>
            {cust && (
              <>
                <dt className="text-slate-500">Customer</dt>
                <dd>
                  <Link href={`/admin/customers/${cust.id}`} className="font-semibold text-brand-700 hover:underline">
                    #{cust.customer_no} {cust.name}
                  </Link>
                </dd>
              </>
            )}
          </dl>
          <iframe title="Email content" sandbox="allow-popups allow-popups-to-escape-sandbox" srcDoc={doc} className="h-[70vh] w-full bg-white" />
          {mail.hasAttachment && <p className="border-t border-slate-100 px-5 py-3 text-xs text-slate-500">This email has attachments — open it in Zoho Mail to download them.</p>}
        </section>
        <div className="xl:sticky xl:top-20">
          <MailForm mailboxId={mb} from={replyFrom} fromOptions={fromOptions} messageId={m} to={replyTo} subject={subject} doneHref={`/admin/inbox?mb=${mb}`} />
          {group && !fromOptions.includes(group) && (
            <p className="mt-2 text-xs text-amber-700">
              This email went to {group}. To reply as {group}, add it in Zoho → Settings → Mail accounts → Send mail as (the group must allow members to send as it).
            </p>
          )}
        </div>
      </div>
    </>
  );
}
