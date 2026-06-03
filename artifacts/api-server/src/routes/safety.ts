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
} from "@workspace/db";
import { eq, and, or } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";

const router = Router();

// POST /api/users/:userId/block — toggle block; also unfollow on block
router.post("/users/:userId/block", requireAuth, async (req, res) => {
  const blockerId = (req as any).userId as string;
  const blockedId = req.params.userId;

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
  const targetId = req.params.userId;
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
