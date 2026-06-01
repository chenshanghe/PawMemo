import { Router } from "express";
import { db } from "@workspace/db";
import { collectionsTable, collectionEntriesTable, diaryEntriesTable } from "@workspace/db";
import { eq, and, desc, inArray } from "drizzle-orm";
import { requireAuth, AuthedRequest } from "../middlewares/auth";

const router = Router();
router.use(requireAuth);

// GET /collections
router.get("/", async (req, res) => {
  const userId = (req as AuthedRequest).userId;
  try {
    const cols = await db
      .select()
      .from(collectionsTable)
      .where(eq(collectionsTable.userId, userId))
      .orderBy(desc(collectionsTable.updatedAt));

    const withCounts = await Promise.all(
      cols.map(async (c) => {
        const entries = await db
          .select({ entryId: collectionEntriesTable.entryId })
          .from(collectionEntriesTable)
          .where(eq(collectionEntriesTable.collectionId, c.id));
        return { ...c, entryCount: entries.length };
      })
    );
    res.json(withCounts);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /collections
router.post("/", async (req, res) => {
  const userId = (req as AuthedRequest).userId;
  const { title, description, visibility } = req.body ?? {};
  if (!title?.trim()) { res.status(400).json({ error: "title required" }); return; }
  try {
    const [col] = await db.insert(collectionsTable).values({
      userId,
      title: title.trim(),
      description: description?.trim() ?? null,
      visibility: visibility === "public" ? "public" : "private",
    }).returning();
    res.json(col);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /collections/:id
router.get("/:id", async (req, res) => {
  const userId = (req as AuthedRequest).userId;
  const id = Number(req.params.id);
  try {
    const [col] = await db.select().from(collectionsTable)
      .where(and(eq(collectionsTable.id, id), eq(collectionsTable.userId, userId)));
    if (!col) { res.status(404).json({ error: "not found" }); return; }

    const ceRows = await db
      .select()
      .from(collectionEntriesTable)
      .where(eq(collectionEntriesTable.collectionId, id))
      .orderBy(desc(collectionEntriesTable.addedAt));

    const entryIds = ceRows.map(r => r.entryId);
    const entries = entryIds.length
      ? await db.select({
          id: diaryEntriesTable.id,
          title: diaryEntriesTable.title,
          destination: diaryEntriesTable.destination,
          date: diaryEntriesTable.date,
          mood: diaryEntriesTable.mood,
          coverPhoto: diaryEntriesTable.coverPhoto,
        }).from(diaryEntriesTable).where(inArray(diaryEntriesTable.id, entryIds))
      : [];

    const ordered = ceRows.map(ce => entries.find(e => e.id === ce.entryId)).filter(Boolean);
    res.json({ ...col, entries: ordered });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /collections/:id
router.patch("/:id", async (req, res) => {
  const userId = (req as AuthedRequest).userId;
  const id = Number(req.params.id);
  const { title, description, visibility } = req.body ?? {};
  try {
    const [col] = await db.update(collectionsTable)
      .set({
        ...(title ? { title: title.trim() } : {}),
        ...(description !== undefined ? { description: description?.trim() ?? null } : {}),
        ...(visibility ? { visibility } : {}),
        updatedAt: new Date(),
      })
      .where(and(eq(collectionsTable.id, id), eq(collectionsTable.userId, userId)))
      .returning();
    if (!col) { res.status(404).json({ error: "not found" }); return; }
    res.json(col);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /collections/:id
router.delete("/:id", async (req, res) => {
  const userId = (req as AuthedRequest).userId;
  const id = Number(req.params.id);
  try {
    await db.delete(collectionEntriesTable).where(eq(collectionEntriesTable.collectionId, id));
    await db.delete(collectionsTable)
      .where(and(eq(collectionsTable.id, id), eq(collectionsTable.userId, userId)));
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /collections/:id/entries
router.post("/:id/entries", async (req, res) => {
  const userId = (req as AuthedRequest).userId;
  const collectionId = Number(req.params.id);
  const { entryId } = req.body ?? {};
  if (!entryId) { res.status(400).json({ error: "entryId required" }); return; }
  try {
    const [col] = await db.select().from(collectionsTable)
      .where(and(eq(collectionsTable.id, collectionId), eq(collectionsTable.userId, userId)));
    if (!col) { res.status(404).json({ error: "collection not found" }); return; }

    const existing = await db.select().from(collectionEntriesTable)
      .where(and(
        eq(collectionEntriesTable.collectionId, collectionId),
        eq(collectionEntriesTable.entryId, Number(entryId))
      ));
    if (existing.length) { res.json({ ok: true, already: true }); return; }

    const [ce] = await db.insert(collectionEntriesTable).values({
      collectionId,
      entryId: Number(entryId),
    }).returning();
    await db.update(collectionsTable).set({ updatedAt: new Date() })
      .where(eq(collectionsTable.id, collectionId));
    res.json(ce);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /collections/:id/entries/:entryId
router.delete("/:id/entries/:entryId", async (req, res) => {
  const userId = (req as AuthedRequest).userId;
  const collectionId = Number(req.params.id);
  const entryId = Number(req.params.entryId);
  try {
    const [col] = await db.select().from(collectionsTable)
      .where(and(eq(collectionsTable.id, collectionId), eq(collectionsTable.userId, userId)));
    if (!col) { res.status(404).json({ error: "not found" }); return; }
    await db.delete(collectionEntriesTable)
      .where(and(
        eq(collectionEntriesTable.collectionId, collectionId),
        eq(collectionEntriesTable.entryId, entryId)
      ));
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
