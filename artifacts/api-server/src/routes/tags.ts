import { Router } from "express";
import { db } from "@workspace/db";
import { tagsTable, entryTagsTable, diaryEntriesTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { setPrivateCache } from "../lib/cache";

const router = Router();

// GET /tags — all tags sorted by name
router.get("/", async (_req, res) => {
  const tags = await db.select().from(tagsTable).orderBy(tagsTable.name);
  setPrivateCache(res, 300);
  res.json(tags);
});

// GET /tags/popular — tags used in public entries, sorted by usage count
router.get("/popular", async (_req, res) => {
  const rows = await db
    .select({
      id: tagsTable.id,
      name: tagsTable.name,
      count: sql<number>`count(*)::int`,
    })
    .from(entryTagsTable)
    .innerJoin(tagsTable, eq(entryTagsTable.tagId, tagsTable.id))
    .innerJoin(diaryEntriesTable, eq(entryTagsTable.entryId, diaryEntriesTable.id))
    .where(eq(diaryEntriesTable.visibility, "public"))
    .groupBy(tagsTable.id, tagsTable.name)
    .orderBy(sql`count(*) desc`)
    .limit(20);
  setPrivateCache(res, 300);
  res.json(rows);
});

export default router;
