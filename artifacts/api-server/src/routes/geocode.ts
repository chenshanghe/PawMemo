import { Router } from "express";

const router = Router();

router.get("/geocode", async (req, res) => {
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
    });
    if (!r.ok) throw new Error(`Nominatim ${r.status}`);
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
  } catch (e) {
    res.status(500).json({ error: "Geocode failed" });
  }
});

export default router;
