const CACHE_NAME = "budget-simulator-v1";
const APP_FILES = [
  "./",
  "./index.html",
  "./style.css",
  "./index.js",
  "./manifest.webmanifest",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
];
const CACHED_APP_URLS = new Set(
  APP_FILES.map((file) => new URL(file, self.registration.scope).href),
);

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_FILES)),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) =>
        Promise.all(
          cacheNames
            .filter(
              (cacheName) =>
                cacheName.startsWith("budget-simulator-") &&
                cacheName !== CACHE_NAME,
            )
            .map((cacheName) => caches.delete(cacheName)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const requestUrl = new URL(request.url);

  if (request.method !== "GET" || requestUrl.origin !== self.location.origin) {
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() =>
        caches.match(new URL("./index.html", self.registration.scope)),
      ),
    );
    return;
  }

  if (!CACHED_APP_URLS.has(requestUrl.href)) {
    return;
  }

  event.respondWith(
    caches.match(request).then((cachedResponse) =>
      cachedResponse ? cachedResponse : fetch(request),
    ),
  );
});
