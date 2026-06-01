import { Router } from "express";
import { db } from "@workspace/db";
import { diaryEntriesTable, photosTable, entryTagsTable, tagsTable } from "@workspace/db";
import { sql, eq, and } from "drizzle-orm";
import { requireAuth, AuthedRequest } from "../middlewares/auth";

const router = Router();

router.use(requireAuth);

// GET /stats/summary
router.get("/summary", async (req, res) => {
  const userId = (req as AuthedRequest).userId;

  const [entryStats] = await db
    .select({
      totalEntries: sql<number>`count(*)::int`,
      totalDestinations: sql<number>`count(distinct ${diaryEntriesTable.destination})::int`,
      avgRating: sql<number | null>`round(avg(${diaryEntriesTable.rating})::numeric,1)::float`,
    })
    .from(diaryEntriesTable)
    .where(eq(diaryEntriesTable.userId, userId));

  const photoStats = await db
    .select({ totalPhotos: sql<number>`count(*)::int` })
    .from(photosTable)
    .innerJoin(diaryEntriesTable, eq(photosTable.entryId, diaryEntriesTable.id))
    .where(eq(diaryEntriesTable.userId, userId));

  const travelDaysRows = await db
    .select({ startDate: diaryEntriesTable.startDate, endDate: diaryEntriesTable.endDate })
    .from(diaryEntriesTable)
    .where(eq(diaryEntriesTable.userId, userId));

  let totalTravelDays = 0;
  let longestTripDays = 0;
  for (const row of travelDaysRows) {
    let days = 1;
    if (row.endDate) {
      days = Math.max(1, Math.ceil((new Date(row.endDate).getTime() - new Date(row.startDate).getTime()) / 86400000) + 1);
    }
    totalTravelDays += days;
    if (days > longestTripDays) longestTripDays = days;
  }

  const moodRows = await db
    .select({ mood: diaryEntriesTable.mood, count: sql<number>`count(*)::int` })
    .from(diaryEntriesTable)
    .where(and(eq(diaryEntriesTable.userId, userId), sql`${diaryEntriesTable.mood} is not null`))
    .groupBy(diaryEntriesTable.mood)
    .orderBy(sql`count(*) desc`);

  const topDestRows = await db
    .select({ destination: diaryEntriesTable.destination, count: sql<number>`count(*)::int` })
    .from(diaryEntriesTable)
    .where(eq(diaryEntriesTable.userId, userId))
    .groupBy(diaryEntriesTable.destination)
    .orderBy(sql`count(*) desc`)
    .limit(5);

  res.json({
    totalEntries: entryStats?.totalEntries ?? 0,
    totalDestinations: entryStats?.totalDestinations ?? 0,
    totalPhotos: photoStats[0]?.totalPhotos ?? 0,
    totalTravelDays,
    longestTripDays,
    avgRating: entryStats?.avgRating ?? null,
    moodCounts: moodRows,
    topDestinations: topDestRows,
  });
});

// GET /stats/monthly — entry count per month for last 12 months (including zeros)
router.get("/monthly", async (req, res) => {
  const userId = (req as AuthedRequest).userId;

  const now = new Date();
  const months: string[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }

  const rows = await db
    .select({
      month: sql<string>`to_char(${diaryEntriesTable.startDate}, 'YYYY-MM')`,
      count: sql<number>`count(*)::int`,
    })
    .from(diaryEntriesTable)
    .where(and(
      eq(diaryEntriesTable.userId, userId),
      sql`${diaryEntriesTable.startDate} >= ${months[0] + "-01"}`,
    ))
    .groupBy(sql`to_char(${diaryEntriesTable.startDate}, 'YYYY-MM')`)
    .orderBy(sql`to_char(${diaryEntriesTable.startDate}, 'YYYY-MM')`);

  const countMap = new Map(rows.map((r) => [r.month, r.count]));
  res.json(months.map((m) => ({ month: m, count: countMap.get(m) ?? 0 })));
});

// GET /stats/recent
router.get("/recent", async (req, res) => {
  const userId = (req as AuthedRequest).userId;

  const entries = await db
    .select()
    .from(diaryEntriesTable)
    .where(eq(diaryEntriesTable.userId, userId))
    .orderBy(sql`${diaryEntriesTable.createdAt} desc`)
    .limit(5);

  const result = await Promise.all(
    entries.map(async (entry) => {
      const tags = await db
        .select({ id: tagsTable.id, name: tagsTable.name })
        .from(entryTagsTable)
        .innerJoin(tagsTable, eq(entryTagsTable.tagId, tagsTable.id))
        .where(eq(entryTagsTable.entryId, entry.id));
      const [{ count }] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(photosTable)
        .where(eq(photosTable.entryId, entry.id));
      return { ...entry, tags, photoCount: count };
    })
  );
  res.json(result);
});

// GET /stats/destinations
router.get("/destinations", async (req, res) => {
  const userId = (req as AuthedRequest).userId;

  const rows = await db
    .select({ destination: diaryEntriesTable.destination, count: sql<number>`count(*)::int` })
    .from(diaryEntriesTable)
    .where(eq(diaryEntriesTable.userId, userId))
    .groupBy(diaryEntriesTable.destination)
    .orderBy(sql`count(*) desc`);
  res.json(rows);
});

export default router;
