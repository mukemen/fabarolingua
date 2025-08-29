// public/sw.js
// ===== GANTI ANGKA VERSI SETIAP DEPLOY =====
const VERSION = "v16";
const PRECACHE = `fabaro-precache-${VERSION}`;
const RUNTIME  = `fabaro-runtime-${VERSION}`;

// HANYA cache file statis aman (JANGAN "/" / HTML)
const PRECACHE_URLS = [
  "/manifest.json",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/icon-maskable-192.png",
  "/icons/icon-maskable-512.png",
  "/apple-touch-icon.png"
];

self.addEventListener("install", (event) => {
  // install versi baru & siap gantikan yang lama
  self.skipWaiting();
  event.waitUntil(caches.open(PRECACHE).then((c) => c.addAll(PRECACHE_URLS)));
});

self.addEventListener("activate", (event) => {
  // bersihkan cache lama lalu ambil alih semua tab
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => ![PRECACHE, RUNTIME].includes(k)).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Terima perintah dari halaman untuk skip waiting
self.addEventListener("message", (e) => {
  if (e.data === "SKIP_WAITING") self.skipWaiting();
});

// Strategi fetch:
// - Navigasi/HTML => NETWORK-FIRST (biar UI selalu terbaru)
// - Asset Next.js & icons => CACHE-FIRST (dengan runtime cache)
// - Lainnya => pass-through
self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);
  const accept = req.headers.get("accept") || "";

  // 1) HTML / navigations -> network-first (JANGAN dicache)
  if (req.mode === "navigate" || accept.includes("text/html")) {
    event.respondWith(fetch(req));
    return;
  }

  // 2) Asset Next.js & icons -> cache-first
  if (
    url.pathname.startsWith("/_next/") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname === "/apple-touch-icon.png"
  ) {
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

  // 3) Default: biarkan ke network
});
