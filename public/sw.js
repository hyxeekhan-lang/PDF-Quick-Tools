const CACHE_NAME = "pdf-tools-v5";
const CORE_ASSETS = [
  "/",
  "/tools",
  "/compress-pdf",
  "/merge-pdf",
  "/split-pdf",
  "/pdf-to-jpg",
  "/favicon.svg",
  "/favicon.ico",
  "/apple-touch-icon.png",
  "/manifest.json",
  "/robots.txt",
];
const MAX_CACHED_PAGES = 30;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      await cache.add("/offline.html");
      await Promise.all(
        CORE_ASSETS.map(async (asset) => {
          try {
            await cache.add(asset);
          } catch {
            // A missing optional route or icon should not prevent the app shell
            // and offline page from being installed.
          }
        }),
      );
    }),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames
          .filter((name) => name.startsWith("pdf-tools-") && name !== CACHE_NAME)
          .map((name) => caches.delete(name)),
      ),
    ),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (
    request.method !== "GET" ||
    url.origin !== self.location.origin ||
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/__")
  ) {
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok && response.headers.get("content-type")?.includes("text/html")) {
            const copy = response.clone();
            event.waitUntil(
              caches.open(CACHE_NAME).then(async (cache) => {
                await cache.put(request, copy);
                await trimCachedPages(cache);
              }),
            );
          }
          return response;
        })
        .catch(async () => {
          const cache = await caches.open(CACHE_NAME);
          return (
            (await cache.match(request)) ??
            (await cache.match(`${url.pathname}${url.search}`)) ??
            (await cache.match("/offline.html")) ??
            new Response("You are offline. Reconnect and try again.", {
              status: 503,
              headers: { "Content-Type": "text/plain; charset=utf-8" },
            })
          );
        }),
    );
    return;
  }

  event.respondWith(
    caches.match(request).then(async (cached) => {
      if (cached) return cached;

      const response = await fetch(request);
      const isStaticAsset =
        request.destination !== "" &&
        ["script", "style", "worker", "font", "image"].includes(request.destination);
      if (response.ok && isStaticAsset) {
        const copy = response.clone();
        event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.put(request, copy)));
      }
      return response;
    }),
  );
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
});

async function trimCachedPages(cache) {
  const requests = (await cache.keys()).filter((request) => {
    const url = new URL(request.url);
    return request.mode === "navigate" && url.origin === self.location.origin;
  });

  const excess = requests.length - MAX_CACHED_PAGES;
  if (excess > 0) {
    await Promise.all(requests.slice(0, excess).map((request) => cache.delete(request)));
  }
}
