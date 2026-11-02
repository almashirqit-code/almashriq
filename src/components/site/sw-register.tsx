"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { pushSupported, syncPush } from "./push-settings";

const SIGNED_KEY = "am-push-signed-in";

/**
 * Registers the app service worker so phones can install the site as an app. When the sign-in
 * changes (the Supabase session cookie appears or goes), it re-saves this phone's push
 * subscription, so account alerts follow whoever is signed in and stop after sign-out.
 */
export function SwRegister() {
  const pathname = usePathname();

  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);

  useEffect(() => {
    if (!pushSupported() || Notification.permission !== "granted") return;
    const signedIn = /(?:^|;\s*)sb-[^=]*-auth-token/.test(document.cookie) ? "1" : "0";
    try {
      if (localStorage.getItem(SIGNED_KEY) === signedIn) return;
      localStorage.setItem(SIGNED_KEY, signedIn);
    } catch {}
    navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => sub && syncPush(sub))
      .catch(() => {});
  }, [pathname]);

  return null;
}
