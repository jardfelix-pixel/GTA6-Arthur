const CACHE_NAME = "vice-coast-shell-v6";
const APP_SHELL = [
  "./",
  "./index.html",
  "./styles.css",
  "./src/main.js",
  "./src/scene.js",
  "./src/city.js",
  "./src/player.js",
  "./src/vehicle.js",
  "./src/ui.js",
  "./src/utils.js",
  "./manifest.webmanifest",
  "./img/app-icon.svg",
  "./img/app-icon-192.png",
  "./img/app-icon-512.png",
  "./img/Arthur.png",
  "./img/cj.png",
  "./img/jason.png",
  "./img/lucia.png",
  "./img/background2.jpg"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    Promise.all([
      caches.open(CACHE_NAME).then((cache) => cache.addAll(
        APP_SHELL.map((caminho) => new Request(caminho, { cache: "reload" }))
      )),
      self.skipWaiting()
    ])
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    Promise.all([
      caches.keys().then((cacheNames) => Promise.all(
        cacheNames
          .filter((cacheName) => (
            (cacheName.startsWith("gta-arthur-shell-") || cacheName.startsWith("vice-coast-shell-"))
            && cacheName !== CACHE_NAME
          ))
          .map((cacheName) => caches.delete(cacheName))
      )),
      self.clients.claim()
    ])
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const requestUrl = new URL(request.url);
  if (request.method !== "GET" || requestUrl.origin !== self.location.origin) return;

  event.respondWith(
    (async () => {
      let response;
      try {
        response = await fetch(request, { cache: "no-cache" });
      } catch (erro) {
        const cachedResponse = await caches.match(request);
        if (cachedResponse) return cachedResponse;
        if (request.mode === "navigate") {
          const paginaInicial = await caches.match("./index.html");
          if (paginaInicial) return paginaInicial;
        }
        throw erro;
      }

      if (response.ok) {
        try {
          const cache = await caches.open(CACHE_NAME);
          await cache.put(request, response.clone());
        } catch (erro) {
          console.error("Não foi possível atualizar o cache offline.", erro);
        }
      }
      return response;
    })()
  );
});
