import { Router } from "express";
import { db } from "@workspace/db";
import {
  diaryEntriesTable,
  entrySharesTable,
  entryLikesTable,
  entryCommentsTable,
  photosTable,
  tagsTable,
  entryTagsTable,
  userProfilesTable,
  userFollowsTable,
  entryFavoritesTable,
} from "@workspace/db";
import { eq, sql, and, desc, inArray } from "drizzle-orm";
import { requireAuth, AuthedRequest } from "../middlewares/auth";
import { getAuth } from "@clerk/express";
import crypto from "crypto";

const router = Router();

// ── Helpers ─────────────────────────────────────────────────────────────────

function optionalAuth(req: any, _res: any, next: any) {
  const auth = getAuth(req);
  const userId = (auth?.sessionClaims?.userId as string) || auth?.userId;
  req.userId = userId ?? null;
  next();
}

async function getAuthorProfile(userId: string | null) {
  if (!userId) return null;
  const [p] = await db
    .select({ userId: userProfilesTable.userId, name: userProfilesTable.name, avatar: userProfilesTable.avatar })
    .from(userProfilesTable)
    .where(eq(userProfilesTable.userId, userId));
  return p ?? { userId, name: "旅行者", avatar: null };
}

async function isViewerFavorited(entryId: number, viewerUserId: string | null) {
  if (!viewerUserId) return false;
  const [row] = await db
    .select()
    .from(entryFavoritesTable)
    .where(and(eq(entryFavoritesTable.entryId, entryId), eq(entryFavoritesTable.userId, viewerUserId)));
  return !!row;
}

async function isViewerFollowing(authorId: string | null, viewerUserId: string | null) {
  if (!viewerUserId || !authorId || authorId === viewerUserId) return false;
  const [row] = await db
    .select()
    .from(userFollowsTable)
    .where(and(eq(userFollowsTable.followerId, viewerUserId), eq(userFollowsTable.followeeId, authorId)));
  return !!row;
}

async function getFullEntry(entryId: number) {
  const [entry] = await db
    .select()
    .from(diaryEntriesTable)
    .where(eq(diaryEntriesTable.id, entryId));
  if (!entry) return null;

  const tags = await db
    .select({ id: tagsTable.id, name: tagsTable.name })
    .from(entryTagsTable)
    .innerJoin(tagsTable, eq(entryTagsTable.tagId, tagsTable.id))
    .where(eq(entryTagsTable.entryId, entryId));

  const photos = await db
    .select()
    .from(photosTable)
    .where(eq(photosTable.entryId, entryId));

  return { ...entry, tags, photos };
}

// ── Share endpoints ──────────────────────────────────────────────────────────

// POST /api/entries/:id/share  — create or return existing share token
router.post("/entries/:id/share", requireAuth, async (req, res) => {
  const entryId = Number(req.params.id);
  const userId = (req as AuthedRequest).userId;
  if (isNaN(entryId)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [entry] = await db
    .select()
    .from(diaryEntriesTable)
    .where(and(eq(diaryEntriesTable.id, entryId), eq(diaryEntriesTable.userId, userId)));
  if (!entry) { res.status(404).json({ error: "Not found" }); return; }

  const existing = await db
    .select()
    .from(entrySharesTable)
    .where(eq(entrySharesTable.entryId, entryId));

  if (existing.length > 0) {
    res.json({ token: existing[0].token });
    return;
  }

  const token = crypto.randomBytes(20).toString("hex");
  await db.insert(entrySharesTable).values({ entryId, token });
  res.json({ token });
});

// DELETE /api/entries/:id/share  — revoke share link
router.delete("/entries/:id/share", requireAuth, async (req, res) => {
  const entryId = Number(req.params.id);
  const userId = (req as AuthedRequest).userId;
  if (isNaN(entryId)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [entry] = await db
    .select()
    .from(diaryEntriesTable)
    .where(and(eq(diaryEntriesTable.id, entryId), eq(diaryEntriesTable.userId, userId)));
  if (!entry) { res.status(404).json({ error: "Not found" }); return; }

  await db.delete(entrySharesTable).where(eq(entrySharesTable.entryId, entryId));
  res.json({ ok: true });
});

// GET /api/share/:token  — public view (no auth required)
router.get("/share/:token", optionalAuth, async (req, res) => {
  const { token } = req.params;
  const [share] = await db
    .select()
    .from(entrySharesTable)
    .where(eq(entrySharesTable.token, token));
  if (!share) { res.status(404).json({ error: "Not found" }); return; }

  const entry = await getFullEntry(share.entryId);
  if (!entry) { res.status(404).json({ error: "Not found" }); return; }
  if (entry.visibility === "private") { res.status(403).json({ error: "此随记已设为私密" }); return; }

  const [likeCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(entryLikesTable)
    .where(eq(entryLikesTable.entryId, share.entryId));

  const comments = await db
    .select()
    .from(entryCommentsTable)
    .where(eq(entryCommentsTable.entryId, share.entryId))
    .orderBy(entryCommentsTable.createdAt);

  const viewerUserId: string | null = (req as any).userId;
  let viewerLiked = false;
  if (viewerUserId) {
    const [row] = await db
      .select()
      .from(entryLikesTable)
      .where(and(eq(entryLikesTable.entryId, share.entryId), eq(entryLikesTable.userId, viewerUserId)));
    viewerLiked = !!row;
  }

  const author = await getAuthorProfile(entry.userId ?? null);
  const viewerFavorited = await isViewerFavorited(share.entryId, viewerUserId);
  const viewerFollowing = await isViewerFollowing(entry.userId ?? null, viewerUserId);
  res.json({ entry, likeCount: likeCount?.count ?? 0, viewerLiked, comments, author, viewerFavorited, viewerFollowing });
});

// ── Likes ────────────────────────────────────────────────────────────────────

// GET /api/entries/:id/likes
router.get("/entries/:id/likes", optionalAuth, async (req, res) => {
  const entryId = Number(req.params.id);
  if (isNaN(entryId)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(entryLikesTable)
    .where(eq(entryLikesTable.entryId, entryId));

  const viewerUserId: string | null = (req as any).userId;
  let viewerLiked = false;
  if (viewerUserId) {
    const [like] = await db
      .select()
      .from(entryLikesTable)
      .where(and(eq(entryLikesTable.entryId, entryId), eq(entryLikesTable.userId, viewerUserId)));
    viewerLiked = !!like;
  }

  res.json({ count: row?.count ?? 0, viewerLiked });
});

// POST /api/entries/:id/likes — toggle like
router.post("/entries/:id/likes", requireAuth, async (req, res) => {
  const entryId = Number(req.params.id);
  const userId = (req as AuthedRequest).userId;
  if (isNaN(entryId)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [existing] = await db
    .select()
    .from(entryLikesTable)
    .where(and(eq(entryLikesTable.entryId, entryId), eq(entryLikesTable.userId, userId)));

  if (existing) {
    await db.delete(entryLikesTable).where(eq(entryLikesTable.id, existing.id));
  } else {
    await db.insert(entryLikesTable).values({ entryId, userId });
  }

  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(entryLikesTable)
    .where(eq(entryLikesTable.entryId, entryId));

  res.json({ count: row?.count ?? 0, viewerLiked: !existing });
});

// ── Comments ─────────────────────────────────────────────────────────────────

// GET /api/entries/:id/comments
router.get("/entries/:id/comments", optionalAuth, async (req, res) => {
  const entryId = Number(req.params.id);
  if (isNaN(entryId)) { res.status(400).json({ error: "Invalid id" }); return; }

  const comments = await db
    .select()
    .from(entryCommentsTable)
    .where(eq(entryCommentsTable.entryId, entryId))
    .orderBy(entryCommentsTable.createdAt);

  res.json(comments);
});

// POST /api/entries/:id/comments
router.post("/entries/:id/comments", requireAuth, async (req, res) => {
  const entryId = Number(req.params.id);
  const userId = (req as AuthedRequest).userId;
  if (isNaN(entryId)) { res.status(400).json({ error: "Invalid id" }); return; }

  const { content, userName, userAvatar } = req.body;
  if (!content?.trim()) { res.status(400).json({ error: "评论内容不能为空" }); return; }
  if (!userName?.trim()) { res.status(400).json({ error: "缺少用户名" }); return; }

  const [comment] = await db
    .insert(entryCommentsTable)
    .values({ entryId, userId, userName, userAvatar: userAvatar ?? null, content: content.trim() })
    .returning();

  res.status(201).json(comment);
});

// DELETE /api/comments/:commentId — only comment owner can delete
router.delete("/comments/:commentId", requireAuth, async (req, res) => {
  const commentId = Number(req.params.commentId);
  const userId = (req as AuthedRequest).userId;
  if (isNaN(commentId)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [comment] = await db
    .select()
    .from(entryCommentsTable)
    .where(eq(entryCommentsTable.id, commentId));

  if (!comment) { res.status(404).json({ error: "Not found" }); return; }
  if (comment.userId !== userId) { res.status(403).json({ error: "Forbidden" }); return; }

  await db.delete(entryCommentsTable).where(eq(entryCommentsTable.id, commentId));
  res.json({ ok: true });
});

// ── Public Square ─────────────────────────────────────────────────────────────

// GET /api/square — list all public entries with stats (no auth required)
router.get("/square", optionalAuth, async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(40, Number(req.query.limit) || 20);
  const offset = (page - 1) * limit;

  const baseEntries = await db
    .select()
    .from(diaryEntriesTable)
    .where(eq(diaryEntriesTable.visibility, "public"))
    .orderBy(sql`${diaryEntriesTable.createdAt} desc`)
    .limit(limit)
    .offset(offset);

  const viewerUserId: string | null = (req as any).userId;
  const result = await hydrateEntries(baseEntries, viewerUserId);

  const [{ total }] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(diaryEntriesTable)
    .where(eq(diaryEntriesTable.visibility, "public"));

  res.json({ entries: result, total, page, limit });
});

// GET /api/entries/:id/public — full public entry detail (no auth, visibility must be 'public')
router.get("/entries/:id/public", optionalAuth, async (req, res) => {
  const entryId = Number(req.params.id);
  if (isNaN(entryId)) { res.status(400).json({ error: "Invalid id" }); return; }

  const entry = await getFullEntry(entryId);
  if (!entry) { res.status(404).json({ error: "Not found" }); return; }
  if (entry.visibility !== "public") { res.status(403).json({ error: "此随记不是公开状态" }); return; }

  const [{ likeCount }] = await db
    .select({ likeCount: sql<number>`count(*)::int` })
    .from(entryLikesTable)
    .where(eq(entryLikesTable.entryId, entryId));

  const comments = await db
    .select()
    .from(entryCommentsTable)
    .where(eq(entryCommentsTable.entryId, entryId))
    .orderBy(entryCommentsTable.createdAt);

  const viewerUserId: string | null = (req as any).userId;
  let viewerLiked = false;
  if (viewerUserId) {
    const [row] = await db
      .select()
      .from(entryLikesTable)
      .where(and(eq(entryLikesTable.entryId, entryId), eq(entryLikesTable.userId, viewerUserId)));
    viewerLiked = !!row;
  }

  const author = await getAuthorProfile(entry.userId ?? null);
  const viewerFavorited = await isViewerFavorited(entryId, viewerUserId);
  const viewerFollowing = await isViewerFollowing(entry.userId ?? null, viewerUserId);
  res.json({ entry, likeCount: likeCount ?? 0, viewerLiked, comments, author, viewerFavorited, viewerFollowing });
});

// GET /api/entries/:id/share-status — check if share exists (for owner)
router.get("/entries/:id/share-status", requireAuth, async (req, res) => {
  const entryId = Number(req.params.id);
  const userId = (req as AuthedRequest).userId;
  if (isNaN(entryId)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [entry] = await db
    .select()
    .from(diaryEntriesTable)
    .where(and(eq(diaryEntriesTable.id, entryId), eq(diaryEntriesTable.userId, userId)));
  if (!entry) { res.status(404).json({ error: "Not found" }); return; }

  const [share] = await db
    .select()
    .from(entrySharesTable)
    .where(eq(entrySharesTable.entryId, entryId));

  res.json({ token: share?.token ?? null });
});

// ── User profile (sync from Clerk on client) ────────────────────────────────

// POST /api/me/profile  — upsert self profile. Client calls this on sign-in
// so we can render author name/avatar without hitting Clerk on every read.
router.post("/me/profile", requireAuth, async (req, res) => {
  const userId = (req as AuthedRequest).userId;
  const { name, avatar, bio } = req.body ?? {};
  if (typeof name !== "string" || !name.trim()) {
    res.status(400).json({ error: "name required" });
    return;
  }
  const trimmedAvatar = typeof avatar === "string" ? avatar : null;
  const trimmedBio = typeof bio === "string" ? bio : null;

  const [row] = await db
    .insert(userProfilesTable)
    .values({ userId, name: name.trim(), avatar: trimmedAvatar, bio: trimmedBio })
    .onConflictDoUpdate({
      target: userProfilesTable.userId,
      set: { name: name.trim(), avatar: trimmedAvatar, bio: trimmedBio, updatedAt: new Date() },
    })
    .returning();
  res.json(row);
});

// GET /api/me/profile  — returns own profile, or 404 if not yet synced.
router.get("/me/profile", requireAuth, async (req, res) => {
  const userId = (req as AuthedRequest).userId;
  const [row] = await db.select().from(userProfilesTable).where(eq(userProfilesTable.userId, userId));
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  res.json(row);
});

// GET /api/users/:userId  — public profile + counts + viewer relation
router.get("/users/:userId", optionalAuth, async (req, res) => {
  const { userId } = req.params;
  const viewerUserId: string | null = (req as any).userId;
  const profile = await getAuthorProfile(userId);
  if (!profile) { res.status(404).json({ error: "Not found" }); return; }

  const [[{ entryCount }], [{ followerCount }], [{ followingCount }]] = await Promise.all([
    db
      .select({ entryCount: sql<number>`count(*)::int` })
      .from(diaryEntriesTable)
      .where(and(eq(diaryEntriesTable.userId, userId), eq(diaryEntriesTable.visibility, "public"))),
    db
      .select({ followerCount: sql<number>`count(*)::int` })
      .from(userFollowsTable)
      .where(eq(userFollowsTable.followeeId, userId)),
    db
      .select({ followingCount: sql<number>`count(*)::int` })
      .from(userFollowsTable)
      .where(eq(userFollowsTable.followerId, userId)),
  ]);

  const viewerFollowing = await isViewerFollowing(userId, viewerUserId);
  res.json({
    ...profile,
    entryCount: entryCount ?? 0,
    followerCount: followerCount ?? 0,
    followingCount: followingCount ?? 0,
    viewerFollowing,
    isSelf: viewerUserId === userId,
  });
});

// ── Follow ──────────────────────────────────────────────────────────────────

// POST /api/users/:userId/follow — toggle follow
router.post("/users/:userId/follow", requireAuth, async (req, res) => {
  const followerId = (req as AuthedRequest).userId;
  const followeeId = req.params.userId;
  if (followerId === followeeId) { res.status(400).json({ error: "不能关注自己" }); return; }

  const [existing] = await db
    .select()
    .from(userFollowsTable)
    .where(and(eq(userFollowsTable.followerId, followerId), eq(userFollowsTable.followeeId, followeeId)));

  if (existing) {
    await db
      .delete(userFollowsTable)
      .where(and(eq(userFollowsTable.followerId, followerId), eq(userFollowsTable.followeeId, followeeId)));
  } else {
    await db.insert(userFollowsTable).values({ followerId, followeeId });
  }

  const [{ followerCount }] = await db
    .select({ followerCount: sql<number>`count(*)::int` })
    .from(userFollowsTable)
    .where(eq(userFollowsTable.followeeId, followeeId));

  res.json({ following: !existing, followerCount: followerCount ?? 0 });
});

// GET /api/me/following — list profiles the viewer follows.
// Uses LEFT JOIN so users whose profile hasn't been synced yet still appear
// (with a fallback "旅行者" name) instead of vanishing from the list.
router.get("/me/following", requireAuth, async (req, res) => {
  const userId = (req as AuthedRequest).userId;
  const rows = await db
    .select({
      userId: userFollowsTable.followeeId,
      name: userProfilesTable.name,
      avatar: userProfilesTable.avatar,
      followedAt: userFollowsTable.createdAt,
    })
    .from(userFollowsTable)
    .leftJoin(userProfilesTable, eq(userProfilesTable.userId, userFollowsTable.followeeId))
    .where(eq(userFollowsTable.followerId, userId))
    .orderBy(desc(userFollowsTable.createdAt));
  res.json(rows.map((r) => ({ ...r, name: r.name ?? "旅行者" })));
});

// GET /api/me/followers — list profiles that follow the viewer
router.get("/me/followers", requireAuth, async (req, res) => {
  const userId = (req as AuthedRequest).userId;
  const rows = await db
    .select({
      userId: userFollowsTable.followerId,
      name: userProfilesTable.name,
      avatar: userProfilesTable.avatar,
      followedAt: userFollowsTable.createdAt,
    })
    .from(userFollowsTable)
    .leftJoin(userProfilesTable, eq(userProfilesTable.userId, userFollowsTable.followerId))
    .where(eq(userFollowsTable.followeeId, userId))
    .orderBy(desc(userFollowsTable.createdAt));
  res.json(rows.map((r) => ({ ...r, name: r.name ?? "旅行者" })));
});

// ── Favorites ───────────────────────────────────────────────────────────────

// POST /api/entries/:id/favorite — toggle
router.post("/entries/:id/favorite", requireAuth, async (req, res) => {
  const userId = (req as AuthedRequest).userId;
  const entryId = Number(req.params.id);
  if (isNaN(entryId)) { res.status(400).json({ error: "Invalid id" }); return; }

  // Only allow favoriting public entries (or your own).
  const [entry] = await db.select().from(diaryEntriesTable).where(eq(diaryEntriesTable.id, entryId));
  if (!entry) { res.status(404).json({ error: "Not found" }); return; }
  if (entry.visibility !== "public" && entry.userId !== userId) {
    res.status(403).json({ error: "无法收藏私密日记" });
    return;
  }

  const [existing] = await db
    .select()
    .from(entryFavoritesTable)
    .where(and(eq(entryFavoritesTable.entryId, entryId), eq(entryFavoritesTable.userId, userId)));

  if (existing) {
    await db
      .delete(entryFavoritesTable)
      .where(and(eq(entryFavoritesTable.entryId, entryId), eq(entryFavoritesTable.userId, userId)));
  } else {
    await db.insert(entryFavoritesTable).values({ entryId, userId });
  }
  res.json({ favorited: !existing });
});

// ── Helpers: hydrate a list of entries with counts/cover/tags/relations ─────
async function hydrateEntries(
  entries: typeof diaryEntriesTable.$inferSelect[],
  viewerUserId: string | null,
) {
  if (entries.length === 0) return [];
  const ids = entries.map((e) => e.id);

  const [likeRows, commentRows, coverRows, tagRows, favRows, authorRows] = await Promise.all([
    db
      .select({ entryId: entryLikesTable.entryId, c: sql<number>`count(*)::int` })
      .from(entryLikesTable)
      .where(inArray(entryLikesTable.entryId, ids))
      .groupBy(entryLikesTable.entryId),
    db
      .select({ entryId: entryCommentsTable.entryId, c: sql<number>`count(*)::int` })
      .from(entryCommentsTable)
      .where(inArray(entryCommentsTable.entryId, ids))
      .groupBy(entryCommentsTable.entryId),
    // Cover = oldest photo per entry. We fetch all photos for the page and
    // pick the first per entry — fine at page size ≤40.
    db
      .select({ entryId: photosTable.entryId, url: photosTable.url, createdAt: photosTable.createdAt, id: photosTable.id })
      .from(photosTable)
      .where(inArray(photosTable.entryId, ids))
      .orderBy(photosTable.createdAt, photosTable.id),
    db
      .select({ entryId: entryTagsTable.entryId, id: tagsTable.id, name: tagsTable.name })
      .from(entryTagsTable)
      .innerJoin(tagsTable, eq(entryTagsTable.tagId, tagsTable.id))
      .where(inArray(entryTagsTable.entryId, ids)),
    viewerUserId
      ? db
          .select({ entryId: entryFavoritesTable.entryId })
          .from(entryFavoritesTable)
          .where(and(inArray(entryFavoritesTable.entryId, ids), eq(entryFavoritesTable.userId, viewerUserId)))
      : Promise.resolve([] as { entryId: number }[]),
    db
      .select({ userId: userProfilesTable.userId, name: userProfilesTable.name, avatar: userProfilesTable.avatar })
      .from(userProfilesTable)
      .where(
        inArray(
          userProfilesTable.userId,
          entries.map((e) => e.userId).filter((u): u is string => !!u),
        ),
      ),
  ]);

  const likeMap = new Map(likeRows.map((r) => [r.entryId, r.c]));
  const commentMap = new Map(commentRows.map((r) => [r.entryId, r.c]));
  const coverMap = new Map<number, string>();
  for (const r of coverRows) if (!coverMap.has(r.entryId)) coverMap.set(r.entryId, r.url);
  const tagMap = new Map<number, { id: number; name: string }[]>();
  for (const r of tagRows) {
    const arr = tagMap.get(r.entryId) ?? [];
    arr.push({ id: r.id, name: r.name });
    tagMap.set(r.entryId, arr);
  }
  const favSet = new Set(favRows.map((r) => r.entryId));
  const authorMap = new Map(authorRows.map((r) => [r.userId, r]));

  // viewerLiked map
  const likedSet = new Set<number>();
  if (viewerUserId) {
    const rows = await db
      .select({ entryId: entryLikesTable.entryId })
      .from(entryLikesTable)
      .where(and(inArray(entryLikesTable.entryId, ids), eq(entryLikesTable.userId, viewerUserId)));
    rows.forEach((r) => likedSet.add(r.entryId));
  }

  // viewerFollowing per distinct author (single query)
  const followingSet = new Set<string>();
  if (viewerUserId) {
    const authorIds = Array.from(
      new Set(entries.map((e) => e.userId).filter((u): u is string => !!u && u !== viewerUserId)),
    );
    if (authorIds.length > 0) {
      const rows = await db
        .select({ followeeId: userFollowsTable.followeeId })
        .from(userFollowsTable)
        .where(and(eq(userFollowsTable.followerId, viewerUserId), inArray(userFollowsTable.followeeId, authorIds)));
      rows.forEach((r) => followingSet.add(r.followeeId));
    }
  }

  return entries.map((e) => ({
    ...e,
    likeCount: likeMap.get(e.id) ?? 0,
    commentCount: commentMap.get(e.id) ?? 0,
    coverPhotoUrl: coverMap.get(e.id) ?? null,
    tags: tagMap.get(e.id) ?? [],
    viewerLiked: likedSet.has(e.id),
    viewerFavorited: favSet.has(e.id),
    author: e.userId ? authorMap.get(e.userId) ?? { userId: e.userId, name: "旅行者", avatar: null } : null,
    viewerFollowing: e.userId ? followingSet.has(e.userId) : false,
  }));
}

// GET /api/me/favorites — paginated list of favorited (still-public) entries
router.get("/me/favorites", requireAuth, async (req, res) => {
  const userId = (req as AuthedRequest).userId;
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(40, Number(req.query.limit) || 20);
  const offset = (page - 1) * limit;

  const rows = await db
    .select({ entry: diaryEntriesTable, favoritedAt: entryFavoritesTable.createdAt })
    .from(entryFavoritesTable)
    .innerJoin(diaryEntriesTable, eq(diaryEntriesTable.id, entryFavoritesTable.entryId))
    .where(
      and(
        eq(entryFavoritesTable.userId, userId),
        // Don't leak private entries (e.g. if author flipped visibility later).
        // Show user's own entries too.
        sql`${diaryEntriesTable.visibility} = 'public' OR ${diaryEntriesTable.userId} = ${userId}`,
      ),
    )
    .orderBy(desc(entryFavoritesTable.createdAt))
    .limit(limit)
    .offset(offset);

  const entries = await hydrateEntries(rows.map((r) => r.entry), userId);

  const [{ total }] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(entryFavoritesTable)
    .innerJoin(diaryEntriesTable, eq(diaryEntriesTable.id, entryFavoritesTable.entryId))
    .where(
      and(
        eq(entryFavoritesTable.userId, userId),
        sql`${diaryEntriesTable.visibility} = 'public' OR ${diaryEntriesTable.userId} = ${userId}`,
      ),
    );

  res.json({ entries, total, page, limit });
});

// GET /api/me/feed — paginated public entries from followed users
router.get("/me/feed", requireAuth, async (req, res) => {
  const userId = (req as AuthedRequest).userId;
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(40, Number(req.query.limit) || 20);
  const offset = (page - 1) * limit;

  const followeeRows = await db
    .select({ followeeId: userFollowsTable.followeeId })
    .from(userFollowsTable)
    .where(eq(userFollowsTable.followerId, userId));
  const followeeIds = followeeRows.map((r) => r.followeeId);

  if (followeeIds.length === 0) {
    res.json({ entries: [], total: 0, page, limit, followingCount: 0 });
    return;
  }

  const baseEntries = await db
    .select()
    .from(diaryEntriesTable)
    .where(
      and(
        eq(diaryEntriesTable.visibility, "public"),
        inArray(diaryEntriesTable.userId, followeeIds),
      ),
    )
    .orderBy(desc(diaryEntriesTable.createdAt))
    .limit(limit)
    .offset(offset);

  const entries = await hydrateEntries(baseEntries, userId);

  const [{ total }] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(diaryEntriesTable)
    .where(
      and(
        eq(diaryEntriesTable.visibility, "public"),
        inArray(diaryEntriesTable.userId, followeeIds),
      ),
    );

  res.json({ entries, total, page, limit, followingCount: followeeIds.length });
});

export default router;
