"use client";

import Script from "next/script";

/** Tawk.to property + widget id (from the embed code in the Tawk.to dashboard). */
const TAWK_SRC = "https://embed.tawk.to/6ada1d4ab2e6bc34608fa290/1k5i04rha";

/**
 * Tawk.to live chat for the public website (not the admin). Loaded after the page is idle so it
 * never slows the first paint. The bubble is lifted above the phone bottom bar and, on desktop,
 * above the WhatsApp button so they don't overlap.
 */
export function TawkChat() {
  return (
    <>
      <Script id="tawk-config" strategy="lazyOnload">
        {`window.Tawk_API = window.Tawk_API || {}; window.Tawk_LoadStart = new Date();
window.Tawk_API.customStyle = { visibility: {
  desktop: { position: "br", xOffset: 20, yOffset: 92 },
  mobile: { position: "br", xOffset: 12, yOffset: 92 }
} };`}
      </Script>
      <Script id="tawk-embed" src={TAWK_SRC} strategy="lazyOnload" crossOrigin="anonymous" />
    </>
  );
}
