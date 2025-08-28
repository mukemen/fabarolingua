// ===== BUMP VERSI SETIAP RILIS =====
const VERSION = "v11";
const PRECACHE = `fabaro-precache-${VERSION}`;
const RUNTIME  = `fabaro-runtime-${VERSION}`;

const PRECACHE_URLS = [
  "/manifest.json",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/apple-touch-icon.png"
];

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(caches.open(PRECACHE).then((c) => c.addAll(PRECACHE_URLS)));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => ![PRECACHE, RUNTIME].includes(k)).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// HTML = network-first (biar selalu terbaru)
self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);
  const accept = req.headers.get("accept") || "";

  // 1) Navigasi/HTML -> network-first
  if (req.mode === "navigate" || accept.includes("text/html")) {
    event.respondWith(fetch(req));
    return;
  }

  // 2) Asset Next.js & icons -> cache-first
  if (url.pathname.startsWith("/_next/") || url.pathname.startsWith("/icons/") || url.pathname === "/apple-touch-icon.png") {
    event.respondWith(
      caches.match(req).then((cached) => {
        if (cached) return cached;
        return fetch(req).then((res) => {
          const copy = res.clone();
          caches.open(RUNTIME).then((c) => c.put(req, copy));
          return res;
        });
      })
    );
    return;
  }

  // 3) Default: network
});
