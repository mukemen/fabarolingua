// /public/sw.js
const CACHE = "fabaro-lingua-v4"; // <— ganti versi tiap rilis

self.addEventListener("install", (e) => {
  self.skipWaiting(); // aktifkan SW baru tanpa nunggu refresh
  e.waitUntil(
    caches.open(CACHE).then((cache) =>
      cache.addAll([
        "/", "/manifest.json",
        "/icons/android-192.png", "/icons/icon-512.png",
        "/icons/icon-maskable-192.png", "/icons/icon-maskable-512.png"
      ])
    )
  );
});

self.addEventListener("activate", (e) => {
  // bersihkan cache lama + klaim semua tab
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// network-first utk API; cache-first utk aset statis
self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (url.pathname.startsWith("/api/")) {
    e.respondWith(
      fetch(e.request).catch(() => caches.match(e.request))
    );
    return;
  }
  e.respondWith(
    caches.match(e.request).then((res) => res || fetch(e.request))
  );
});
