// Forge service worker: app-shell offline beschikbaar.
// - Navigatie: netwerk eerst, val terug op cache (zodat de app offline opent).
// - Statische assets (_next/static, afbeeldingen, iconen): cache eerst.
// Gebruikersdata staat in IndexedDB en gaat nooit via deze cache.
const VERSION = "forge-v1";
const SHELL = ["/", "/training", "/schemas", "/oefeningen", "/progressie", "/historie", "/instellingen", "/manifest.webmanifest"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL).catch(() => {})).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(VERSION).then((c) => c.put(url.pathname, copy));
          return res;
        })
        .catch(async () => (await caches.match(url.pathname)) || (await caches.match("/")) || Response.error()),
    );
    return;
  }

  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/exercises/") || url.pathname.startsWith("/icons/") || /\.(woff2?|png|webp|svg|css|js)$/.test(url.pathname)) {
    e.respondWith(
      caches.match(req).then(
        (hit) =>
          hit ||
          fetch(req).then((res) => {
            if (res.ok) {
              const copy = res.clone();
              caches.open(VERSION).then((c) => c.put(req, copy));
            }
            return res;
          }),
      ),
    );
  }
});

self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  e.waitUntil(
    self.clients.matchAll({ type: "window" }).then((list) => {
      const c = list.find((x) => "focus" in x);
      return c ? c.focus() : self.clients.openWindow("/training");
    }),
  );
});
