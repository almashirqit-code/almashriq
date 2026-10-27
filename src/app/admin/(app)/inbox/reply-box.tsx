"use client";

import { useState } from "react";
import { Reply, X } from "lucide-react";
import { MailForm } from "./mail-form";

/** "Reply" opens the composer under the email; closed by default so the email gets the space. */
export function ReplyBox(props: { mailboxId: string; from: string; fromOptions: string[]; messageId: string; to: string; subject: string; doneHref: string; hint?: string | null }) {
  const [open, setOpen] = useState(false);
  if (!open)
    return (
      <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 px-5 py-4">
        <button type="button" onClick={() => setOpen(true)} className="btn-primary">
          <Reply className="h-4 w-4" /> Reply
        </button>
        <span className="text-xs text-slate-500">
          as <b>{props.from}</b>
        </span>
      </div>
    );
  return (
    <div className="border-t border-slate-100 bg-slate-50/60 p-4">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-semibold text-slate-700">Reply</span>
        <button type="button" onClick={() => setOpen(false)} className="btn-ghost p-1.5" aria-label="Close reply">
          <X className="h-4 w-4" />
        </button>
      </div>
      <MailForm mailboxId={props.mailboxId} from={props.from} fromOptions={props.fromOptions} messageId={props.messageId} to={props.to} subject={props.subject} doneHref={props.doneHref} />
      {props.hint && <p className="mt-2 text-xs text-amber-700">{props.hint}</p>}
    </div>
  );
}
