import { Router } from "express";
import { getAuth } from "@clerk/express";
import { db } from "@workspace/db";
import { feedbackTable } from "@workspace/db/schema";

const router = Router();

router.post("/feedback", async (req, res) => {
  const { userId } = getAuth(req);
  const { type, content } = req.body ?? {};

  if (!content || typeof content !== "string" || !content.trim()) {
    res.status(400).json({ error: "内容不能为空" });
    return;
  }
  if (content.trim().length > 500) {
    res.status(400).json({ error: "内容过长" });
    return;
  }

  const validTypes = ["bug", "suggestion", "praise", "other"];
  const safeType = validTypes.includes(type) ? type : "other";

  try {
    await db.insert(feedbackTable).values({
      userId: userId ?? null,
      type: safeType,
      content: content.trim(),
    });
    res.json({ ok: true });
  } catch (err: any) {
    console.error("[feedback/post] error:", err);
    res.status(500).json({ error: "提交失败，请重试" });
  }
});

export default router;
