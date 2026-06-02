---
name: Travel Diary Production Build
description: How to rebuild the travel-diary frontend before deploying to production
---

The deployed production app serves static files from `artifacts/travel-diary/dist/public` — it does NOT rebuild from source on deploy.

**Why:** artifact.toml sets `serve = "static"` and `publicDir = "artifacts/travel-diary/dist/public"`. The deploy process only starts the API server; the frontend is pre-built static files.

**How to apply:** Before publishing, always run a fresh build:
```
PORT=18469 BASE_PATH=/ pnpm --filter @workspace/travel-diary run build
```
Both env vars are required (PORT and BASE_PATH) — vite.config.ts throws if either is missing. Values come from `artifacts/travel-diary/.replit-artifact/artifact.toml` under `[services.env]`.

**Rule:** Any time frontend code changes need to reach production, rebuild dist first, then Publish.
