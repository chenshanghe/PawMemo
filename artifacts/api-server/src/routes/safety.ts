import { Router } from "express";
import { db } from "@workspace/db";
import {
  userBlocksTable,
  contentReportsTable,
  userProfilesTable,
  diaryEntriesTable,
  entryFavoritesTable,
  userFollowsTable,
  notificationsTable,
  entryLikesTable,
  entryCommentsTable,
  photosTable,
} from "@workspace/db";
import { eq, and, or, count, inArray } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";

const router = Router();

// POST /api/users/:userId/block — toggle block; also unfollow on block
router.post("/users/:userId/block", requireAuth, async (req, res) => {
  const blockerId = (req as any).userId as string;
  const blockedId = req.params.userId as string;

  if (blockerId === blockedId) {
    res.status(400).json({ error: "Cannot block yourself" });
    return;
  }

  const [existing] = await db
    .select()
    .from(userBlocksTable)
    .where(and(eq(userBlocksTable.blockerId, blockerId), eq(userBlocksTable.blockedId, blockedId)));

  if (existing) {
    await db
      .delete(userBlocksTable)
      .where(and(eq(userBlocksTable.blockerId, blockerId), eq(userBlocksTable.blockedId, blockedId)));
    res.json({ blocked: false });
  } else {
    // Unfollow in both directions when blocking
    await db
      .delete(userFollowsTable)
      .where(
        or(
          and(eq(userFollowsTable.followerId, blockerId), eq(userFollowsTable.followeeId, blockedId)),
          and(eq(userFollowsTable.followerId, blockedId), eq(userFollowsTable.followeeId, blockerId)),
        ),
      );
    await db.insert(userBlocksTable).values({ blockerId, blockedId });
    res.json({ blocked: true });
  }
});

// GET /api/users/:userId/block-status
router.get("/users/:userId/block-status", requireAuth, async (req, res) => {
  const viewerId = (req as any).userId as string;
  const targetId = req.params.userId as string;
  const [row] = await db
    .select()
    .from(userBlocksTable)
    .where(and(eq(userBlocksTable.blockerId, viewerId), eq(userBlocksTable.blockedId, targetId)));
  res.json({ blocked: !!row });
});

// GET /api/me/blocked — list users this viewer has blocked
router.get("/me/blocked", requireAuth, async (req, res) => {
  const userId = (req as any).userId as string;
  const rows = await db
    .select({ blockedId: userBlocksTable.blockedId, createdAt: userBlocksTable.createdAt })
    .from(userBlocksTable)
    .where(eq(userBlocksTable.blockerId, userId));
  res.json(rows);
});

// POST /api/reports — submit a content report
router.post("/reports", requireAuth, async (req, res) => {
  const reporterId = (req as any).userId as string;
  const { targetType, targetId, reason, details } = req.body ?? {};

  if (!targetType || !targetId || !reason) {
    res.status(400).json({ error: "Missing required fields" });
    return;
  }
  if (!["entry", "comment", "user"].includes(targetType)) {
    res.status(400).json({ error: "Invalid targetType" });
    return;
  }
  if (!["spam", "inappropriate", "harassment", "misinformation", "other"].includes(reason)) {
    res.status(400).json({ error: "Invalid reason" });
    return;
  }

  await db.insert(contentReportsTable).values({
    reporterId,
    targetType,
    targetId: String(targetId),
    reason,
    details: typeof details === "string" ? details.slice(0, 500) : null,
  });

  res.json({ ok: true });
});

// GET /api/me/export/summary — return counts for the export preview dialog
router.get("/me/export/summary", requireAuth, async (req, res) => {
  const userId = (req as any).userId as string;

  const [profile] = await db
    .select()
    .from(userProfilesTable)
    .where(eq(userProfilesTable.userId, userId));

  const [{ entryCount }] = await db
    .select({ entryCount: count() })
    .from(diaryEntriesTable)
    .where(eq(diaryEntriesTable.userId, userId));

  const userEntryIds = await db
    .select({ id: diaryEntriesTable.id })
    .from(diaryEntriesTable)
    .where(eq(diaryEntriesTable.userId, userId));

  let photoCount = 0;
  if (userEntryIds.length > 0) {
    const [{ photoCount: pc }] = await db
      .select({ photoCount: count() })
      .from(photosTable)
      .where(inArray(photosTable.entryId, userEntryIds.map((e) => e.id)));
    photoCount = pc;
  }

  const [{ favoriteCount }] = await db
    .select({ favoriteCount: count() })
    .from(entryFavoritesTable)
    .where(eq(entryFavoritesTable.userId, userId));

  res.json({
    entryCount,
    photoCount,
    favoriteCount,
    accountCreatedAt: profile?.updatedAt ?? null,
  });
});

// GET /api/me/export — export user data as JSON download
// Query param: include=entries&include=photos&include=favorites&include=profile
// If no include params given, all sections are included (backwards compat).
router.get("/me/export", requireAuth, async (req, res) => {
  const userId = (req as any).userId as string;

  const KNOWN_SECTIONS = new Set(["entries", "photos", "favorites", "profile"]);
  const rawInclude = req.query.include;
  const requested = rawInclude
    ? (Array.isArray(rawInclude) ? rawInclude : [rawInclude]).map(String).filter((s) => KNOWN_SECTIONS.has(s))
    : ["entries", "photos", "favorites", "profile"];
  const include = new Set(requested.length > 0 ? requested : ["entries", "photos", "favorites", "profile"]);

  const [profile] = include.has("profile")
    ? await db.select().from(userProfilesTable).where(eq(userProfilesTable.userId, userId))
    : [undefined];

  const entries = include.has("entries")
    ? await db.select().from(diaryEntriesTable).where(eq(diaryEntriesTable.userId, userId))
    : [];

  let photos: { id: number; entryId: number; url: string; caption: string | null; createdAt: Date }[] = [];
  if (include.has("photos")) {
    // Fetch entry IDs directly so photos work even when "entries" section is not selected
    const entryIds = include.has("entries")
      ? entries.map((e) => e.id)
      : (await db.select({ id: diaryEntriesTable.id }).from(diaryEntriesTable).where(eq(diaryEntriesTable.userId, userId))).map((e) => e.id);
    if (entryIds.length > 0) {
      photos = await db.select().from(photosTable).where(inArray(photosTable.entryId, entryIds));
    }
  }

  const favorites = include.has("favorites")
    ? await db
        .select({ entryId: entryFavoritesTable.entryId })
        .from(entryFavoritesTable)
        .where(eq(entryFavoritesTable.userId, userId))
    : [];

  const exportData: Record<string, unknown> = {
    exportedAt: new Date().toISOString(),
    sections: Array.from(include),
  };
  if (include.has("profile")) exportData.profile = profile ?? null;
  if (include.has("entries")) exportData.entries = entries;
  if (include.has("photos")) exportData.photos = photos;
  if (include.has("favorites")) exportData.favorites = favorites.map((f) => f.entryId);

  const filename = `hongshu-export-${new Date().toISOString().slice(0, 10)}.json`;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.json(exportData);
});

// DELETE /api/me/account — delete all user data (irreversible)
// Clears entries, follows, favorites, blocks, notifications, then anonymizes profile.
// The Clerk account itself is NOT deleted here (user must also delete from Clerk).
router.delete("/me/account", requireAuth, async (req, res) => {
  const userId = (req as any).userId as string;

  // Delete entries (cascades to photos, tags, likes, comments, favorites via FK)
  await db.delete(diaryEntriesTable).where(eq(diaryEntriesTable.userId, userId));

  // Delete social graph rows
  await db
    .delete(userFollowsTable)
    .where(or(eq(userFollowsTable.followerId, userId), eq(userFollowsTable.followeeId, userId)));
  await db.delete(entryFavoritesTable).where(eq(entryFavoritesTable.userId, userId));
  await db
    .delete(userBlocksTable)
    .where(or(eq(userBlocksTable.blockerId, userId), eq(userBlocksTable.blockedId, userId)));
  await db.delete(notificationsTable).where(eq(notificationsTable.userId, userId));

  // Anonymize profile (keep row so foreign key refs don't break)
  await db
    .update(userProfilesTable)
    .set({ name: "已注销用户", avatar: null, bio: null, email: null })
    .where(eq(userProfilesTable.userId, userId));

  res.json({ ok: true });
});

export default router;
