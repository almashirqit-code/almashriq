"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Email body in a sandboxed frame: no scripts, no forms (links open in a new tab). The frame grows to
 * the email's height, so the reading pane scrolls once instead of a box inside a box.
 */
export function EmailFrame({ html }: { html: string }) {
  const ref = useRef<HTMLIFrameElement>(null);
  const [h, setH] = useState(240);
  const doc = `<!doctype html><html><head><meta charset="utf-8"><base target="_blank"><style>html,body{margin:0}body{font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.55;color:#0f172a;padding:4px 2px 12px;overflow-wrap:anywhere}img{max-width:100%;height:auto}table{max-width:100%}blockquote{margin:8px 0;padding-left:12px;border-left:3px solid #cbd5e1;color:#475569}a{color:#0369a1}</style></head><body>${html}</body></html>`;

  useEffect(() => {
    const frame = ref.current;
    if (!frame) return;
    let ro: ResizeObserver | null = null;
    const fit = () => {
      const body = frame.contentDocument?.body;
      if (body) setH(Math.max(120, Math.ceil(body.scrollHeight) + 8));
    };
    const onLoad = () => {
      fit();
      const body = frame.contentDocument?.body;
      if (body && typeof ResizeObserver !== "undefined") {
        ro = new ResizeObserver(fit);
        ro.observe(body);
      }
      // Late images change the height.
      frame.contentDocument?.querySelectorAll("img").forEach((img) => img.addEventListener("load", fit));
    };
    frame.addEventListener("load", onLoad);
    return () => {
      frame.removeEventListener("load", onLoad);
      ro?.disconnect();
    };
  }, [html]);

  return (
    <iframe
      ref={ref}
      title="Email content"
      // allow-same-origin only so the page can measure the height; scripts stay blocked.
      sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox"
      srcDoc={doc}
      style={{ height: h }}
      className="block w-full border-0 bg-white"
    />
  );
}
