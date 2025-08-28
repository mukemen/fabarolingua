self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open("fabaro-lingua-v1").then((cache) =>
      cache.addAll([
        "/",
        "/manifest.json",
        "/icons/icon-192.png",
        "/icons/icon-512.png"
      ])
    )
  );
});

self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((resp) => resp || fetch(event.request))
  );
});
