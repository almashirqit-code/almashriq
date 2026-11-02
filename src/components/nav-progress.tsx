"use client";

import { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { useT } from "@/lib/i18n/client";

/**
 * ERP loading bar: starts on an in-app link click or a filter-form (GET) submit and ends when the
 * URL changes. Covers what loading.tsx can't — filters, paging and tabs re-render the same page,
 * so without it the old list just sits there. Also dims the content (html[data-nav-loading]).
 */
export function NavProgress() {
  const { t } = useT();
  const pathname = usePathname();
  const search = useSearchParams().toString();
  const [busy, setBusy] = useState(false);

  useEffect(() => setBusy(false), [pathname, search]);

  useEffect(() => {
    const here = () => location.pathname + location.search;
    const start = (url: URL) => {
      if (url.origin !== location.origin || url.pathname + url.search === here()) return;
      setBusy(true);
    };
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!a || (a.target && a.target !== "_self") || a.hasAttribute("download")) return;
      // Exports and files download instead of navigating.
      if (/\/(export|docs)(\/|\?|$)/.test(a.pathname)) return;
      start(new URL(a.href));
    };
    const onSubmit = (e: SubmitEvent) => {
      const f = e.target as HTMLFormElement;
      if (e.defaultPrevented || (f.getAttribute("method") ?? "get").toLowerCase() !== "get" || !f.getAttribute("action")) return;
      // Even the same URL (Search pressed again) re-renders, so no same-URL check here.
      if (new URL(f.action).origin === location.origin) setBusy(true);
    };
    document.addEventListener("click", onClick);
    document.addEventListener("submit", onSubmit);
    return () => {
      document.removeEventListener("click", onClick);
      document.removeEventListener("submit", onSubmit);
    };
  }, []);

  useEffect(() => {
    document.documentElement.toggleAttribute("data-nav-loading", busy);
    if (!busy) return;
    const stop = setTimeout(() => setBusy(false), 15000); // never stick if a navigation is abandoned
    return () => clearTimeout(stop);
  }, [busy]);

  if (!busy) return null;
  return (
    <div role="progressbar" aria-label={t("loading")} aria-busy="true" className="no-print fixed inset-x-0 top-0 z-[60] h-0.5 overflow-hidden bg-cerulean-100">
      <div className="nav-progress h-full bg-gradient-to-r from-cerulean-500 to-brand-600" />
    </div>
  );
}
