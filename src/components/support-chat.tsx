"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, SendHorizontal } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export type ChatMessage = { id: string; sender_kind: "customer" | "staff"; sender_name: string; body: string; created_at: string };
export type SendResult = { error?: string; thread_id?: string; message?: ChatMessage };

const TONES = {
  // Website (light glass theme) and ERP styles.
  site: { box: "glass rounded-2xl", mine: "bg-[var(--accent)] text-white", theirs: "bg-black/5", meta: "opacity-60", input: "rounded-xl px-3.5 py-3 text-sm" },
  erp: { box: "card", mine: "bg-cerulean-600 text-white", theirs: "bg-slate-100 text-slate-800", meta: "text-slate-400", input: "input min-h-[3rem] resize-none" },
} as const;

const time = (d: string) => new Date(d).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

/**
 * Live support conversation. New messages arrive through Supabase Realtime (read policies apply, so
 * each side only receives its own thread); sending goes through a server action that calls the RPC.
 */
export function SupportChat({
  threadId: initialThread,
  initial,
  me,
  send,
  markRead,
  tone = "site",
  closed = false,
  emptyText = "No messages yet. Write below to start the conversation.",
}: {
  threadId: string | null;
  initial: ChatMessage[];
  me: "customer" | "staff";
  send: (body: string) => Promise<SendResult>;
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

  async function submit() {
    const text = body.trim();
    if (!text || sending) return;
    setSending(true);
    setError("");
    const r = await send(text);
    setSending(false);
    if (r.error) return setError(r.error);
    setBody("");
    if (r.thread_id && r.thread_id !== threadId) setThreadId(r.thread_id);
    if (r.message) add(r.message);
  }

  return (
    <div className={`${s.box} flex h-[min(70vh,40rem)] flex-col overflow-hidden`}>
      <div className="flex-1 space-y-3 overflow-y-auto p-4" aria-live="polite">
        {messages.length === 0 ? (
          <p className={`py-10 text-center text-sm ${s.meta}`}>{emptyText}</p>
        ) : (
          messages.map((m) => {
            const mine = m.sender_kind === me;
            return (
              <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[85%] rounded-2xl px-3.5 py-2 ${mine ? `${s.mine} rounded-br-md` : `${s.theirs} rounded-bl-md`}`}>
                  <p className="whitespace-pre-wrap break-words text-sm">{m.body}</p>
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
