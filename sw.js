const CACHE_NAME = "reposteria-v2";
const ASSETS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
];

// Instalar y cachear los assets propios. Cada uno se cachea por separado
// para que si alguno falla (ej. sin red en ese momento) no tumbe toda
// la instalación del Service Worker.
self.addEventListener("install", function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return Promise.all(
        ASSETS.map(function(url) {
          return cache.add(url).catch(function(err) {
            console.warn("No se pudo cachear:", url, err);
          });
        })
      );
    })
  );
  self.skipWaiting();
});

// Limpiar caches viejos
self.addEventListener("activate", function(event) {
  event.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(key) { return key !== CACHE_NAME; })
            .map(function(key) { return caches.delete(key); })
      );
    })
  );
  self.clients.claim();
});

// Cache-first: sirve desde cache, si no hay va a red
self.addEventListener("fetch", function(event) {
  if (event.request.method !== "GET") return;
  event.respondWith(
    caches.match(event.request).then(function(cached) {
      return cached || fetch(event.request).then(function(response) {
        // Cachear respuestas nuevas válidas (solo same-origin, evita errores CORS con CDNs)
        if (response && response.status === 200 && response.type === "basic") {
          var clone = response.clone();
          caches.open(CACHE_NAME).then(function(cache) {
            cache.put(event.request, clone);
          });
        }
        return response;
      }).catch(function() {
        // Si falla la red y no hay cache, mostrar la app igual (modo offline)
        if (event.request.destination === "document") {
          return caches.match("./index.html");
        }
      });
    })
  );
});
