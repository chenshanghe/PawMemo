import { Router } from "express";

const router = Router();

const WMO_MAP: Array<[number[], string, string]> = [
  [[0], "☀️", "晴天"],
  [[1], "🌤️", "少云"],
  [[2], "⛅", "多云"],
  [[3], "☁️", "阴天"],
  [[45, 48], "🌫️", "雾"],
  [[51, 53, 55], "🌦️", "毛毛雨"],
  [[61, 63, 65], "🌧️", "中雨"],
  [[71, 73, 75], "❄️", "雪"],
  [[77], "🌨️", "冰粒"],
  [[80, 81, 82], "🌦️", "阵雨"],
  [[85, 86], "🌨️", "阵雪"],
  [[95], "⛈️", "雷雨"],
  [[96, 99], "⛈️", "强雷雨"],
];

function wmoLookup(code: number): { icon: string; desc: string } {
  for (const [codes, icon, desc] of WMO_MAP) {
    if (codes.includes(code)) return { icon, desc };
  }
  return { icon: "🌡️", desc: "未知" };
}

router.get("/weather", async (req, res) => {
  const { lat, lng, date } = req.query as { lat?: string; lng?: string; date?: string };
  if (!lat || !lng || !date) {
    res.status(400).json({ error: "lat, lng, date required" });
    return;
  }

  const url =
    `https://archive-api.open-meteo.com/v1/archive` +
    `?latitude=${encodeURIComponent(lat)}` +
    `&longitude=${encodeURIComponent(lng)}` +
    `&start_date=${encodeURIComponent(date)}` +
    `&end_date=${encodeURIComponent(date)}` +
    `&daily=weathercode,temperature_2m_max,temperature_2m_min` +
    `&timezone=auto`;

  try {
    const r = await fetch(url, {
      headers: { "User-Agent": "HongShuTravelDiary/1.0" },
      signal: AbortSignal.timeout(8000),
    });
    if (!r.ok) {
      res.status(502).json({ error: "Weather service unavailable" });
      return;
    }
    const data = await r.json();
    const code: number | undefined = data.daily?.weathercode?.[0];
    const tempMax: number | undefined = data.daily?.temperature_2m_max?.[0];
    const tempMin: number | undefined = data.daily?.temperature_2m_min?.[0];
    if (code == null || tempMax == null || tempMin == null) {
      res.status(404).json({ error: "No weather data for this date/location" });
      return;
    }
    const { icon, desc } = wmoLookup(code);
    res.json({ code, icon, desc, tempMax: Math.round(tempMax), tempMin: Math.round(tempMin) });
  } catch (err: any) {
    if (err?.name === "TimeoutError") {
      res.status(504).json({ error: "Weather service timeout" });
    } else {
      res.status(502).json({ error: "Weather service error" });
    }
  }
});

export default router;
