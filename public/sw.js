// Service Worker — CatequesePRO
const CACHE_NAME = "catechist-buddy-v4";
const STATIC_ASSETS = [
  "/manifest.json",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET, cross-origin, API, Supabase, and JS/TS module requests
  // This prevents SW from caching dev-server bundles and breaking HMR
  if (
    request.method !== "GET" ||
    url.origin !== self.location.origin ||
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/node_modules/") ||
    url.pathname.startsWith("/src/") ||
    url.hostname.includes("supabase") ||
    url.pathname.endsWith(".js") ||
    url.pathname.endsWith(".mjs") ||
    url.pathname.endsWith(".ts") ||
    url.pathname.endsWith(".tsx") ||
    url.search.includes("v=") ||
    url.search.includes("t=")
  ) {
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        if (response.ok && !url.pathname.includes("sockjs")) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      }).catch(async () => {
        // Offline fallback: must return a valid Response, never undefined
        if (request.mode === "navigate") {
          const cached = await caches.match("/offline.html");
          if (cached) return cached;
          return new Response("<h1>Sem conexão</h1>", { status: 503, headers: { "Content-Type": "text/html" } });
        }
        return new Response("Network error", { status: 503 });
      });
    })
  );
});
