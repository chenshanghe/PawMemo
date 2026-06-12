import { Router } from "express";
import { setPrivateCache } from "../lib/cache";
import { preWarmOwnerAcl } from "./storage";
import { db } from "@workspace/db";
import {
  diaryEntriesTable,
  tagsTable,
  entryTagsTable,
  photosTable,
  entryCollaboratorsTable,
} from "@workspace/db";
import { eq, sql, and, count } from "drizzle-orm";
import {
  ListEntriesQueryParams,
  CreateEntryBody,
  GetEntryParams,
  UpdateEntryBody,
  UpdateEntryParams,
  DeleteEntryParams,
  ListEntryPhotosParams,
  AddEntryPhotoBody,
  AddEntryPhotoParams,
} from "@workspace/api-zod";
import { requireAuth, AuthedRequest } from "../middlewares/auth";
import { getUserTier } from "../lib/tiers";

const router = Router();

router.use(requireAuth);

async function getEntryTags(entryId: number) {
  const rows = await db
    .select({ id: tagsTable.id, name: tagsTable.name })
    .from(entryTagsTable)
    .innerJoin(tagsTable, eq(entryTagsTable.tagId, tagsTable.id))
    .where(eq(entryTagsTable.entryId, entryId));
  return rows;
}

async function getEntryPhotoCount(entryId: number) {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(photosTable)
    .where(eq(photosTable.entryId, entryId));
  return row?.count ?? 0;
}

async function upsertTags(tagNames: string[]): Promise<number[]> {
  if (!tagNames.length) return [];
  const ids: number[] = [];
  for (const name of tagNames) {
    const existing = await db
      .select()
      .from(tagsTable)
      .where(eq(tagsTable.name, name))
      .limit(1);
    if (existing.length > 0) {
      ids.push(existing[0].id);
    } else {
      const [created] = await db
        .insert(tagsTable)
        .values({ name })
        .returning();
      ids.push(created.id);
    }
  }
  return ids;
}

async function syncEntryTags(entryId: number, tagIds: number[]) {
  await db.delete(entryTagsTable).where(eq(entryTagsTable.entryId, entryId));
  if (tagIds.length) {
    await db.insert(entryTagsTable).values(
      tagIds.map((tagId) => ({ entryId, tagId }))
    );
  }
}

// GET /entries
router.get("/", async (req, res) => {
  const userId = (req as unknown as AuthedRequest).userId;
  const parsed = ListEntriesQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid query params" });
    return;
  }
  const { tag, destination, search, dateFrom, dateTo } = parsed.data;

  let entries = await db
    .select()
    .from(diaryEntriesTable)
    .where(eq(diaryEntriesTable.userId, userId))
    .orderBy(sql`${diaryEntriesTable.startDate} desc`);

  if (destination) {
    entries = entries.filter((e) =>
      e.destination.toLowerCase().includes(destination.toLowerCase())
    );
  }
  if (search) {
    entries = entries.filter(
      (e) =>
        e.title.toLowerCase().includes(search.toLowerCase()) ||
        (e.content ?? "").toLowerCase().includes(search.toLowerCase()) ||
        e.destination.toLowerCase().includes(search.toLowerCase())
    );
  }
  if (dateFrom) {
    entries = entries.filter((e) => e.startDate >= dateFrom);
  }
  if (dateTo) {
    entries = entries.filter((e) => e.startDate <= dateTo);
  }

  let filteredIds = entries.map((e) => e.id);

  if (tag) {
    const tagRows = await db
      .select({ entryId: entryTagsTable.entryId })
      .from(entryTagsTable)
      .innerJoin(tagsTable, eq(entryTagsTable.tagId, tagsTable.id))
      .where(eq(tagsTable.name, tag));
    const tagEntryIds = new Set(tagRows.map((r) => r.entryId));
    filteredIds = filteredIds.filter((id) => tagEntryIds.has(id));
  }

  const result = await Promise.all(
    filteredIds.map(async (id) => {
      const entry = entries.find((e) => e.id === id)!;
      const [tags, photoCount] = await Promise.all([
        getEntryTags(id),
        getEntryPhotoCount(id),
      ]);
      return { ...entry, tags, photoCount };
    })
  );

  setPrivateCache(res, 30);
  res.json(result);
});

// POST /entries
router.post("/", async (req, res) => {
  const userId = (req as unknown as AuthedRequest).userId;
  const parsed = CreateEntryBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid body", details: parsed.error });
    return;
  }
  const { tagIds = [], tagNames = [], ...data } = parsed.data;

  const { entryType, sourceEntryIds } = req.body ?? {};

  // Quota: entry count
  const { tier, limits } = await getUserTier(userId);
  if (limits.entries < 999999) {
    const [{ cnt }] = await db
      .select({ cnt: count() })
      .from(diaryEntriesTable)
      .where(eq(diaryEntriesTable.userId, userId));
    if (cnt >= limits.entries) {
      res.status(403).json({ code: "ENTRY_LIMIT", tier, limit: limits.entries });
      return;
    }
  }

  const entryInsert = {
    userId,
    title: data.title,
    destination: data.destination,
    content: data.content ?? null,
    coverImage: data.coverImage ?? null,
    mood: data.mood ?? null,
    companions: data.companions ?? null,
    visibility: data.visibility ?? "private",
    rating: data.rating ?? null,
    startDate: data.startDate instanceof Date ? data.startDate.toISOString().split("T")[0] : data.startDate,
    endDate: data.endDate instanceof Date ? data.endDate.toISOString().split("T")[0] : (data.endDate ?? null),
    entryType: typeof entryType === "string" ? entryType : "note",
    sourceEntryIds: (Array.isArray(sourceEntryIds) ? sourceEntryIds : null) as number[] | null,
    lat: typeof data.lat === "number" ? data.lat : null,
    lng: typeof data.lng === "number" ? data.lng : null,
    weather: (data.weather ?? null) as Record<string, unknown> | null,
    videoUrl: typeof data.videoUrl === "string" ? data.videoUrl : null,
  };
  const [entry] = await db
    .insert(diaryEntriesTable)
    .values(entryInsert)
    .returning();

  const nameIds = await upsertTags(tagNames);
  const allTagIds = [...new Set([...tagIds, ...nameIds])];
  await syncEntryTags(entry.id, allTagIds);

  const tags = await getEntryTags(entry.id);
  res.status(201).json({ ...entry, tags, photoCount: 0 });
});

// GET /entries/:id
router.get("/:id", async (req, res) => {
  const userId = (req as unknown as AuthedRequest).userId;
  const parsed = GetEntryParams.safeParse({ id: Number(req.params.id) });
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const { id } = parsed.data;
  let [entry] = await db
    .select()
    .from(diaryEntriesTable)
    .where(and(eq(diaryEntriesTable.id, id), eq(diaryEntriesTable.userId, userId)));
  if (!entry) {
    const [collab] = await db.select().from(entryCollaboratorsTable)
      .where(and(
        eq(entryCollaboratorsTable.entryId, id),
        eq(entryCollaboratorsTable.userId, userId),
        eq(entryCollaboratorsTable.status, "accepted"),
      ));
    if (!collab) { res.status(404).json({ error: "Not found" }); return; }
    [entry] = await db.select().from(diaryEntriesTable).where(eq(diaryEntriesTable.id, id));
  }
  if (!entry) { res.status(404).json({ error: "Not found" }); return; }
  const [tags, photos] = await Promise.all([
    getEntryTags(id),
    db.select().from(photosTable).where(eq(photosTable.entryId, id)).orderBy(photosTable.createdAt, photosTable.id),
  ]);
  res.json({ ...entry, tags, photos });
});

// PATCH /entries/:id
router.patch("/:id", async (req, res) => {
  const userId = (req as unknown as AuthedRequest).userId;
  const paramsParsed = UpdateEntryParams.safeParse({ id: Number(req.params.id) });
  if (!paramsParsed.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const bodyParsed = UpdateEntryBody.safeParse(req.body);
  if (!bodyParsed.success) {
    res.status(400).json({ error: "Invalid body" });
    return;
  }
  const { id } = paramsParsed.data;
  const { tagIds, tagNames = [], ...data } = bodyParsed.data;

  const updateData: Record<string, unknown> = { updatedAt: new Date() };
  if (data.title !== undefined) updateData.title = data.title;
  if (data.destination !== undefined) updateData.destination = data.destination;
  if (data.content !== undefined) updateData.content = data.content;
  if (data.coverImage !== undefined) updateData.coverImage = data.coverImage;
  if (data.mood !== undefined) updateData.mood = data.mood;
  if (data.rating !== undefined) updateData.rating = data.rating;
  if (data.companions !== undefined) updateData.companions = data.companions;
  if (data.visibility !== undefined) updateData.visibility = data.visibility;
  if (data.startDate !== undefined) updateData.startDate = data.startDate;
  if (data.endDate !== undefined) updateData.endDate = data.endDate;
  if (data.lat !== undefined) updateData.lat = data.lat;
  if (data.lng !== undefined) updateData.lng = data.lng;
  if (data.weather !== undefined) updateData.weather = data.weather;
  if (data.videoUrl !== undefined) updateData.videoUrl = data.videoUrl;

  let [entry] = await db
    .update(diaryEntriesTable)
    .set(updateData)
    .where(and(eq(diaryEntriesTable.id, id), eq(diaryEntriesTable.userId, userId)))
    .returning();
  if (!entry) {
    const [collab] = await db.select().from(entryCollaboratorsTable)
      .where(and(
        eq(entryCollaboratorsTable.entryId, id),
        eq(entryCollaboratorsTable.userId, userId),
        eq(entryCollaboratorsTable.status, "accepted"),
      ));
    if (!collab) { res.status(404).json({ error: "Not found" }); return; }
    [entry] = await db.update(diaryEntriesTable).set(updateData)
      .where(eq(diaryEntriesTable.id, id)).returning();
  }
  if (!entry) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  if (tagIds !== undefined || tagNames.length > 0) {
    const nameIds = await upsertTags(tagNames);
    const allTagIds = [...new Set([...(tagIds ?? []), ...nameIds])];
    await syncEntryTags(id, allTagIds);
  }

  const [tags, photoCount] = await Promise.all([
    getEntryTags(id),
    getEntryPhotoCount(id),
  ]);
  res.json({ ...entry, tags, photoCount });
});

// DELETE /entries/:id
router.delete("/:id", async (req, res) => {
  const userId = (req as unknown as AuthedRequest).userId;
  const parsed = DeleteEntryParams.safeParse({ id: Number(req.params.id) });
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  await db
    .delete(diaryEntriesTable)
    .where(and(eq(diaryEntriesTable.id, parsed.data.id), eq(diaryEntriesTable.userId, userId)));
  res.status(204).send();
});

// GET /entries/:id/photos
router.get("/:id/photos", async (req, res) => {
  const userId = (req as unknown as AuthedRequest).userId;
  const parsed = ListEntryPhotosParams.safeParse({ id: Number(req.params.id) });
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const [entry] = await db
    .select()
    .from(diaryEntriesTable)
    .where(and(eq(diaryEntriesTable.id, parsed.data.id), eq(diaryEntriesTable.userId, userId)));
  if (!entry) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  const photos = await db
    .select()
    .from(photosTable)
    .where(eq(photosTable.entryId, parsed.data.id))
    .orderBy(photosTable.createdAt, photosTable.id);
  res.json(photos);
});

// POST /entries/:id/photos
router.post("/:id/photos", async (req, res) => {
  const userId = (req as unknown as AuthedRequest).userId;
  const paramsParsed = AddEntryPhotoParams.safeParse({ id: Number(req.params.id) });
  if (!paramsParsed.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const bodyParsed = AddEntryPhotoBody.safeParse(req.body);
  if (!bodyParsed.success) {
    res.status(400).json({ error: "Invalid body" });
    return;
  }
  const [entry] = await db
    .select()
    .from(diaryEntriesTable)
    .where(and(eq(diaryEntriesTable.id, paramsParsed.data.id), eq(diaryEntriesTable.userId, userId)));
  if (!entry) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  // Quota: photos per entry
  const { tier: pTier, limits: pLimits } = await getUserTier(userId);
  const [{ cnt: existingCount }] = await db
    .select({ cnt: count() })
    .from(photosTable)
    .where(eq(photosTable.entryId, paramsParsed.data.id));
  if (existingCount >= pLimits.photosPerEntry) {
    res.status(403).json({ code: "PHOTO_LIMIT", tier: pTier, limit: pLimits.photosPerEntry });
    return;
  }
  const [photo] = await db
    .insert(photosTable)
    .values({
      entryId: paramsParsed.data.id,
      url: bodyParsed.data.url,
      caption: bodyParsed.data.caption ?? null,
    })
    .returning();
  res.status(201).json(photo);
});

// POST /entries/:id/photos/batch
// Accepts { photos: [{url, caption?}][] } OR legacy { urls: string[] }
router.post("/:id/photos/batch", async (req, res) => {
  const userId = (req as unknown as AuthedRequest).userId;
  const paramsParsed = AddEntryPhotoParams.safeParse({ id: Number(req.params.id) });
  if (!paramsParsed.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  // Support both formats
  const body = req.body as { photos?: unknown; urls?: unknown } | null;
  let photoRows: { url: string; caption?: string | null }[] = [];

  if (Array.isArray(body?.photos) && body.photos.length > 0) {
    // New format: { photos: [{url, caption?}] }
    if (
      body.photos.length > 30 ||
      !body.photos.every((p: any) => typeof p?.url === "string" && p.url.length > 0)
    ) {
      res.status(400).json({ error: "Invalid body" });
      return;
    }
    photoRows = (body.photos as any[]).map((p) => ({ url: p.url, caption: p.caption ?? null }));
  } else if (Array.isArray(body?.urls) && body.urls.length > 0) {
    // Legacy format: { urls: string[] }
    if (
      body.urls.length > 30 ||
      !body.urls.every((u: any) => typeof u === "string" && u.length > 0)
    ) {
      res.status(400).json({ error: "Invalid body" });
      return;
    }
    photoRows = (body.urls as string[]).map((url) => ({ url, caption: null }));
  } else {
    res.status(400).json({ error: "Invalid body" });
    return;
  }

  const [entry] = await db
    .select()
    .from(diaryEntriesTable)
    .where(and(eq(diaryEntriesTable.id, paramsParsed.data.id), eq(diaryEntriesTable.userId, userId)));
  if (!entry) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  // Quota: photos per entry
  const { tier: bTier, limits: bLimits } = await getUserTier(userId);
  const [{ cnt: bExisting }] = await db
    .select({ cnt: count() })
    .from(photosTable)
    .where(eq(photosTable.entryId, paramsParsed.data.id));
  if (bExisting + photoRows.length > bLimits.photosPerEntry) {
    res.status(403).json({ code: "PHOTO_LIMIT", tier: bTier, limit: bLimits.photosPerEntry, current: bExisting });
    return;
  }
  const photos = await db
    .insert(photosTable)
    .values(
      photoRows.map((p) => ({
        entryId: paramsParsed.data.id,
        url: p.url,
        caption: p.caption ?? null,
      })),
    )
    .returning();
  // Pre-warm the ACL cache so the owner's first image load skips the DB queries.
  for (const photo of photos) {
    preWarmOwnerAcl(photo.url, userId);
  }
  res.status(201).json({ photos });
});

export default router;
