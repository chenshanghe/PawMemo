// Cache names — bump CACHE_VER to force refresh on deploy
const CACHE_VER = "v4";
const SHELL_CACHE = `wantong-shell-${CACHE_VER}`;
const API_CACHE   = `wantong-api-${CACHE_VER}`;

// Pages/assets pre-cached on install
const PRECACHE_URLS = ["/", "/index.html"];

// API GET routes worth caching for offline reading
const API_CACHE_PATTERNS = [
  /\/api\/entries(\?|$|\/.+)/,
  /\/api\/me\//,
  /\/api\/profile\//,
  /\/api\/collections/,
];

// Max age (ms) before a cached API response is considered stale
const API_STALE_MS = 5 * 60 * 1000; // 5 min

// ── Install ────────────────────────────────────────────────────────────────────
self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(SHELL_CACHE)
      .then((c) => c.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

// ── Activate — delete old caches ───────────────────────────────────────────────
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== SHELL_CACHE && k !== API_CACHE)
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

  // ③ Static assets — cache-first (shell + JS/CSS chunks)
  e.respondWith(
    caches.match(e.request).then((cached) => {
      if (cached) return cached;
      return fetch(e.request).then((res) => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(SHELL_CACHE).then((c) => c.put(e.request, clone));
        }
        return res;
      }).catch(() => caches.match("/index.html"));
    })
  );
});

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
