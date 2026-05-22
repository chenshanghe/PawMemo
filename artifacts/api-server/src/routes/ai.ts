import { Router } from "express";
import OpenAI from "openai";
import { requireAuth } from "../middlewares/auth";

const router = Router();
router.use(requireAuth);

const deepseek = new OpenAI({
  baseURL: "https://api.deepseek.com",
  apiKey: process.env.DEEPSEEK_API_KEY,
});

// POST /ai/enhance
router.post("/enhance", async (req, res) => {
  const { content, instruction } = req.body as {
    content: string;
    instruction?: string;
  };

  if (!content || typeof content !== "string" || content.trim().length === 0) {
    res.status(400).json({ error: "content 不能为空" });
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
