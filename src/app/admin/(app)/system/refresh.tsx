"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw, Trash2 } from "lucide-react";
import { clearSiteCache } from "./actions";

/** Clears the website's page cache (e.g. after an upgrade); pages rebuild on their next visit. */
export function ClearCacheButton() {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const run = () => {
    if (!confirm("Clear the website cache? Every page will be rebuilt on its next visit, so the first visits will be a little slower.")) return;
    start(async () => {
      try {
        await clearSiteCache();
        setMsg({ ok: true, text: "Cache cleared. The website now shows the latest data." });
      } catch {
        setMsg({ ok: false, text: "Couldn't clear the cache. Try again." });
      }
    });
  };
  return (
    <div>
      <button type="button" className="btn-secondary" disabled={pending} onClick={run}>
        <Trash2 className={`h-4 w-4 ${pending ? "animate-pulse" : ""}`} />
        {pending ? "Clearing…" : "Clear website cache"}
      </button>
      {msg && (
        <p className={`mt-2 text-sm font-semibold ${msg.ok ? "text-emerald-700" : "text-red-700"}`} role="status">
          {msg.text}
        </p>
      )}
    </div>
  );
}

/** "Check now" button + automatic re-check every minute while the page is open. */
export function RefreshControls({ everySec = 60 }: { everySec?: number }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState === "visible") start(() => router.refresh());
    }, everySec * 1000);
    return () => clearInterval(id);
  }, [router, everySec]);
  return (
    <button type="button" className="btn-secondary" disabled={pending} onClick={() => start(() => router.refresh())}>
      <RefreshCw className={`h-4 w-4 ${pending ? "animate-spin" : ""}`} />
      {pending ? "Checking…" : "Check now"}
    </button>
  );
}
