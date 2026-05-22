import { Router } from "express";
import { db } from "@workspace/db";
import { diaryEntriesTable, photosTable } from "@workspace/db";
import { sql } from "drizzle-orm";

const router = Router();

// GET /stats/summary
router.get("/summary", async (_req, res) => {
  const [entryStats] = await db
    .select({
      totalEntries: sql<number>`count(*)::int`,
      totalDestinations: sql<number>`count(distinct ${diaryEntriesTable.destination})::int`,
    })
    .from(diaryEntriesTable);

  const [photoStats] = await db
    .select({ totalPhotos: sql<number>`count(*)::int` })
    .from(photosTable);

  // Sum travel days from all entries
  const travelDaysRows = await db
    .select({
      startDate: diaryEntriesTable.startDate,
      endDate: diaryEntriesTable.endDate,
    })
    .from(diaryEntriesTable);

  let totalTravelDays = 0;
  for (const row of travelDaysRows) {
    if (row.endDate) {
      const start = new Date(row.startDate);
      const end = new Date(row.endDate);
      const diff = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1);
      totalTravelDays += diff;
    } else {
      totalTravelDays += 1;
    }
  }

  res.json({
    totalEntries: entryStats?.totalEntries ?? 0,
    totalDestinations: entryStats?.totalDestinations ?? 0,
    totalPhotos: photoStats?.totalPhotos ?? 0,
    totalTravelDays,
  });
});

// GET /stats/recent
router.get("/recent", async (_req, res) => {
  const entries = await db
    .select()
    .from(diaryEntriesTable)
    .orderBy(sql`${diaryEntriesTable.createdAt} desc`)
    .limit(5);

  const { tagsTable, entryTagsTable, photosTable: pt } = await import("@workspace/db");
  const { eq } = await import("drizzle-orm");

  const result = await Promise.all(
    entries.map(async (entry) => {
      const tags = await db
        .select({ id: tagsTable.id, name: tagsTable.name })
        .from(entryTagsTable)
        .innerJoin(tagsTable, eq(entryTagsTable.tagId, tagsTable.id))
        .where(eq(entryTagsTable.entryId, entry.id));
      const [{ count }] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(pt)
        .where(eq(pt.entryId, entry.id));
      return { ...entry, tags, photoCount: count };
    })
  );
  res.json(result);
});

// GET /stats/destinations
router.get("/destinations", async (_req, res) => {
  const rows = await db
    .select({
      destination: diaryEntriesTable.destination,
      count: sql<number>`count(*)::int`,
    })
    .from(diaryEntriesTable)
    .groupBy(diaryEntriesTable.destination)
    .orderBy(sql`count(*) desc`);
  res.json(rows);
});

export default router;
