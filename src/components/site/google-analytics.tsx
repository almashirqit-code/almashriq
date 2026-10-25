"use client";

import { useEffect } from "react";
import Script from "next/script";
import { usePathname } from "next/navigation";

const GA_ID = "G-D6TBZ8J8R7";
const isPrivate = (p: string) => p === "/account" || p.startsWith("/account/");

/**
 * Google Analytics 4 for the public website. GA4's enhanced measurement records page views on
 * client-side navigation by itself. Private customer pages (/account) are never measured: GA is
 * switched off there with its official opt-out flag, so invoice and account URLs aren't sent to Google.
 */
export function GoogleAnalytics() {
  const path = usePathname();

  // Keep the opt-out flag in step with client-side navigation.
  useEffect(() => {
    (window as unknown as Record<string, boolean>)[`ga-disable-${GA_ID}`] = isPrivate(path);
  }, [path]);

  return (
    <>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} strategy="afterInteractive" />
      <Script id="ga-init" strategy="afterInteractive">
        {`window['ga-disable-${GA_ID}'] = /^\\/account(\\/|$)/.test(location.pathname);
window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${GA_ID}');`}
      </Script>
    </>
  );
}
