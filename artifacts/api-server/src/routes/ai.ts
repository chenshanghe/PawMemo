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

// POST /ai/compose — merge multiple owned entries into a narrative (SSE stream)
router.post("/compose", async (req, res) => {
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

  // Build prompt sections
  const sections = rows.map((e, i) => {
    const date = e.endDate
      ? `${e.startDate} 至 ${e.endDate}`
      : e.startDate;
    return `【第${i + 1}篇：${e.title}】\n目的地：${e.destination}\n日期：${date}${e.mood ? `\n心情：${e.mood}` : ""}\n\n${e.content ?? "（无正文）"}`;
  }).join("\n\n---\n\n");

  const sectionCount = rows.length;
  const systemPrompt = `你是一位擅长写游记的中文旅行作家，文笔优美、情感细腻、善于营造画面感。
将旅行者提供的多篇随手日记整合成一篇完整、流畅的游记文章。
要求：
1. 保持第一人称视角，忠实原文事实，不捏造细节
2. 按时间或地点顺序组织内容，加入自然的过渡衔接
3. 适当增加环境描写和情感表达，使文章更具感染力
4. 【重要】每完成一篇原始日记对应的段落后，必须在该段落末尾另起一行输出恰好 ${sectionCount - 1} 个分隔符 [===]（每个单独占一行），共 ${sectionCount} 段、${sectionCount - 1} 个分隔符
5. 输出完整游记正文，除 [===] 分隔符外不要任何说明文字或标题
6. 字数建议 800-2000 字`;

  const userPrompt = style?.trim()
    ? `请按照以下风格要求：${style.trim()}\n\n将下面这些日记合成为一篇游记：\n\n${sections}`
    : `请将下面这些日记合成为一篇完整的游记：\n\n${sections}`;

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

  const systemPrompt = `你是一位专业的中文旅行日记编辑，擅长将旅行者的粗稿润色为文笔优美、情感丰富的日记文章。
保持原文的第一人称视角和真实情感，不要凭空添加原文中没有的事实或景点。
只返回优化后的正文，不要任何解释或说明。`;

  const userPrompt = instruction?.trim()
    ? `请按照以下要求优化这篇旅行日记：${instruction.trim()}\n\n原文：\n${content}`
    : `请对以下旅行日记进行语法修正和文笔润色，使其更加生动流畅：\n\n${content}`;

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

export default router;
