// ====== BUMP VERSI SETIAP RILIS ======
const VERSION = "v10";
const PRECACHE = `fabaro-precache-${VERSION}`;
const RUNTIME  = `fabaro-runtime-${VERSION}`;

// HANYA precache file statis yang aman (JANGAN "/")
const PRECACHE_URLS = [
  "/manifest.json",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
];

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(caches.open(PRECACHE).then((c) => c.addAll(PRECACHE_URLS)));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => ![PRECACHE, RUNTIME].includes(k))
          .map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// Strategi:
// - HTML / navigations => NETWORK-FIRST (supaya layout selalu terbaru)
// - Asset Next.js & icons => CACHE-FIRST (+isi runtime cache)
// - Lainnya => langsung ke network
self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);
  const accept = req.headers.get("accept") || "";

  // 1) HTML / navigations -> network-first (JANGAN dicache)
  if (req.mode === "navigate" || accept.includes("text/html")) {
    event.respondWith(
      fetch(req).catch(() => caches.match("/offline.html")) // opsional kalau punya
    );
    return;
  }

  // 2) Asset Next.js & icons -> cache-first
  if (url.pathname.startsWith("/_next/") || url.pathname.startsWith("/icons/")) {
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

  // 3) Default: pass-through
  // (biarkan ke network tanpa intervensi)
});
