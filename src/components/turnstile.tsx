"use client";

import Script from "next/script";
import { useEffect, useRef } from "react";

type TurnstileApi = {
  render(el: HTMLElement, opts: Record<string, unknown>): string;
  reset(id?: string): void;
  remove(id: string): void;
};
declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

/**
 * Cloudflare Turnstile spam check inside a form. It adds a hidden "cf-turnstile-response" field that
 * the server action checks with passedTurnstile(). Tokens are single-use, so pass the action state as
 * `resetKey` to re-arm the check after a failed submit. Renders nothing when no site key is set.
 */
export function Turnstile({ resetKey }: { resetKey?: unknown }) {
  const box = useRef<HTMLDivElement>(null);
  const widget = useRef<string | null>(null);

  useEffect(() => {
    if (!SITE_KEY) return;
    const mount = () => {
      if (widget.current || !box.current || !window.turnstile) return;
      widget.current = window.turnstile.render(box.current, { sitekey: SITE_KEY, theme: "light", size: "flexible" });
    };
    mount();
    // The script loads after the page; wait for it.
    const timer = setInterval(() => {
      mount();
      if (widget.current) clearInterval(timer);
    }, 200);
    return () => {
      clearInterval(timer);
      if (widget.current && window.turnstile) window.turnstile.remove(widget.current);
      widget.current = null;
    };
  }, []);

  useEffect(() => {
    if (resetKey !== undefined && widget.current && window.turnstile) window.turnstile.reset(widget.current);
  }, [resetKey]);

  if (!SITE_KEY) return null;
  return (
    <>
      <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit" strategy="afterInteractive" />
      <div ref={box} className="min-h-[65px]" />
    </>
  );
}
