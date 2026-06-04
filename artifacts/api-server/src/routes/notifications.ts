import { Router } from "express";
import { db } from "@workspace/db";
import { notificationsTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { requireAuth, AuthedRequest } from "../middlewares/auth";

const router = Router();

// GET /notifications — list latest 50 for current user
router.get("/notifications", requireAuth, async (req, res) => {
  const userId = (req as unknown as AuthedRequest).userId;
  const rows = await db
    .select()
    .from(notificationsTable)
    .where(eq(notificationsTable.userId, userId))
    .orderBy(desc(notificationsTable.createdAt))
    .limit(50);
  res.json(rows);
});

// GET /notifications/unread-count
router.get("/notifications/unread-count", requireAuth, async (req, res) => {
  const userId = (req as unknown as AuthedRequest).userId;
  const rows = await db
    .select()
    .from(notificationsTable)
    .where(and(eq(notificationsTable.userId, userId), eq(notificationsTable.read, false)));
  res.json({ count: rows.length });
});

// PATCH /notifications/:id/read — mark one read
router.patch("/notifications/:id/read", requireAuth, async (req, res) => {
  const userId = (req as unknown as AuthedRequest).userId;
  const id = Number(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  await db
    .update(notificationsTable)
    .set({ read: true })
    .where(and(eq(notificationsTable.id, id), eq(notificationsTable.userId, userId)));
  res.json({ ok: true });
});

// POST /notifications/read-all — mark all read
router.post("/notifications/read-all", requireAuth, async (req, res) => {
  const userId = (req as unknown as AuthedRequest).userId;
  await db
    .update(notificationsTable)
    .set({ read: true })
    .where(eq(notificationsTable.userId, userId));
  res.json({ ok: true });
});

export default router;
