import { Router } from "express";
import OpenAI from "openai";
import { db } from "@workspace/db";
import { diaryEntriesTable } from "@workspace/db";
import { eq, and, inArray } from "drizzle-orm";
import { requireAuth, AuthedRequest } from "../middlewares/auth";
import { checkAndIncrAiCompose, checkAndIncrAiEnhance } from "../lib/tiers";

const router = Router();
router.use(requireAuth);

const deepseek = new OpenAI({
  baseURL: "https://api.deepseek.com",
  apiKey: process.env.DEEPSEEK_API_KEY,
});

// POST /ai/avatar/ai-suggest — pick a DiceBear style+seed matching a description
router.post("/avatar/ai-suggest", async (req, res) => {
  const { description } = req.body ?? {};
  if (!description || typeof description !== "string" || !description.trim()) {
    res.status(400).json({ error: "description required" });
    return;
  }
  const STYLES = ["adventurer", "big-smile", "fun-emoji", "micah", "pixel-art", "bottts-neutral", "lorelei"];
  try {
    const resp = await deepseek.chat.completions.create({
      model: "deepseek-chat",
      messages: [
        {
          role: "system",
          content: `You are a cartoon avatar style selector. Based on the user description, pick ONE of these DiceBear styles: ${STYLES.join(", ")}. Also invent a creative short seed string (no spaces, 4-16 chars). Reply with JSON only, no markdown: {"style":"...","seed":"..."}`,
        },
        { role: "user", content: description.trim().slice(0, 200) },
      ],
      response_format: { type: "json_object" },
      max_tokens: 80,
    });
    const raw = JSON.parse(resp.choices[0].message.content ?? "{}");
    const style = STYLES.includes(raw.style) ? raw.style : "adventurer";
    const seed = encodeURIComponent((raw.seed || description.replace(/\s+/g, "-")).slice(0, 30));
    res.json({ url: `https://api.dicebear.com/9.x/${style}/svg?seed=${seed}` });
  } catch {
    res.status(500).json({ error: "AI 生成失败，请重试" });
  }
});

// ── Shared prompt builder ──────────────────────────────────────────────────────
function buildComposePrompts(
  rows: (typeof diaryEntriesTable.$inferSelect)[],
  style?: string
): { systemPrompt: string; userPrompt: string } {
  const sections = rows.map((e, i) => {
    const date = e.endDate ? `${e.startDate} 至 ${e.endDate}` : e.startDate;
    return `【第${i + 1}篇：${e.title}】\n目的地：${e.destination}\n日期：${date}${e.mood ? `\n心情：${e.mood}` : ""}\n\n${e.content ?? "（无正文）"}`;
  }).join("\n\n---\n\n");

  const sectionCount = rows.length;
  const separatorExample = rows.map((_, i) => `第${i + 1}段正文…`).join("\n[===]\n");

  const systemPrompt = `你是一位擅长写游记的中文旅行作家，文笔优美、情感细腻。
将旅行者提供的多篇按时间标记的随记，整合成一篇结构完整、行文流畅的游记。
要求：
1. 严格按照时间先后顺序组织全文
2. 忠实于原随记内容，不得编造任何人物、地点、情节、对话或心理活动；仅可使用原随记中明确出现的信息
3. 可以添加必要的连接词、过渡句让文章自然连贯，也可以适当润色语句，但不得增添原文未提及的景物、事件或感受
4. 将原随记中的时间标记自然地融入游记叙事中，避免罗列式的"某日某时"写法
5. 【标题】综合所有随记的目的地、行程与主题，拟定一个反映整段旅程的标题。输出的第一行必须是 【标题】xxx（xxx 为标题文字），之后空一行，再开始正文
6. 【重要·分段规则】正文必须严格分为 ${sectionCount} 段，每段对应一篇原始日记。相邻两段之间必须单独另起一行输出分隔符 [===]，前后各空一行，共 ${sectionCount - 1} 个分隔符。输出格式示例：
【标题】xxx

${separatorExample}
7. 除标题行和 [===] 分隔符外，不要输出任何序号或说明文字
8. 正文字数建议 800-2000 字（不含标题行）`;

  const userPrompt = style?.trim()
    ? `请按照以下风格要求：${style.trim()}\n\n将下面这些日记合成为一篇游记：\n\n${sections}`
    : `请将下面这些日记合成为一篇完整的游记：\n\n${sections}`;

  return { systemPrompt, userPrompt };
}

// POST /ai/compose-prompt — preview rendered prompts without calling AI (no quota)
router.post("/compose-prompt", async (req, res) => {
  const userId = (req as AuthedRequest).userId;
  const { entryIds, style } = req.body as { entryIds: number[]; style?: string };

  if (!Array.isArray(entryIds) || entryIds.length < 2) {
    res.status(400).json({ error: "至少选择 2 篇日记" });
    return;
  }
  if (entryIds.length > 10) {
    res.status(400).json({ error: "最多选择 10 篇日记" });
    return;
  }

  const rows = await db
    .select()
    .from(diaryEntriesTable)
    .where(and(inArray(diaryEntriesTable.id, entryIds), eq(diaryEntriesTable.userId, userId)));

  if (rows.length < 2) {
    res.status(400).json({ error: "找不到足够的日记，请检查权限" });
    return;
  }

  rows.sort((a, b) => a.startDate.localeCompare(b.startDate));
  res.json(buildComposePrompts(rows, style));
});

// POST /ai/compose — merge multiple owned entries into a narrative (SSE stream)
router.post("/compose", async (req, res) => {
  const userId = (req as AuthedRequest).userId;
  const { entryIds, style, customUserPrompt } = req.body as {
    entryIds: number[];
    style?: string;
    customUserPrompt?: string;
  };

  if (!Array.isArray(entryIds) || entryIds.length < 2) {
    res.status(400).json({ error: "至少选择 2 篇日记" });
    return;
  }
  if (entryIds.length > 10) {
    res.status(400).json({ error: "最多选择 10 篇日记" });
    return;
  }

  // Quota: AI compose monthly limit
  const quota = await checkAndIncrAiCompose(userId);
  if (!quota.ok) {
    res.status(403).json({ code: "AI_LIMIT", tier: quota.tier, limit: quota.limit, used: quota.used });
    return;
  }

  // Fetch entries — only allow user's own entries
  const rows = await db
    .select()
    .from(diaryEntriesTable)
    .where(and(inArray(diaryEntriesTable.id, entryIds), eq(diaryEntriesTable.userId, userId)));

  if (rows.length < 2) {
    res.status(400).json({ error: "找不到足够的日记，请检查权限" });
    return;
  }

  // Sort by date
  rows.sort((a, b) => a.startDate.localeCompare(b.startDate));

  const { systemPrompt, userPrompt: builtUserPrompt } = buildComposePrompts(rows, style);
  const userPrompt = customUserPrompt?.trim() || builtUserPrompt;

  try {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    const stream = await deepseek.chat.completions.create({
      model: "deepseek-chat",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      stream: true,
    });

    for await (const chunk of stream) {
      const text = chunk.choices[0]?.delta?.content;
      if (text) res.write(`data: ${JSON.stringify({ text })}\n\n`);
    }

    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } catch (err: any) {
    res.write(`data: ${JSON.stringify({ error: err.message ?? "AI 服务异常" })}\n\n`);
    res.end();
  }
});

// POST /ai/enhance
router.post("/enhance", async (req, res) => {
  const userId = (req as AuthedRequest).userId;
  const { content, instruction } = req.body as {
    content: string;
    instruction?: string;
  };

  if (!content || typeof content !== "string" || content.trim().length === 0) {
    res.status(400).json({ error: "content 不能为空" });
    return;
  }

  const quota = await checkAndIncrAiEnhance(userId);
  if (!quota.ok) {
    res.status(403).json({ code: "AI_ENHANCE_LIMIT", tier: quota.tier, limit: quota.limit, used: quota.used });
    return;
  }

  const systemPrompt = `你是一位精通文字的中文旅行写作专家，深谙语言润色之道，能够将旅行者的粗稿提升为兼具文学美感与真实温度的佳作。
核心原则：
· 保持第一人称视角和原文真实情感，绝不凭空添加原文中没有的事实、地点或细节
· 只返回优化后的正文，不要任何解释、说明或标题`;

  const defaultPolishPrompt = `请按照以下六个层面对这篇旅行日记进行全面润色：

1. 基础清扫：纠正错别字（尤其"的/地/得"、同音字）、病句和不规范标点；修复成分残缺、搭配不当等语法问题。

2. 删繁就简：删除重复表意的词句；将"进行了、给予了、实现了"等虚词替换为直接动词（如"对市场进行了调查"→"调查了市场"）；压缩空洞修饰语。

3. 词汇升级：用精准、具象的词替换笼统的"说/看/做/好/坏"等万能词；少用"很、非常"，多用能唤起画面感的表达（如"很热"→"烈日灼人"）；结合旅行日记的情境选词，保持亲切自然的调性。

4. 句式精调：长短句交替搭配，避免一律长句或一律短句；把需要强调的信息调整到句首或句尾；多用主动语态，使文字更有力量。

5. 逻辑与衔接：在转折、因果、递进处准确使用关联词，让段落间过渡自然流畅；梳理叙述顺序（时间或空间逻辑），必要时调整段落位置。

6. 风格统一：全文保持一致的语体（亲切的旅行随笔风格）和人称；注意句尾音韵的错落，使文章读起来朗朗上口。

原文：
${content}`;

  const userPrompt = instruction?.trim()
    ? `请按照以下要求优化这篇旅行日记：${instruction.trim()}\n\n原文：\n${content}`
    : defaultPolishPrompt;

  try {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    const stream = await deepseek.chat.completions.create({
      model: "deepseek-chat",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      stream: true,
    });

    for await (const chunk of stream) {
      const text = chunk.choices[0]?.delta?.content;
      if (text) {
        res.write(`data: ${JSON.stringify({ text })}\n\n`);
      }
    }

    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } catch (err: any) {
    res.write(`data: ${JSON.stringify({ error: err.message ?? "AI 服务异常" })}\n\n`);
    res.end();
  }
});

// POST /ai/recommend — AI destination recommendations based on user's travel history
router.post("/recommend", async (req, res) => {
  const userId = (req as AuthedRequest).userId;
  try {
    const entries = await db
      .select({ destination: diaryEntriesTable.destination, mood: diaryEntriesTable.mood })
      .from(diaryEntriesTable)
      .where(eq(diaryEntriesTable.userId, userId))
      .orderBy(diaryEntriesTable.createdAt)
      .limit(50);

    if (entries.length === 0) {
      res.json({ recommendations: [] });
      return;
    }

    const destCounts: Record<string, number> = {};
    for (const e of entries) {
      destCounts[e.destination] = (destCounts[e.destination] ?? 0) + 1;
    }
    const topDests = Object.entries(destCounts).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([d]) => d);
    const moods = [...new Set(entries.map(e => e.mood).filter(Boolean))];

    const resp = await deepseek.chat.completions.create({
      model: "deepseek-chat",
      messages: [
        {
          role: "system",
          content: `你是一位专业旅行顾问，根据用户的旅行历史推荐3个新目的地。用JSON数组回答，每个元素包含：name(地名), country(国家/地区), reason(推荐理由,2句话内), emoji(代表emoji), tags(2-3个标签数组)。只返回JSON，不加markdown。`,
        },
        {
          role: "user",
          content: `我去过：${topDests.join("、")}。常见心情：${moods.join("、") || "开心"}。请推荐3个我可能喜欢的新目的地。`,
        },
      ],
      response_format: { type: "json_object" },
      max_tokens: 600,
    });

    const raw = JSON.parse(resp.choices[0].message.content ?? "{}");
    const recommendations = Array.isArray(raw) ? raw : (raw.recommendations ?? raw.list ?? []);
    res.json({ recommendations: recommendations.slice(0, 3) });
  } catch (err: any) {
    res.status(500).json({ error: err.message ?? "AI 服务异常" });
  }
});

export default router;
