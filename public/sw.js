// Al Mashriq app service worker. Deliberately caches nothing: account pages hold invoices and
// payments, so a shared phone must never show a stale copy. It only answers page loads with a
// short "you're offline" screen when there is no connection, and shows push notifications.
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

// Push: { title, body, url, tag } from src/lib/notify.ts.
self.addEventListener("push", (event) => {
  let msg = {};
  try {
    msg = event.data ? event.data.json() : {};
  } catch {}
  event.waitUntil(
    self.registration.showNotification(msg.title || "Al Mashriq Trading", {
      body: msg.body || "",
      icon: "/app-icons/icon-192.png",
      badge: "/app-icons/icon-192.png",
      tag: msg.tag || undefined,
      data: { url: typeof msg.url === "string" && msg.url.startsWith("/") && !msg.url.startsWith("//") ? msg.url : "/" },
    }),
  );
});

// Tapping a notification opens its page in the app (an open window is reused).
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = new URL(event.notification.data?.url || "/", self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((wins) => {
      const win = wins.find((w) => new URL(w.url).origin === self.location.origin);
      return win ? win.navigate(url).then((w) => (w || win).focus()) : self.clients.openWindow(url);
    }),
  );
});
