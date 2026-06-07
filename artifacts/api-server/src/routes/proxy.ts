import { Router } from "express";

const router = Router();

const VALID_STYLES = [
  "adventurer", "big-smile", "fun-emoji", "micah",
  "pixel-art", "bottts-neutral", "lorelei",
];

// GET /proxy/dicebear?style=xxx&seed=xxx
// Server-side proxy so clients behind GFW can load DiceBear SVGs.
// No auth required — safe because style is whitelisted and seed is user-supplied text.
router.get("/proxy/dicebear", async (req, res) => {
  const style = String(req.query.style ?? "adventurer");
  const seed  = String(req.query.seed  ?? "default");

  if (!VALID_STYLES.includes(style)) {
    res.status(400).json({ error: "invalid style" });
    return;
  }

  try {
    const upstream = `https://api.dicebear.com/9.x/${style}/svg?seed=${encodeURIComponent(seed)}`;
    const response = await fetch(upstream, {
      headers: { "User-Agent": "urchins-proxy/1.0" },
    });
    if (!response.ok) {
      res.status(502).json({ error: "upstream error" });
      return;
    }
    const svg = await response.text();
    res.setHeader("Content-Type", "image/svg+xml; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=86400");
    res.send(svg);
  } catch {
    res.status(502).json({ error: "proxy error" });
  }
});

export default router;
