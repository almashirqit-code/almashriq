"use client";

import { useEffect } from "react";

/** Errors caused by a new deployment while the page was open — a reload fixes them. */
function isStaleDeployment(error: Error) {
  const msg = `${error?.name ?? ""} ${error?.message ?? ""}`;
  return /Failed to find Server Action|ChunkLoadError|Loading chunk .* failed|Failed to fetch dynamically imported module|older or newer deployment/i.test(msg);
}

export function ErrorView({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const stale = isStaleDeployment(error);

  useEffect(() => {
    console.error(error);
    if (!stale) return;
    // Reload once to pick up the new version; avoid a reload loop.
    try {
      const key = "erp-stale-reload";
      const last = Number(sessionStorage.getItem(key) || 0);
      if (Date.now() - last > 15000) {
        sessionStorage.setItem(key, String(Date.now()));
        window.location.reload();
      }
    } catch {
      window.location.reload();
    }
  }, [error, stale]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 p-8 text-center">
      <h2 className="text-lg font-semibold text-slate-900">
        {stale ? "A new version is available · 新しいバージョンがあります" : "Something went wrong · エラーが発生しました"}
      </h2>
      <p className="max-w-md text-sm text-slate-600">
        {stale
          ? "The app was updated while this page was open. Reloading…"
          : "Please try again. If it keeps happening, reload the page."}
      </p>
      <div className="flex gap-2">
        {!stale && (
          <button className="btn-secondary" onClick={() => reset()}>
            Try again
          </button>
        )}
        <button className="btn-primary" onClick={() => window.location.reload()}>
          Reload · 再読み込み
        </button>
      </div>
      {error?.digest && <p className="text-xs text-slate-400">Ref: {error.digest}</p>}
    </div>
  );
}
