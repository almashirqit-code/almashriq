"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff } from "lucide-react";
import { savePushSubscription, deletePushSubscription, type PushTopic } from "@/app/(site)/push-actions";

const VAPID = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";
const TOPICS_KEY = "am-push-topics";
const ALL: PushTopic[] = ["stock", "offers", "account"];
const LABELS: Record<PushTopic, string> = {
  stock: "New cars in stock",
  offers: "New offers and deals",
  account: "My account: invoices, payments, shipping, waybill / surrender",
};

export const pushSupported = () =>
  typeof window !== "undefined" && !!VAPID && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;

export function savedTopics(): PushTopic[] {
  try {
    const t = JSON.parse(localStorage.getItem(TOPICS_KEY) ?? "null");
    return Array.isArray(t) ? t.filter((x): x is PushTopic => ALL.includes(x)) : ALL;
  } catch {
    return ALL;
  }
}

function keyBytes(b64u: string) {
  const bin = atob(b64u.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((b64u.length + 3) % 4));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

/** Sends this phone's subscription (and the signed-in login, via cookies) to the server. */
export async function syncPush(sub: PushSubscription, topics = savedTopics()) {
  return savePushSubscription(sub.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } }, topics);
}

/**
 * Notification switch: a single "Get alerts" button (compact, in the footer) or the full panel with
 * a checkbox per alert type (customer profile). Hidden where the browser can't do push.
 */
export function PushSettings({ compact = false }: { compact?: boolean }) {
  const [ready, setReady] = useState(false);
  const [sub, setSub] = useState<PushSubscription | null>(null);
  const [topics, setTopics] = useState<PushTopic[]>(ALL);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    if (!pushSupported()) return;
    setTopics(savedTopics());
    navigator.serviceWorker.ready.then((reg) => reg.pushManager.getSubscription()).then((s) => (setSub(s), setReady(true)));
  }, []);

  if (!ready) return null;

  async function turnOn(next = topics) {
    setBusy(true);
    setMsg("");
    try {
      if ((await Notification.requestPermission()) !== "granted") {
        setMsg("Notifications are blocked. Allow them for this site in your phone or browser settings.");
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const s = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(VAPID) }));
      const res = await syncPush(s, next);
      if (res.error) setMsg(res.error);
      else (setSub(s), setMsg(compact ? "Alerts are on." : "Saved."));
    } catch {
      setMsg("Couldn't turn on notifications on this device.");
    } finally {
      setBusy(false);
    }
  }

  async function turnOff() {
    setBusy(true);
    try {
      if (sub) {
        await deletePushSubscription(sub.endpoint);
        await sub.unsubscribe();
      }
      setSub(null);
      setMsg("Notifications are off.");
    } finally {
      setBusy(false);
    }
  }

  function toggle(t: PushTopic, on: boolean) {
    const next = on ? [...new Set([...topics, t])] : topics.filter((x) => x !== t);
    setTopics(next);
    try {
      localStorage.setItem(TOPICS_KEY, JSON.stringify(next));
    } catch {}
    if (sub) turnOn(next);
  }

  if (compact)
    return sub ? null : (
      <button type="button" onClick={() => turnOn()} disabled={busy} className="inline-flex min-h-8 items-center gap-1.5 underline hover:text-white disabled:opacity-60">
        <Bell className="h-3.5 w-3.5" aria-hidden /> {msg || "Get new stock & offer alerts"}
      </button>
    );

  return (
    <div>
      <fieldset className="space-y-3">
        <legend className="mb-3 text-sm text-white/70">Choose what this phone or browser is told about.</legend>
        {ALL.map((t) => (
          <label key={t} className="flex min-h-11 cursor-pointer items-center gap-3 text-sm font-semibold">
            <input type="checkbox" className="h-5 w-5 accent-[var(--accent)]" checked={topics.includes(t)} disabled={busy} onChange={(e) => toggle(t, e.target.checked)} />
            {LABELS[t]}
          </label>
        ))}
      </fieldset>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        {sub ? (
          <button type="button" onClick={turnOff} disabled={busy} className="inline-flex h-11 items-center gap-2 rounded-xl border border-white/20 px-4 text-sm font-bold hover:bg-white/10 disabled:opacity-60">
            <BellOff className="h-4 w-4" aria-hidden /> Turn off on this device
          </button>
        ) : (
          <button type="button" onClick={() => turnOn()} disabled={busy || !topics.length} className="inline-flex h-11 items-center gap-2 rounded-xl bg-[var(--accent)] px-4 text-sm font-bold text-white hover:bg-brand-700 disabled:opacity-60">
            <Bell className="h-4 w-4" aria-hidden /> Turn on notifications
          </button>
        )}
        <span role="status" className="text-sm text-white/70">
          {msg || (sub ? "Notifications are on for this device." : "")}
        </span>
      </div>
    </div>
  );
}
