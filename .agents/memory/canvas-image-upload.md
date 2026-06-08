---
name: Canvas image assets via .canvas/assets/
description: Canvas image shapes require files in .canvas/assets/ served on port 5904 — not arbitrary HTTPS URLs.
---

Canvas will reject image `src` values that point to arbitrary HTTPS endpoints with the error "Image assets must be uploaded to the canvas before they can be used".

**Rule:** copy screenshot/image files to `.canvas/assets/` first, then reference them at `https://<DOMAIN>:5904/<filename>` (no query params, no base-path prefix like `/__mockup/`).

```bash
mkdir -p .canvas/assets
cp artifacts/mockup-sandbox/public/square-mobile.jpg .canvas/assets/square-mobile.jpg
# verify:
curl -s -o /dev/null -w "%{http_code}" "http://localhost:5904/square-mobile.jpg"  # → 200
```

Then in `applyCanvasActions`:
```js
shape: { type: "image", x, y, w, h, src: "https://<DOMAIN>:5904/square-mobile.jpg" }
```

**Why:** the canvas service validates that image assets are pre-registered in its asset store, which port 5904 serves from `.canvas/assets/`. The mockup sandbox public folder (`/__mockup/square-mobile.jpg`) is NOT the same path and will 404 or be rejected.

**How to apply:** any time you need to place a screenshot or local image on the canvas, always run the `cp` step first before constructing the canvas action.
