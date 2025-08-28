// GANTI versi tiap kali rilis baru
const CACHE = "fabaro-lingua-v5";

self.addEventListener("install", (event) => {
  self.skipWaiting(); // langsung aktifkan SW baru
  event.waitUntil(
    caches.open(CACHE).then((cache) =>
      cache.addAll([
        "/",
        "/manifest.json",
        "/icons/icon-192.png",
        "/icons/icon-512.png"
      ])
    )
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim(); // ambil alih semua tab
});

self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request, { ignoreSearch: true }).then((resp) => resp || fetch(event.request))
  );
});
