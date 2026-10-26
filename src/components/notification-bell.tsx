"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell, BellOff, CheckCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { NotificationItem } from "@/lib/notifications";

const ago = (d: string) => {
  const s = Math.max(0, (Date.now() - new Date(d).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  return new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
};

const BUTTON = {
  erp: "relative inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50",
  site: "glass relative inline-flex h-11 w-11 items-center justify-center rounded-xl hover:brightness-105",
} as const;

/**
 * Bell with the latest notifications (migration 0034). New ones arrive live through Supabase Realtime
 * (the read policy means each user only receives their own); opening the list marks them read.
 */
export function NotificationBell({ userId, initial, unread: initialUnread, tone }: { userId: string; initial: NotificationItem[]; unread: number; tone: "erp" | "site" }) {
  const [items, setItems] = useState(initial);
  const [unread, setUnread] = useState(initialUnread);
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const supabase = createClient();
    const ch = supabase
      .channel(`notifications:${userId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` }, (p) => {
        const n = p.new as NotificationItem;
        setItems((xs) => [n, ...xs.filter((x) => x.id !== n.id)].slice(0, 20));
        setUnread((u) => u + 1);
      })
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [userId]);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !box.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);

  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (next && unread > 0) {
      setUnread(0);
      // Keep the "new" dots visible while the list is open; the database is updated right away.
      void createClient().rpc("mark_notifications_read", { p_ids: null });
    }
    if (!next) setItems((xs) => xs.map((x) => (x.read_at ? x : { ...x, read_at: new Date().toISOString() })));
  };

  return (
    <div ref={box} className="relative">
      <button type="button" onClick={toggle} className={BUTTON[tone]} aria-label={unread ? `Notifications, ${unread} new` : "Notifications"} aria-expanded={open} aria-haspopup="true">
        <Bell className="h-5 w-5" />
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-brand-600 px-1.5 text-center text-[11px] font-bold leading-5 text-white ring-2 ring-white">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 z-50 mt-2 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-2xl bg-white text-slate-900 shadow-2xl ring-1 ring-slate-200">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <span className="text-sm font-bold">Notifications</span>
            {items.some((x) => !x.read_at) && (
              <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                <CheckCheck className="h-3.5 w-3.5" /> Marked as read
              </span>
            )}
          </div>
          {items.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-4 py-10 text-center text-sm text-slate-500">
              <BellOff className="h-6 w-6" />
              Nothing yet. Updates will show up here.
            </div>
          ) : (
            <ul className="max-h-[70vh] divide-y divide-slate-100 overflow-y-auto">
              {items.map((n) => {
                const inner = (
                  <div className="flex gap-3 px-4 py-3">
                    <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${n.read_at ? "bg-transparent" : "bg-brand-600"}`} aria-hidden />
                    <div className="min-w-0">
                      <div className="text-sm font-semibold leading-5">{n.title}</div>
                      {n.body && <div className="line-clamp-2 text-xs leading-5 text-slate-600">{n.body}</div>}
                      <div className="mt-0.5 text-[11px] text-slate-400">{ago(n.created_at)}</div>
                    </div>
                  </div>
                );
                return (
                  <li key={n.id}>
                    {n.link?.startsWith("/") ? (
                      <Link href={n.link} onClick={() => setOpen(false)} className="block hover:bg-slate-50">
                        {inner}
                      </Link>
                    ) : (
                      inner
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
