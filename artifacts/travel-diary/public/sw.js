// Cache names — version is injected at build time by the Vite stampSW plugin.
// In dev the literal placeholder string is used (harmless).
const CACHE_VER = "__SW_BUILD_TS__";
const SHELL_CACHE = `wantong-shell-${CACHE_VER}`;
const API_CACHE   = `wantong-api-${CACHE_VER}`;
const IMAGE_CACHE = `wantong-img-${CACHE_VER}`;

// Pages/assets pre-cached on install
const PRECACHE_URLS = ["/", "/index.html"];

// API GET routes worth caching for offline reading
const API_CACHE_PATTERNS = [
  /\/api\/entries(\?|$|\/.+)/,
  /\/api\/me\//,
  /\/api\/profile\//,
  /\/api\/collections/,
];

// Image extensions we want to cache for offline diary viewing
const IMAGE_EXTENSIONS = /\.(jpe?g|png|webp|gif|avif|svg)(\?|$)/i;

// Max age (ms) before a cached API response is considered stale
const API_STALE_MS = 5 * 60 * 1000; // 5 min

// Max number of images to keep in the image cache
const IMAGE_CACHE_MAX = 500;

// ── Install — pre-cache shell assets, then wait in "installed" state ──────────
// We do NOT call skipWaiting() here so the new SW stays in "waiting" state
// until the user explicitly clicks "立即刷新" (which sends SKIP_WAITING below).
// This prevents version skew where the old page runs against new SW caches.
self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(SHELL_CACHE)
      .then((c) => c.addAll(PRECACHE_URLS))
  );
});

// ── Message — let the page trigger skipWaiting when the user is ready ─────────
self.addEventListener("message", (e) => {
  if (e.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

// ── Activate — delete old caches, claim all clients ───────────────────────────
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== SHELL_CACHE && k !== API_CACHE && k !== IMAGE_CACHE)
          .map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// ── Fetch ──────────────────────────────────────────────────────────────────────
self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;

  const url = new URL(e.request.url);

  // ① API calls that are worth caching — stale-while-revalidate
  if (API_CACHE_PATTERNS.some((re) => re.test(url.pathname + url.search))) {
    e.respondWith(staleWhileRevalidate(e.request));
    return;
  }

  // ② Other API calls — network-first, offline JSON fallback
  if (url.pathname.startsWith("/api/")) {
    e.respondWith(
      fetch(e.request).catch(() =>
        new Response(JSON.stringify({ error: "offline", offline: true }), {
          status: 503,
          headers: { "Content-Type": "application/json" },
        })
      )
    );
    return;
  }

  // ③ Images (including external storage URLs) — cache-first, silently fail offline
  if (IMAGE_EXTENSIONS.test(url.pathname)) {
    e.respondWith(cacheFirstImage(e.request));
    return;
  }

  // ④ Static assets (JS/CSS chunks) — cache-first, fall back to index.html only
  //    for navigation requests so the SPA can render.
  e.respondWith(
    caches.match(e.request).then((cached) => {
      if (cached) return cached;
      return fetch(e.request).then((res) => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(SHELL_CACHE).then((c) => c.put(e.request, clone));
        }
        return res;
      }).catch(() => {
        // Only serve index.html fallback for navigation requests (SPA routes)
        if (e.request.mode === "navigate") {
          return caches.match("/index.html");
        }
        // For other assets that aren't cached, return a generic error response
        return new Response("", { status: 503 });
      });
    })
  );
});

// ── Image cache-first strategy ─────────────────────────────────────────────────
async function cacheFirstImage(request) {
  const cache = await caches.open(IMAGE_CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;

  try {
    const res = await fetch(request);
    if (res.ok) {
      // Trim oldest entries if cache is getting large
      await trimImageCache(cache, IMAGE_CACHE_MAX - 1);
      cache.put(request, res.clone());
    }
    return res;
  } catch {
    // Offline and not cached — return a transparent 1×1 pixel as placeholder
    return new Response(
      // 1×1 transparent PNG
      new Uint8Array([
        0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a,0x00,0x00,0x00,0x0d,0x49,0x48,0x44,0x52,
        0x00,0x00,0x00,0x01,0x00,0x00,0x00,0x01,0x08,0x06,0x00,0x00,0x00,0x1f,0x15,0xc4,
        0x89,0x00,0x00,0x00,0x0b,0x49,0x44,0x41,0x54,0x08,0xd7,0x63,0x60,0x00,0x00,0x00,
        0x02,0x00,0x01,0xe2,0x21,0xbc,0x33,0x00,0x00,0x00,0x00,0x49,0x45,0x4e,0x44,0xae,
        0x42,0x60,0x82,
      ]),
      { status: 200, headers: { "Content-Type": "image/png" } }
    );
  }
}

// Keep the image cache under a size limit (FIFO by insertion order)
async function trimImageCache(cache, maxEntries) {
  const keys = await cache.keys();
  if (keys.length >= maxEntries) {
    const toDelete = keys.slice(0, keys.length - maxEntries + 1);
    await Promise.all(toDelete.map((k) => cache.delete(k)));
  }
}

// ── Helpers ────────────────────────────────────────────────────────────────────
async function staleWhileRevalidate(request) {
  const cache  = await caches.open(API_CACHE);
  const cached = await cache.match(request);

  // Kick off a background network fetch regardless
  const networkFetch = fetch(request).then((res) => {
    if (res.ok) {
      const clone = res.clone();
      // Stamp the response with a cached-at header
      clone.headers; // force read
      cache.put(request, res.clone());
    }
    return res;
  }).catch(() => null);

  if (cached) {
    // Check age via Date header
    const dateHeader = cached.headers.get("date");
    const age = dateHeader ? Date.now() - new Date(dateHeader).getTime() : Infinity;
    if (age < API_STALE_MS) {
      // Fresh enough — return cache immediately; background fetch already running
      return cached;
    }
    // Stale — try network, fall back to cache
    const fresh = await networkFetch;
    return fresh ?? cached;
  }

  // No cache — must wait for network
  const res = await networkFetch;
  if (res) return res;

  // Fully offline and no cache
  return new Response(JSON.stringify({ error: "offline", offline: true }), {
    status: 503,
    headers: { "Content-Type": "application/json" },
  });
}
