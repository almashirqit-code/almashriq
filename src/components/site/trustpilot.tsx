"use client";

import { useEffect, useRef } from "react";
import Script from "next/script";

// Trustpilot business unit for almashriqtrading.site.
const BUSINESS_UNIT_ID = "6adbb9fe612465cdc9f14a28";
const REVIEW_URL = "https://www.trustpilot.com/review/almashriqtrading.site";
// "Review Collector" TrustBox — invites visitors to leave a review (right while the
// business has few/no reviews yet). Swap the template id for a star-rating box later.
const TEMPLATE_ID = "56278e9abfbbba0bdcd568bc";

declare global {
  interface Window {
    Trustpilot?: { loadFromElement: (el: HTMLElement | null, forceReload?: boolean) => void };
  }
}

/** Trustpilot TrustBox. The bootstrap script finds this div and renders the widget in an iframe. */
export function TrustpilotWidget() {
  const ref = useRef<HTMLDivElement>(null);

  // On client-side navigation the script is already loaded, so re-initialise this instance.
  useEffect(() => {
    if (window.Trustpilot) window.Trustpilot.loadFromElement(ref.current, true);
  }, []);

  return (
    <>
      <Script src="https://widget.trustpilot.com/bootstrap/v5/tp.widget.bootstrap.min.js" strategy="afterInteractive" />
      <div
        ref={ref}
        className="trustpilot-widget"
        data-locale="en-US"
        data-template-id={TEMPLATE_ID}
        data-businessunit-id={BUSINESS_UNIT_ID}
        data-style-height="52px"
        data-style-width="100%"
      >
        <a href={REVIEW_URL} target="_blank" rel="noopener noreferrer">
          Trustpilot
        </a>
      </div>
    </>
  );
}
