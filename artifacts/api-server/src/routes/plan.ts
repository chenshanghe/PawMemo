import { Router } from "express";
import OpenAI from "openai";
import { requireAuth } from "../middlewares/auth";

const router = Router();

const deepseek = new OpenAI({
  baseURL: "https://api.deepseek.com",
  apiKey: process.env.DEEPSEEK_API_KEY,
});

async function geocode(name: string, city: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const q = encodeURIComponent(`${name},${city}`);
    const url = `https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=1&accept-language=zh&countrycodes=cn`;
    const res = await fetch(url, { headers: { "User-Agent": "HongshuTravelDiary/1.0" } });
    if (!res.ok) return null;
    const data: any[] = await res.json();
    if (!data.length) return null;
    return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
  } catch {
    return null;
  }
}

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

function dianpingUrl(name: string) {
  return `https://www.dianping.com/search/keyword/2/0_${encodeURIComponent(name)}`;
}
function gaodeUrl(name: string, city: string) {
  return `https://amap.com/search?query=${encodeURIComponent(name)}&city=${encodeURIComponent(city)}`;
}

function buildBooking({ from, destinations, startDate, endDate, travelers, cities }: {
  from: string; destinations: string[]; startDate: string; endDate: string;
  travelers: number; cities: string[];
}) {
  const firstDest = destinations[0] ?? cities[0] ?? "";
  const lastDest = destinations[destinations.length - 1] ?? cities[cities.length - 1] ?? "";
  const n = travelers;

  return {
    flights: {
      outbound: [
        { name: "携程机票", url: `https://flights.ctrip.com/international/search/oneway-${encodeURIComponent(from)}-${encodeURIComponent(firstDest)}?depdate=${startDate}&cabin=y&adult=${n}` },
        { name: "去哪儿机票", url: `https://flight.qunar.com/site/oneway.htm?dep=${encodeURIComponent(from)}&arr=${encodeURIComponent(firstDest)}&goDate=${startDate}&passengerCount=${n}` },
        { name: "飞猪机票", url: `https://flight.fliggy.com/search/?frmFrom=${encodeURIComponent(from)}&frmTo=${encodeURIComponent(firstDest)}&frmDate=${startDate}&adult=${n}` },
      ],
      return: [
        { name: "携程返程", url: `https://flights.ctrip.com/international/search/oneway-${encodeURIComponent(lastDest)}-${encodeURIComponent(from)}?depdate=${endDate}&cabin=y&adult=${n}` },
        { name: "去哪儿返程", url: `https://flight.qunar.com/site/oneway.htm?dep=${encodeURIComponent(lastDest)}&arr=${encodeURIComponent(from)}&goDate=${endDate}&passengerCount=${n}` },
      ],
    },
    trains: [
      { from, to: firstDest, name: `${from} → ${firstDest} 高铁`, url: `https://kyfw.12306.cn/otn/leftTicket/init?leftTicketDTO.train_date=${startDate}&leftTicketDTO.from_station=${encodeURIComponent(from)}&leftTicketDTO.to_station=${encodeURIComponent(firstDest)}&purpose_codes=ADULT` },
      { from: lastDest, to: from, name: `${lastDest} → ${from} 返程`, url: `https://kyfw.12306.cn/otn/leftTicket/init?leftTicketDTO.train_date=${endDate}&leftTicketDTO.from_station=${encodeURIComponent(lastDest)}&leftTicketDTO.to_station=${encodeURIComponent(from)}&purpose_codes=ADULT` },
    ],
    hotels: cities.map(city => ({
      city,
      links: [
        { name: "携程酒店", url: `https://hotels.ctrip.com/hotel/?cityname=${encodeURIComponent(city)}&checkin=${startDate}&checkout=${endDate}&adult=${n}` },
        { name: "美团酒店", url: `https://www.meituan.com/hotel/?keyword=${encodeURIComponent(city)}&checkIn=${startDate}&checkOut=${endDate}` },
      ],
    })),
  };
}

router.post("/plan/generate", requireAuth, async (req, res) => {
  const { from, destinations, startDate, endDate, travelers, style } = req.body ?? {};

  if (!from || !Array.isArray(destinations) || !destinations.length || !startDate || !endDate) {
    res.status(400).json({ error: "缺少必要参数（出发地、目的地、日期）" });
    return;
  }

  const msRange = new Date(endDate).getTime() - new Date(startDate).getTime();
  const days = Math.max(1, Math.min(14, Math.round(msRange / 86400000) + 1));
  const destStr = destinations.join("、");
  const styleStr = style ? `旅行风格：${style}。` : "";

  const systemPrompt = `你是专业中国旅行规划师。请返回严格符合以下结构的 JSON（不含任何额外文字）：
{
  "title": "旅行标题（≤12字）",
  "summary": "行程概述（≤60字）",
  "cities": ["城市1", "城市2"],
  "days": [
    {
      "day": 1,
      "date": "YYYY-MM-DD",
      "city": "城市名",
      "theme": "当天主题（≤12字）",
      "morning": { "place": "景点名", "description": "简介（≤40字）", "duration": "建议时长", "tips": "小贴士（≤20字）" },
      "afternoon": { "place": "景点名", "description": "简介（≤40字）", "duration": "建议时长", "tips": "小贴士（≤20字）" },
      "lunch": { "name": "餐厅或美食名", "cuisine": "菜系", "description": "推荐理由（≤30字）" },
      "dinner": { "name": "餐厅或美食名", "cuisine": "菜系", "description": "推荐理由（≤30字）" }
    }
  ],
  "transport": [
    { "from": "出发城市", "to": "目的城市", "mode": "flight 或 train", "recommendation": "购票建议（≤30字）" }
  ],
  "tips": ["贴士1", "贴士2", "贴士3"]
}`;

  const userPrompt = `出发地：${from}\n目的地：${destStr}\n出发日期：${startDate}\n结束日期：${endDate}\n天数：${days}天\n人数：${travelers ?? 2}人\n${styleStr}请生成完整的 ${days} 天行程。`;

  try {
    const resp = await deepseek.chat.completions.create({
      model: "deepseek-chat",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
      max_tokens: 4000,
    });

    const plan = JSON.parse(resp.choices[0].message.content ?? "{}");

    for (const day of (plan.days ?? [])) {
      if (day.morning?.place) {
        day.morning.coords = await geocode(day.morning.place, day.city);
        day.morning.dianpingUrl = dianpingUrl(day.morning.place);
        day.morning.gaodeUrl = gaodeUrl(day.morning.place, day.city);
        await sleep(250);
      }
      if (day.afternoon?.place) {
        day.afternoon.coords = await geocode(day.afternoon.place, day.city);
        day.afternoon.dianpingUrl = dianpingUrl(day.afternoon.place);
        day.afternoon.gaodeUrl = gaodeUrl(day.afternoon.place, day.city);
        await sleep(250);
      }
      if (day.lunch?.name) day.lunch.dianpingUrl = dianpingUrl(day.lunch.name);
      if (day.dinner?.name) day.dinner.dianpingUrl = dianpingUrl(day.dinner.name);
    }

    const booking = buildBooking({
      from,
      destinations,
      startDate,
      endDate,
      travelers: travelers ?? 2,
      cities: plan.cities?.length ? plan.cities : destinations,
    });

    res.json({ ...plan, booking });
  } catch (err: any) {
    console.error("[plan] error:", err);
    res.status(500).json({ error: "AI 规划失败，请稍后重试" });
  }
});

export default router;
