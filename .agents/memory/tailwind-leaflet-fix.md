---
name: Tailwind v4 + Leaflet tile CSS conflict
description: Tailwind v4 base styles collapse Leaflet tile img elements, making map tiles invisible while markers (div-based) still show.
---

## Rule
Always add a Leaflet tile CSS reset to `index.css` whenever using react-leaflet + Tailwind v4 together.

```css
.leaflet-container img.leaflet-tile {
  max-width: none !important;
  max-height: none !important;
  width: 256px !important;
  height: 256px !important;
  display: inline !important;
}
```

**Why:** Tailwind v4 preflight (`@import "tailwindcss"`) sets `img { max-width: 100%; height: auto; display: block; }` in the `base` layer. Leaflet tile images are `256×256px img` elements positioned absolutely — when constrained to `max-width: 100%` of their tiny parent container, they render as 0×0 pixels. Markers use `divIcon` (HTML div elements) so they are unaffected.

**How to apply:** Place the CSS rule outside any `@layer` block so it overrides Tailwind's layered base styles. Place it immediately after `@import "tailwindcss"` in `index.css`. This applies to all Leaflet map uses in the project (both map.tsx and plan.tsx share the same index.css).

**Diagnosed by:** All external tile servers (OSM, CartoDB, Esri, Gaode) returned HTTP 200 with valid image data from the server — confirming it was a CSS rendering bug, not a network/CORS issue.
