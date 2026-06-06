// Cache names — version is injected at build time by the Vite stampSW plugin.
// In dev the literal placeholder string is used (harmless).
const CACHE_VER = "__SW_BUILD_TS__";
const SHELL_CACHE = `wantong-shell-${CACHE_VER}`;
const API_CACHE   = `wantong-api-${CACHE_VER}`;
const IMAGE_CACHE = `wantong-img-${CACHE_VER}`;

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

// ── Install — skip waiting immediately so the new SW activates ASAP ────────────
self.addEventListener("install", (e) => {
  // No precache of index.html: HTML is served network-first so precaching it
  // would risk serving a stale shell that references old (now-deleted) JS chunks.
  e.waitUntil(self.skipWaiting());
});

// ── Activate — claim clients first, then clean up old caches ──────────────────
// Claiming clients BEFORE cache deletion means any in-flight asset fetches
// from the still-loading old page can still hit the old shell cache momentarily.
// We then delete old caches once we've taken control.
self.addEventListener("activate", (e) => {
  e.waitUntil(
    self.clients.claim().then(() =>
      caches.keys().then((keys) =>
        Promise.all(
          keys
            .filter((k) => k !== SHELL_CACHE && k !== API_CACHE && k !== IMAGE_CACHE)
            .map((k) => caches.delete(k))
        )
      )
    ).then(() => {
      // Tell every open tab that a new version is active
      return self.clients.matchAll({ type: "window" }).then((clients) => {
        clients.forEach((client) =>
          client.postMessage({ type: "SW_UPDATED", version: CACHE_VER })
        );
      });
    })
  );
});

// ── Fetch ──────────────────────────────────────────────────────────────────────
self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;

  const url = new URL(e.request.url);

  // ① Navigation (HTML) — network-first so the app always boots with fresh HTML.
  //    If the network fails (offline / slow), fall back to a cached copy.
  //    This prevents loading stale index.html that references old JS chunk hashes.
  if (e.request.mode === "navigate") {
    e.respondWith(
      fetch(e.request)
        .then((res) => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(SHELL_CACHE).then((c) => c.put(e.request, clone));
          }
          return res;
        })
        .catch(async () => {
          const cached = await caches.match(e.request);
          return cached ?? await caches.match("/index.html") ?? new Response(
            "<h1>顽童记</h1><p>正在加载… 请检查网络连接</p>",
            { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } }
          );
        })
    );
    return;
  }

  // ② API calls that are worth caching — stale-while-revalidate
  if (API_CACHE_PATTERNS.some((re) => re.test(url.pathname + url.search))) {
    e.respondWith(staleWhileRevalidate(e.request));
    return;
  }

  // ③ Other API calls — network-first, offline JSON fallback
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

  // ④ Images (including external storage URLs) — cache-first, silently fail offline
  if (IMAGE_EXTENSIONS.test(url.pathname)) {
    e.respondWith(cacheFirstImage(e.request));
    return;
  }

  // ⑤ Static assets (JS/CSS chunks with content-hash) — cache-first.
  //    These are safe because Vite content-hashes every chunk: once a chunk URL
  //    is in cache it is immutable. Stale entries are evicted when the cache
  //    version changes (old SHELL_CACHE deleted on activate).
  e.respondWith(
    caches.match(e.request).then((cached) => {
      if (cached) return cached;
      return fetch(e.request).then((res) => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(SHELL_CACHE).then((c) => c.put(e.request, clone));
        }
        return res;
      }).catch(() => new Response("", { status: 503 }));
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
      await trimImageCache(cache, IMAGE_CACHE_MAX - 1);
      cache.put(request, res.clone());
    }
    return res;
  } catch {
    // Offline and not cached — return a transparent 1×1 pixel as placeholder
    return new Response(
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

  const networkFetch = fetch(request).then((res) => {
    if (res.ok) cache.put(request, res.clone());
    return res;
  }).catch(() => null);

  if (cached) {
    const dateHeader = cached.headers.get("date");
    const age = dateHeader ? Date.now() - new Date(dateHeader).getTime() : Infinity;
    if (age < API_STALE_MS) return cached;
    const fresh = await networkFetch;
    return fresh ?? cached;
  }

  const res = await networkFetch;
  if (res) return res;

  return new Response(JSON.stringify({ error: "offline", offline: true }), {
    status: 503,
    headers: { "Content-Type": "application/json" },
  });
}
