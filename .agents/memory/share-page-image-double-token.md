---
name: Share page image double shareToken bug
description: Why share-view images returned 403 — backend and frontend both added shareToken to storage URLs
---

## The Rule
Never call `withToken()` on a URL that may already contain a `shareToken=` query param. Make `withToken` idempotent by checking for existing token before appending.

**Why:** The backend `/share/:token` endpoint already rewrites all `/api/storage/` URLs to include `?shareToken=xxx`. If the frontend `withToken()` adds it again, Express receives duplicate query params and `req.query.shareToken` becomes an array `["xxx","xxx"]`, not a string. The storage route's `typeof shareToken === "string"` check then fails → `null` → 403 Forbidden → broken images.

**How to apply:**
- `withToken()` in `share-view.tsx` now checks `if (url.includes("shareToken=")) return url;` before appending.
- `storage.ts` shareToken extraction now handles arrays defensively: `Array.isArray(rawShareToken) ? rawShareToken[0] : null`.
