import { Router } from "express";
import OpenAI from "openai";
import { requireAuth } from "../middlewares/auth";
import { getAuth } from "@clerk/express";
import { db } from "@workspace/db";
import { savedPlansTable } from "@workspace/db/schema";
import { eq, and, desc } from "drizzle-orm";

const router = Router();

const deepseek = new OpenAI({
  baseURL: "https://api.deepseek.com",
  apiKey: process.env.DEEPSEEK_API_KEY,
});

async function geocode(name: string, city: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const q = encodeURIComponent(`${name},${city}`);
    const url = `https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=1&accept-language=zh`;
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

function budgetToHotelStar(budget?: string): string {
  if (!budget) return "";
  if (budget.startsWith("豪华")) return "&star=5";
  if (budget.startsWith("舒适")) return "&star=4";
  return "";
}

function buildBooking({ from, destinations, startDate, endDate, travelers, cities, budget }: {
  from: string; destinations: string[]; startDate: string; endDate: string;
  travelers: number; cities: string[]; budget?: string;
}) {
  const firstDest = destinations[0] ?? cities[0] ?? "";
  const lastDest = destinations[destinations.length - 1] ?? cities[cities.length - 1] ?? "";
  const n = travelers;
  const starFilter = budgetToHotelStar(budget);

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
        { name: "携程酒店", url: `https://hotels.ctrip.com/hotel/?cityname=${encodeURIComponent(city)}&checkin=${startDate}&checkout=${endDate}&adult=${n}${starFilter}` },
        { name: "美团酒店", url: `https://www.meituan.com/hotel/?keyword=${encodeURIComponent(city)}&checkIn=${startDate}&checkOut=${endDate}` },
      ],
    })),
  };
}

function buildSpecialNeedsPrompt(needs: string[]): string {
  const map: Record<string, string> = {
    "素食友好": "用户为素食者，请在午餐和晚餐中优先推荐素食/蔬食餐厅，并在 tips 中注明素食选择",
    "宠物友好": "用户携带宠物出行，请优先推荐允许携带宠物的景点、餐厅和住宿，并注意提示",
    "无障碍设施": "用户有无障碍需求，请优先推荐有完善无障碍设施的景点和餐厅，避免需要爬楼梯的场所",
  };
  const lines = needs.map(n => map[n] ?? n).filter(Boolean);
  return lines.length ? `特殊需求：${lines.join("；")}。` : "";
}

const GROUP_TYPE_LABELS: Record<string, string> = {
  solo: "独自旅行（请推荐适合独自出行的活动、安全提示和社交机会）",
  couple: "情侣/夫妻出行（请推荐浪漫餐厅、适合情侣的景点和体验）",
  family: "亲子家庭出行（请推荐家庭友好景点、儿童友好餐厅，注意安全和亲子互动）",
  friends: "朋友结伴出行（请推荐适合群体活动、娱乐性强的体验和聚餐场所）",
};

router.post("/plan/generate", requireAuth, async (req, res) => {
  const { from, destinations, startDate, endDate, travelers, style, travelMode, budget, specialNeeds, groupType } = req.body ?? {};

  if (!from || !Array.isArray(destinations) || !destinations.length || !startDate || !endDate) {
    res.status(400).json({ error: "缺少必要参数（出发地、目的地、日期）" });
    return;
  }

  const msRange = new Date(endDate).getTime() - new Date(startDate).getTime();
  const days = Math.max(1, Math.min(14, Math.round(msRange / 86400000) + 1));
  const destStr = destinations.join("、");
  const styleStr = style ? `旅行风格：${style}。` : "";
  const modeStr = travelMode ? `出行方式：${travelMode}。` : "";
  const budgetStr = budget ? `预算档次：${budget}（请在推荐餐厅、酒店和交通时体现此预算范围）。` : "";
  const needsArr: string[] = Array.isArray(specialNeeds) ? specialNeeds : [];
  const needsStr = needsArr.length ? buildSpecialNeedsPrompt(needsArr) : "";
  const groupTypeStr = groupType && GROUP_TYPE_LABELS[groupType] ? `出行类型：${GROUP_TYPE_LABELS[groupType]}。` : "";

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

  const userPrompt = `出发地：${from}\n目的地：${destStr}\n出发日期：${startDate}\n结束日期：${endDate}\n天数：${days}天\n人数：${travelers ?? 2}人\n${styleStr}${modeStr}${budgetStr}${needsStr}${groupTypeStr}请生成完整的 ${days} 天行程。`;

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
      if (day.lunch?.name) {
        day.lunch.dianpingUrl = dianpingUrl(day.lunch.name);
        day.lunch.gaodeUrl = gaodeUrl(day.lunch.name, day.city);
      }
      if (day.dinner?.name) {
        day.dinner.dianpingUrl = dianpingUrl(day.dinner.name);
        day.dinner.gaodeUrl = gaodeUrl(day.dinner.name, day.city);
      }
    }

    const booking = buildBooking({
      from,
      destinations,
      startDate,
      endDate,
      travelers: travelers ?? 2,
      cities: plan.cities?.length ? plan.cities : destinations,
      budget,
    });

    res.json({ ...plan, booking });
  } catch (err: any) {
    console.error("[plan] error:", err);
    res.status(500).json({ error: "AI 规划失败，请稍后重试" });
  }
});

// ── Save a plan ──────────────────────────────────────────────────────────────
router.post("/plan/save", requireAuth, async (req, res) => {
  const { userId } = getAuth(req);
  if (!userId) { res.status(401).json({ error: "未登录" }); return; }

  const { from, destinations, startDate, endDate, travelers, style, travelMode, budget, specialNeeds, planData } = req.body ?? {};
  if (!from || !planData) { res.status(400).json({ error: "缺少参数" }); return; }

  try {
    const [saved] = await db.insert(savedPlansTable).values({
      userId,
      title: planData.title ?? "我的行程",
      summary: planData.summary ?? null,
      from,
      destinations: destinations ?? [],
      startDate,
      endDate,
      travelers: travelers ?? 2,
      style: style ?? null,
      travelMode: travelMode ?? null,
      budget: budget ?? null,
      specialNeeds: Array.isArray(specialNeeds) ? specialNeeds : [],
      planData,
    }).returning();
    res.json(saved);
  } catch (err: any) {
    console.error("[plan/save] error:", err);
    res.status(500).json({ error: "保存失败" });
  }
});

// ── List saved plans ─────────────────────────────────────────────────────────
router.get("/plan/saved", requireAuth, async (req, res) => {
  const { userId } = getAuth(req);
  if (!userId) { res.status(401).json({ error: "未登录" }); return; }

  try {
    const plans = await db
      .select({
        id: savedPlansTable.id,
        title: savedPlansTable.title,
        summary: savedPlansTable.summary,
        from: savedPlansTable.from,
        destinations: savedPlansTable.destinations,
        startDate: savedPlansTable.startDate,
        endDate: savedPlansTable.endDate,
        travelers: savedPlansTable.travelers,
        style: savedPlansTable.style,
        travelMode: savedPlansTable.travelMode,
        budget: savedPlansTable.budget,
        specialNeeds: savedPlansTable.specialNeeds,
        createdAt: savedPlansTable.createdAt,
      })
      .from(savedPlansTable)
      .where(eq(savedPlansTable.userId, userId))
      .orderBy(desc(savedPlansTable.createdAt));
    res.json(plans);
  } catch (err: any) {
    console.error("[plan/saved] error:", err);
    res.status(500).json({ error: "获取失败" });
  }
});

// ── Get one saved plan (with full planData) ──────────────────────────────────
router.get("/plan/saved/:id", requireAuth, async (req, res) => {
  const { userId } = getAuth(req);
  if (!userId) { res.status(401).json({ error: "未登录" }); return; }

  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "无效 ID" }); return; }

  try {
    const [plan] = await db
      .select()
      .from(savedPlansTable)
      .where(and(eq(savedPlansTable.id, id), eq(savedPlansTable.userId, userId)));
    if (!plan) { res.status(404).json({ error: "未找到" }); return; }
    res.json(plan);
  } catch (err: any) {
    res.status(500).json({ error: "获取失败" });
  }
});

// ── Delete a saved plan ──────────────────────────────────────────────────────
router.delete("/plan/saved/:id", requireAuth, async (req, res) => {
  const { userId } = getAuth(req);
  if (!userId) { res.status(401).json({ error: "未登录" }); return; }

  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "无效 ID" }); return; }

  try {
    const deleted = await db
      .delete(savedPlansTable)
      .where(and(eq(savedPlansTable.id, id), eq(savedPlansTable.userId, userId)))
      .returning();
    if (!deleted.length) { res.status(404).json({ error: "未找到或无权限" }); return; }
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: "删除失败" });
  }
});

export default router;
