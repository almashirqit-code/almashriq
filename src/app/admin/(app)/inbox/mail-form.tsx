"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Send, Unplug } from "lucide-react";
import { replyAction, sendAction, disconnectAction } from "./actions";

/** Reply (messageId set) or new email from a connected mailbox. Plain text; Zoho sends it as HTML. */
export function MailForm({
  mailboxId,
  from,
  messageId,
  to = "",
  cc = "",
  subject = "",
  doneHref,
}: {
  mailboxId: string;
  from: string;
  messageId?: string;
  to?: string;
  cc?: string;
  subject?: string;
  doneHref: string;
}) {
  const router = useRouter();
  const [v, setV] = useState({ to, cc, subject, text: "" });
  const [showCc, setShowCc] = useState(!!cc);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [pending, start] = useTransition();
  const set = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setV((x) => ({ ...x, [k]: e.target.value }));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    start(async () => {
      setError("");
      const r = messageId ? await replyAction(mailboxId, messageId, v) : await sendAction(mailboxId, v);
      if (r.error) return setError(r.error);
      setSent(true);
      setV((x) => ({ ...x, text: "" }));
      if (!messageId) router.push(doneHref);
      router.refresh();
    });
  };

  return (
    <form onSubmit={submit} className="card space-y-3 p-5">
      <div className="text-xs text-slate-500">
        From <b className="text-slate-700">{from}</b>
      </div>
      <div className="grid gap-2 sm:grid-cols-[4rem_minmax(0,1fr)] sm:items-center">
        <label htmlFor="mail_to" className="text-sm font-semibold text-slate-600">To</label>
        <input id="mail_to" value={v.to} onChange={set("to")} required className="input" placeholder="customer@example.com" />
        {showCc ? (
          <>
            <label htmlFor="mail_cc" className="text-sm font-semibold text-slate-600">Cc</label>
            <input id="mail_cc" value={v.cc} onChange={set("cc")} className="input" />
          </>
        ) : (
          <button type="button" onClick={() => setShowCc(true)} className="text-left text-xs font-semibold text-brand-700 hover:underline sm:col-start-2">
            + Cc
          </button>
        )}
        <label htmlFor="mail_subject" className="text-sm font-semibold text-slate-600">Subject</label>
        <input id="mail_subject" value={v.subject} onChange={set("subject")} maxLength={250} className="input" />
      </div>
      <textarea value={v.text} onChange={set("text")} rows={8} required aria-label="Message" placeholder={messageId ? "Write your reply…" : "Write your message…"} className="input min-h-[10rem]" />
      {error && <p className="text-sm font-semibold text-red-600">{error}</p>}
      {sent && !error && <p className="text-sm font-semibold text-emerald-600">Sent from {from}.</p>}
      <button type="submit" disabled={pending} className="btn-primary">
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} {messageId ? "Send reply" : "Send"}
      </button>
    </form>
  );
}

export function DisconnectButton({ id, email }: { id: string; email: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      className="btn-ghost py-1 text-xs text-red-600"
      onClick={() => {
        if (!confirm(`Disconnect ${email} from the ERP inbox? Emails stay in Zoho.`)) return;
        start(async () => {
          const r = await disconnectAction(id);
          if (r.error) alert(r.error);
        });
      }}
    >
      <Unplug className="h-3.5 w-3.5" /> Disconnect
    </button>
  );
}
