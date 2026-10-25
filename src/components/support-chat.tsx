"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { FileText, Loader2, Paperclip, SendHorizontal } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { resizeImage } from "@/lib/images";

export type ChatMessage = {
  id: string;
  sender_kind: "customer" | "staff";
  sender_name: string;
  body: string;
  created_at: string;
  attachment_name?: string | null;
  attachment_type?: string | null;
  attachment_size?: number | null;
};
export type SendResult = { error?: string; thread_id?: string; message?: ChatMessage };

const TONES = {
  // Website (light glass theme) and ERP styles.
  site: { box: "glass rounded-2xl", mine: "bg-[var(--accent)] text-white", theirs: "bg-black/5", meta: "opacity-60", input: "rounded-xl px-3.5 py-3 text-sm", icon: "ring-1 ring-current/15 hover:bg-black/5" },
  erp: { box: "card", mine: "bg-cerulean-600 text-white", theirs: "bg-slate-100 text-slate-800", meta: "text-slate-400", input: "input min-h-[3rem] resize-none", icon: "ring-1 ring-slate-200 text-slate-600 hover:bg-slate-50" },
} as const;

const OK_IMAGES = ["image/jpeg", "image/png", "image/webp"];
const MAX_BYTES = 3_900_000; // server-action body limit

const time = (d: string) => new Date(d).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
const size = (n?: number | null) => (!n ? "" : n > 1_000_000 ? `${(n / 1_000_000).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1000))} KB`);

/** Photos are downscaled to 1600 px JPEG; other image formats (e.g. HEIC) are converted when the browser can read them. */
async function prepareFile(file: File): Promise<File | string> {
  if (file.type === "application/pdf") return file.size > MAX_BYTES ? "That PDF is too large. The limit is about 3.9 MB." : file;
  if (!file.type.startsWith("image/")) return "Only photos and PDFs can be sent.";
  let out: Blob = await resizeImage(file, 1600, 0.82);
  if (!OK_IMAGES.includes(out.type)) {
    try {
      const bmp = await createImageBitmap(file);
      const c = document.createElement("canvas");
      c.width = bmp.width;
      c.height = bmp.height;
      c.getContext("2d")?.drawImage(bmp, 0, 0);
      bmp.close();
      out = (await new Promise<Blob | null>((r) => c.toBlob(r, "image/jpeg", 0.82))) ?? out;
    } catch {
      /* unreadable format */
    }
  }
  if (!OK_IMAGES.includes(out.type)) return "This photo format isn't supported. Please send a JPG or PNG.";
  if (out.size > MAX_BYTES) return "That photo is too large.";
  const name = (file.name || "photo").replace(/\.[^.]+$/, "") + (out.type === "image/jpeg" ? ".jpg" : out.type === "image/png" ? ".png" : ".webp");
  return new File([out], name, { type: out.type });
}

/**
 * Live support conversation. New messages arrive through Supabase Realtime (read policies apply, so
 * each side only receives its own thread); sending goes through server actions that call the RPCs.
 */
export function SupportChat({
  threadId: initialThread,
  initial,
  me,
  send,
  sendFile,
  markRead,
  tone = "site",
  closed = false,
  emptyText = "No messages yet. Write below to start the conversation.",
}: {
  threadId: string | null;
  initial: ChatMessage[];
  me: "customer" | "staff";
  send: (body: string) => Promise<SendResult>;
  sendFile?: (formData: FormData) => Promise<SendResult>;
  markRead?: () => Promise<void>;
  tone?: keyof typeof TONES;
  closed?: boolean;
  emptyText?: string;
}) {
  const s = TONES[tone];
  const [threadId, setThreadId] = useState(initialThread);
  const [messages, setMessages] = useState<ChatMessage[]>(initial);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const end = useRef<HTMLDivElement>(null);
  const picker = useRef<HTMLInputElement>(null);

  const add = useCallback((m: ChatMessage) => setMessages((list) => (list.some((x) => x.id === m.id) ? list : [...list, m])), []);

  // Live updates for this thread.
  useEffect(() => {
    if (!threadId) return;
    const supabase = createClient();
    const channel = supabase
      .channel(`support:${threadId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "support_messages", filter: `thread_id=eq.${threadId}` }, (p) => {
        const m = p.new as ChatMessage;
        add(m);
        if (m.sender_kind !== me) markRead?.();
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [threadId, me, add, markRead]);

  // Opening the conversation marks the other side's messages as read.
  useEffect(() => {
    if (threadId) markRead?.();
  }, [threadId, markRead]);

  useEffect(() => {
    end.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  function done(r: SendResult) {
    if (r.error) return setError(r.error);
    setBody("");
    if (r.thread_id && r.thread_id !== threadId) setThreadId(r.thread_id);
    if (r.message) add(r.message);
  }

  async function submit() {
    const text = body.trim();
    if (!text || sending) return;
    setSending(true);
    setError("");
    const r = await send(text);
    setSending(false);
    done(r);
  }

  async function attach(file: File | undefined) {
    if (!file || !sendFile || sending) return;
    setSending(true);
    setError("");
    const prepared = await prepareFile(file);
    if (typeof prepared === "string") {
      setSending(false);
      return setError(prepared);
    }
    const fd = new FormData();
    fd.set("file", prepared);
    fd.set("body", body.trim()); // what's typed goes along as the caption
    const r = await sendFile(fd);
    setSending(false);
    done(r);
  }

  return (
    <div className={`${s.box} flex h-[min(70vh,40rem)] flex-col overflow-hidden`}>
      <div className="flex-1 space-y-3 overflow-y-auto p-4" aria-live="polite">
        {messages.length === 0 ? (
          <p className={`py-10 text-center text-sm ${s.meta}`}>{emptyText}</p>
        ) : (
          messages.map((m) => {
            const mine = m.sender_kind === me;
            const href = `/api/support-file/${m.id}`;
            return (
              <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[85%] rounded-2xl px-3.5 py-2 ${mine ? `${s.mine} rounded-br-md` : `${s.theirs} rounded-bl-md`}`}>
                  {m.attachment_type?.startsWith("image/") && (
                    <a href={href} target="_blank" rel="noopener" className="mb-1 block">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={href} alt={m.attachment_name ?? "Photo"} loading="lazy" className="max-h-64 w-auto rounded-lg object-contain" />
                    </a>
                  )}
                  {m.attachment_type === "application/pdf" && (
                    <a href={href} className="mb-1 flex items-center gap-2 rounded-lg bg-black/10 px-2.5 py-2 text-sm font-semibold hover:bg-black/15">
                      <FileText className="h-5 w-5 shrink-0" />
                      <span className="min-w-0 truncate">{m.attachment_name}</span>
                      <span className="shrink-0 text-xs opacity-75">{size(m.attachment_size)}</span>
                    </a>
                  )}
                  {m.body && <p className="whitespace-pre-wrap break-words text-sm">{m.body}</p>}
                  <p className={`mt-1 text-[11px] ${mine ? "opacity-75" : s.meta}`}>
                    {mine ? "You" : m.sender_name} · {time(m.created_at)}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={end} />
      </div>
      {closed ? (
        <p className={`border-t border-current/10 p-4 text-center text-sm ${s.meta}`}>This conversation is closed.</p>
      ) : (
        <form
          className="flex items-end gap-2 border-t border-current/10 p-3"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          {sendFile && (
            <>
              <input
                ref={picker}
                type="file"
                accept="image/*,application/pdf"
                className="hidden"
                onChange={(e) => {
                  attach(e.target.files?.[0]);
                  e.target.value = "";
                }}
              />
              <button
                type="button"
                onClick={() => picker.current?.click()}
                disabled={sending}
                aria-label="Attach a photo or PDF"
                title="Attach a photo or PDF (e.g. your TT slip)"
                className={`inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl disabled:opacity-50 ${s.icon}`}
              >
                <Paperclip className="h-5 w-5" />
              </button>
            </>
          )}
          <label htmlFor="chat-input" className="sr-only">
            Message
          </label>
          <textarea
            id="chat-input"
            rows={1}
            maxLength={4000}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submit();
              }
            }}
            placeholder="Write a message…"
            className={`${s.input} max-h-40 min-w-0 flex-1`}
          />
          <button
            type="submit"
            disabled={sending || !body.trim()}
            aria-label="Send"
            className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[var(--accent)] text-white hover:bg-brand-700 disabled:opacity-50"
          >
            {sending ? <Loader2 className="h-5 w-5 animate-spin" /> : <SendHorizontal className="h-5 w-5" />}
          </button>
        </form>
      )}
      {error && <p className="px-4 pb-3 text-sm font-semibold text-brand-700">{error}</p>}
    </div>
  );
}
