---
name: Vite proxy required for dev API routing
description: In dev, browser requests all go to Vite dev server; /api only reaches Express if Vite proxies it.
---

## Rule
In Replit's path-based monorepo routing, the **production** Replit proxy routes `/api/*` → API server port and `/*` → Vite port. But **in development**, the browser talks directly to the Vite dev server (port 18469). Without a Vite proxy, all `/api/*` fetch calls from the browser silently hit Vite and never reach Express.

**Fix:** Add to `vite.config.ts`:
```ts
server: {
  proxy: {
    "/api": {
      target: "http://localhost:8080",
      changeOrigin: true,
    },
  },
}
```

**Why:** Replit's path-based routing layer only applies to published/deployed URLs. In the dev workspace, all traffic for the preview tab goes through the Vite dev server. Vite must proxy `/api` to Express for backend calls to work during development.

**How to apply:** Any time a new backend route is unreachable from the browser in dev (no request shows in Express pino logs), check whether Vite proxy is configured. This applies to all artifacts using `router = "path"` in their artifact.toml.
