import { Router } from "express";

const router = Router();

const WINDOW_MS = 60_000;
const MAX_REQUESTS = 20;
const MAX_TRACKED_IPS = 10_000;

interface RateEntry {
  count: number;
  windowStart: number;
}

const ipHits = new Map<string, RateEntry>();

function evictExpired(): void {
  if (ipHits.size < MAX_TRACKED_IPS) return;
  const now = Date.now();
  for (const [ip, entry] of ipHits) {
    if (now - entry.windowStart >= WINDOW_MS) {
      ipHits.delete(ip);
    }
  }
}

function isRateLimited(ip: string): boolean {
  evictExpired();
  const now = Date.now();
  const entry = ipHits.get(ip);
  if (!entry || now - entry.windowStart >= WINDOW_MS) {
    ipHits.set(ip, { count: 1, windowStart: now });
    return false;
  }
  entry.count += 1;
  return entry.count > MAX_REQUESTS;
}

router.get("/geocode", async (req, res) => {
  const ip = req.ip ?? "unknown";

  if (isRateLimited(ip)) {
    res.status(429).json({ error: "Too many requests" });
    return;
  }

  const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
  if (!q) {
    res.json([]);
    return;
  }
  try {
    const url =
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=3&accept-language=zh`;
    const r = await fetch(url, {
      headers: { "User-Agent": "HongShuTravelDiary/1.0 (educational project)" },
      signal: AbortSignal.timeout(5000),
    });
    if (!r.ok) {
      res.status(502).json({ error: "Geocode service unavailable" });
      return;
    }
    const data = (await r.json()) as Array<{
      lat: string; lon: string; display_name: string;
    }>;
    res.json(
      data.map((d) => ({
        lat: parseFloat(d.lat),
        lng: parseFloat(d.lon),
        name: d.display_name,
      }))
    );
  } catch (e: any) {
    if (e?.name === "TimeoutError") {
      res.status(504).json({ error: "Geocode timeout" });
    } else {
      res.status(502).json({ error: "Geocode service error" });
    }
  }
});

export default router;
