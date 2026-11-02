// Al Mashriq app service worker. Deliberately caches nothing: account pages hold invoices and
// payments, so a shared phone must never show a stale copy. It only answers page loads with a
// short "you're offline" screen when there is no connection. Push notifications are added later.
const OFFLINE_HTML = `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>Offline · Al Mashriq</title>
<style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#0a0a0c;color:#f4f4f5;
font:16px/1.5 system-ui,sans-serif;text-align:center;padding:16px}button{margin-top:16px;padding:12px 20px;
border:0;border-radius:8px;background:#dc2626;color:#fff;font:inherit;cursor:pointer}</style></head>
<body><main><h1>You're offline</h1><p>Check your internet connection and try again.</p>
<button onclick="location.reload()">Try again</button></main></body></html>`;

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("fetch", (event) => {
  if (event.request.mode !== "navigate") return;
  event.respondWith(
    fetch(event.request).catch(
      () => new Response(OFFLINE_HTML, { status: 503, headers: { "Content-Type": "text/html; charset=utf-8" } }),
    ),
  );
});
