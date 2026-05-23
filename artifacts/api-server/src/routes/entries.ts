import { Router } from "express";
import { db } from "@workspace/db";
import {
  diaryEntriesTable,
  tagsTable,
  entryTagsTable,
  photosTable,
} from "@workspace/db";
import { eq, sql, and } from "drizzle-orm";
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
  const userId = (req as AuthedRequest).userId;
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

  res.json(result);
});

// POST /entries
router.post("/", async (req, res) => {
  const userId = (req as AuthedRequest).userId;
  const parsed = CreateEntryBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid body", details: parsed.error });
    return;
  }
  const { tagIds = [], tagNames = [], ...data } = parsed.data;

  const [entry] = await db
    .insert(diaryEntriesTable)
    .values({
      userId,
      title: data.title,
      destination: data.destination,
      content: data.content ?? null,
      coverImage: data.coverImage ?? null,
      mood: data.mood ?? null,
      companions: data.companions ?? null,
      visibility: data.visibility ?? "private",
      rating: data.rating ?? null,
      startDate: data.startDate,
      endDate: data.endDate ?? null,
    })
    .returning();

  const nameIds = await upsertTags(tagNames);
  const allTagIds = [...new Set([...tagIds, ...nameIds])];
  await syncEntryTags(entry.id, allTagIds);

  const tags = await getEntryTags(entry.id);
  res.status(201).json({ ...entry, tags, photoCount: 0 });
});

// GET /entries/:id
router.get("/:id", async (req, res) => {
  const userId = (req as AuthedRequest).userId;
  const parsed = GetEntryParams.safeParse({ id: Number(req.params.id) });
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const { id } = parsed.data;
  const [entry] = await db
    .select()
    .from(diaryEntriesTable)
    .where(and(eq(diaryEntriesTable.id, id), eq(diaryEntriesTable.userId, userId)));
  if (!entry) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  const [tags, photos] = await Promise.all([
    getEntryTags(id),
    db.select().from(photosTable).where(eq(photosTable.entryId, id)).orderBy(photosTable.createdAt),
  ]);
  res.json({ ...entry, tags, photos });
});

// PATCH /entries/:id
router.patch("/:id", async (req, res) => {
  const userId = (req as AuthedRequest).userId;
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

  const [entry] = await db
    .update(diaryEntriesTable)
    .set(updateData)
    .where(and(eq(diaryEntriesTable.id, id), eq(diaryEntriesTable.userId, userId)))
    .returning();
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
  const userId = (req as AuthedRequest).userId;
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
  const userId = (req as AuthedRequest).userId;
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
    .orderBy(photosTable.createdAt);
  res.json(photos);
});

// POST /entries/:id/photos
router.post("/:id/photos", async (req, res) => {
  const userId = (req as AuthedRequest).userId;
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

export default router;
