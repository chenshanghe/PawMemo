import { Router } from "express";
import OpenAI from "openai";
import { db } from "@workspace/db";
import {
  conversations,
  messages,
  diaryEntriesTable,
  photosTable,
} from "@workspace/db";
import { eq, and, desc, inArray } from "drizzle-orm";
import { requireAuth, AuthedRequest } from "../middlewares/auth";
import { getUserTier } from "../lib/tiers";

const router = Router();
router.use(requireAuth);

const deepseek = new OpenAI({
  baseURL: "https://api.deepseek.com",
  apiKey: process.env.DEEPSEEK_API_KEY,
});

async function requirePro(userId: string, res: any): Promise<boolean> {
  const { tier } = await getUserTier(userId);
  if (tier === "free") {
    res.status(403).json({ error: "CHAT_PRO_ONLY" });
    return false;
  }
  return true;
}

// GET /chat/conversations
router.get("/conversations", async (req, res) => {
  const userId = (req as unknown as AuthedRequest).userId;
  if (!await requirePro(userId, res)) return;
  const convs = await db
    .select()
    .from(conversations)
    .where(eq(conversations.userId, userId))
    .orderBy(desc(conversations.createdAt))
    .limit(10);
  res.json(convs);
});

// POST /chat/conversations
router.post("/conversations", async (req, res) => {
  const userId = (req as unknown as AuthedRequest).userId;
  if (!await requirePro(userId, res)) return;
  const [conv] = await db
    .insert(conversations)
    .values({ userId, title: "新对话" })
    .returning();
  res.json(conv);
});

// DELETE /chat/conversations/:id
router.delete("/conversations/:id", async (req, res) => {
  const userId = (req as unknown as AuthedRequest).userId;
  if (!await requirePro(userId, res)) return;
  const id = Number(req.params.id as string);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  await db
    .delete(conversations)
    .where(and(eq(conversations.id, id), eq(conversations.userId, userId)));
  res.status(204).send();
});

// PATCH /chat/conversations/:id
router.patch("/conversations/:id", async (req, res) => {
  const userId = (req as unknown as AuthedRequest).userId;
  if (!await requirePro(userId, res)) return;
  const id = Number(req.params.id as string);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const { title } = req.body ?? {};
  if (!title || typeof title !== "string") {
    res.status(400).json({ error: "title required" });
    return;
  }
  const [conv] = await db
    .update(conversations)
    .set({ title: title.slice(0, 50) })
    .where(and(eq(conversations.id, id), eq(conversations.userId, userId)))
    .returning();
  if (!conv) { res.status(404).json({ error: "Not found" }); return; }
  res.json(conv);
});

// GET /chat/conversations/:id/messages
router.get("/conversations/:id/messages", async (req, res) => {
  const userId = (req as unknown as AuthedRequest).userId;
  if (!await requirePro(userId, res)) return;
  const id = Number(req.params.id as string);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const [conv] = await db
    .select()
    .from(conversations)
    .where(and(eq(conversations.id, id), eq(conversations.userId, userId)));
  if (!conv) { res.status(404).json({ error: "Not found" }); return; }
  const msgs = await db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, id))
    .orderBy(messages.createdAt);
  res.json(msgs);
});

// DELETE /chat/conversations/:id/messages  (clear conversation)
router.delete("/conversations/:id/messages", async (req, res) => {
  const userId = (req as unknown as AuthedRequest).userId;
  if (!await requirePro(userId, res)) return;
  const id = Number(req.params.id as string);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const [conv] = await db
    .select()
    .from(conversations)
    .where(and(eq(conversations.id, id), eq(conversations.userId, userId)));
  if (!conv) { res.status(404).json({ error: "Not found" }); return; }
  await db.delete(messages).where(eq(messages.conversationId, id));
  res.status(204).send();
});

// POST /chat/tts  — text-to-speech (audio/wav)
router.post("/tts", async (req, res) => {
  const userId = (req as unknown as AuthedRequest).userId;
  if (!await requirePro(userId, res)) return;
  const { text } = req.body ?? {};
  if (!text || typeof text !== "string" || !text.trim()) {
    res.status(400).json({ error: "text required" });
    return;
  }
  const apiKey = process.env.AI_INTEGRATIONS_OPENAI_API_KEY;
  const baseURL = process.env.AI_INTEGRATIONS_OPENAI_BASE_URL;
  if (!apiKey || !baseURL) {
    res.status(503).json({ error: "TTS_NOT_CONFIGURED" });
    return;
  }
  try {
    const client = new OpenAI({ apiKey, baseURL });
    const response = await client.audio.speech.create({
      model: "tts-1",
      voice: "nova",
      input: text.slice(0, 2000),
      response_format: "wav",
    });
    const buffer = Buffer.from(await response.arrayBuffer());
    res.setHeader("Content-Type", "audio/wav");
    res.send(buffer);
  } catch (err: any) {
    res.status(500).json({ error: err.message ?? "TTS failed" });
  }
});

// POST /chat/conversations/:id/messages  (SSE streaming)
router.post("/conversations/:id/messages", async (req, res) => {
  const userId = (req as unknown as AuthedRequest).userId;
  if (!await requirePro(userId, res)) return;
  const convId = Number(req.params.id as string);
  if (isNaN(convId)) { res.status(400).json({ error: "Invalid id" }); return; }
  const { content } = req.body ?? {};
  if (!content || typeof content !== "string" || !content.trim()) {
    res.status(400).json({ error: "content required" });
    return;
  }

  const [conv] = await db
    .select()
    .from(conversations)
    .where(and(eq(conversations.id, convId), eq(conversations.userId, userId)));
  if (!conv) { res.status(404).json({ error: "Not found" }); return; }

  // Fetch history BEFORE inserting user message so:
  // 1) history.length === 0 correctly detects first turn (for auto-title)
  // 2) the current user message is appended once explicitly — no duplicate
  const [priorHistory, entries] = await Promise.all([
    db.select().from(messages).where(eq(messages.conversationId, convId)).orderBy(messages.createdAt),
    db
      .select({
        id: diaryEntriesTable.id,
        title: diaryEntriesTable.title,
        destination: diaryEntriesTable.destination,
        startDate: diaryEntriesTable.startDate,
        endDate: diaryEntriesTable.endDate,
        mood: diaryEntriesTable.mood,
        content: diaryEntriesTable.content,
      })
      .from(diaryEntriesTable)
      .where(eq(diaryEntriesTable.userId, userId))
      .orderBy(desc(diaryEntriesTable.startDate)),
  ]);
  const isFirstTurn = priorHistory.length === 0;

  await db.insert(messages).values({ conversationId: convId, role: "user", content: content.trim() });

  const entriesContext = entries.length === 0
    ? "（用户暂无日记）"
    : entries.map((e) => {
        const dateRange = e.endDate ? `${e.startDate} 至 ${e.endDate}` : (e.startDate ?? "");
        const preview = (e.content ?? "").slice(0, 500);
        return `[ID:${e.id}] 《${e.title}》 目的地:${e.destination} 日期:${dateRange}${e.mood ? ` 心情:${e.mood}` : ""}\n${preview}`;
      }).join("\n\n---\n\n");

  // Use prior history only (excludes current user message already captured via content param)
  const historyMsgs = priorHistory.slice(-18).map((m) => ({
    role: m.role as "user" | "assistant",
    content: m.content,
  }));

  const systemPrompt = `你是用户的私人旅行日记助手，熟悉他/她的所有旅行记录，帮助用户以对话方式检索和回忆旅程。
用户共有 ${entries.length} 篇旅行日记，内容如下（每篇格式：[ID:数字] 《标题》 目的地 日期 [心情]\\n正文前500字）：

${entriesContext}

回答要求：
- 用中文亲切自然地回答，像朋友聊天一样
- 直接回答问题，不要说"根据您的日记"之类的开场白
- 如果能找到相关日记，可以引用具体内容增加真实感
- 回答完正文之后，在最后单独起一行写：DIARY_IDS:[相关日记ID列表，用逗号分隔，无则为空]
  例如：DIARY_IDS:[3,7,12] 或 DIARY_IDS:[]
  这一行不要解释，用户不需要看到它`;

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  let fullText = "";
  let aborted = false;
  const abortController = new AbortController();

  req.on("close", () => {
    aborted = true;
    abortController.abort();
  });

  try {
    const stream = await deepseek.chat.completions.create(
      {
        model: "deepseek-chat",
        messages: [
          { role: "system", content: systemPrompt },
          ...historyMsgs,
          { role: "user", content: content.trim() },
        ],
        stream: true,
      },
      { signal: abortController.signal },
    );

    for await (const chunk of stream) {
      if (aborted) break;
      const text = chunk.choices[0]?.delta?.content;
      if (text) {
        fullText += text;
        res.write(`data: ${JSON.stringify({ text })}\n\n`);
      }
    }

    const idLineMatch = fullText.match(/DIARY_IDS:\[([^\]]*)\]/);
    const rawIds = idLineMatch?.[1] ?? "";
    const entryIds: number[] = rawIds
      ? rawIds.split(",").map((s) => parseInt(s.trim(), 10)).filter((n) => !isNaN(n))
      : [];

    const cleanText = fullText
      .replace(/\nDIARY_IDS:\[[^\]]*\]\s*$/, "")
      .replace(/DIARY_IDS:\[[^\]]*\]\s*$/, "")
      .trim();

    const validIds = entryIds.filter((id) => entries.some((e) => e.id === id)).slice(0, 5);

    type PhotoRow = { id: number; url: string; entryId: number; entryTitle: string };
    type EntryCard = { id: number; title: string; destination: string; startDate: string | null; endDate: string | null; coverUrl: string | null };

    let photoRows: PhotoRow[] = [];
    let entryCards: EntryCard[] = [];

    if (validIds.length > 0) {
      const rawPhotos = await db
        .select({ id: photosTable.id, url: photosTable.url, entryId: photosTable.entryId })
        .from(photosTable)
        .where(inArray(photosTable.entryId, validIds))
        .orderBy(photosTable.createdAt);

      const entryMap = Object.fromEntries(entries.map((e) => [e.id, e]));

      const coverByEntry: Record<number, string> = {};
      for (const p of rawPhotos) {
        if (!coverByEntry[p.entryId]) coverByEntry[p.entryId] = p.url;
      }

      photoRows = rawPhotos
        .slice(0, 5)
        .map((p) => ({ ...p, entryTitle: entryMap[p.entryId]?.title ?? "" }));

      entryCards = validIds.map((id) => {
        const e = entryMap[id];
        if (!e) return null;
        return {
          id: e.id,
          title: e.title,
          destination: e.destination,
          startDate: e.startDate ?? null,
          endDate: e.endDate ?? null,
          coverUrl: coverByEntry[id] ?? null,
        };
      }).filter(Boolean) as EntryCard[];
    }

    const meta = JSON.stringify({ entryIds: validIds, photos: photoRows, entryCards });

    if (!aborted) {
      await db.insert(messages).values({
        conversationId: convId,
        role: "assistant",
        content: cleanText,
        metadata: meta,
      });

      if (isFirstTurn) {
        try {
          const titleResp = await deepseek.chat.completions.create({
            model: "deepseek-chat",
            messages: [
              { role: "system", content: "请将下面这个问题压缩为8-12个汉字的对话标题，只输出标题文字，不加任何标点或说明。" },
              { role: "user", content: content.trim().slice(0, 100) },
            ],
            max_tokens: 20,
          });
          const autoTitle = titleResp.choices[0]?.message?.content?.trim() ?? "";
          if (autoTitle) {
            await db.update(conversations).set({ title: autoTitle.slice(0, 50) })
              .where(eq(conversations.id, convId));
          }
        } catch { /* non-critical */ }
      }
    }

    res.write(`data: ${JSON.stringify({ done: true, entryIds: validIds, photos: photoRows, entryCards })}\n\n`);
    res.end();
  } catch (err: any) {
    res.write(`data: ${JSON.stringify({ error: err.message ?? "AI 服务异常" })}\n\n`);
    res.end();
  }
});

export default router;
