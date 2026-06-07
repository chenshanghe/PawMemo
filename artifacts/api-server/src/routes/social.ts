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
  composeStylesTable,
  notificationsTable,
  userBlocksTable,
  subscriptionOrdersTable,
} from "@workspace/db";
import { eq, sql, and, desc, inArray, notInArray, count } from "drizzle-orm";
import { requireAuth, AuthedRequest } from "../middlewares/auth";
import { getAuth } from "@clerk/express";
import crypto from "crypto";
import { getUserTier, getAiComposeUsage, getAiEnhanceUsage, TIER_NAMES } from "../lib/tiers";
import { sendEmail, buildCommentEmail, buildLikeEmail } from "../lib/email";

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
    .select({
      userId: userProfilesTable.userId,
      name: userProfilesTable.name,
      avatar: userProfilesTable.avatar,
      bio: userProfilesTable.bio,
    })
    .from(userProfilesTable)
    .where(eq(userProfilesTable.userId, userId));
  return p ?? { userId, name: "旅行者", avatar: null, bio: null };
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
  const userId = (req as unknown as AuthedRequest).userId;
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
  const userId = (req as unknown as AuthedRequest).userId;
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

  // Rewrite private object storage URLs to include the share token so that
  // img src requests from the share-view page can pass it to the storage
  // endpoint's access check.
  const tokenParam = `?shareToken=${encodeURIComponent(token)}`;
  const rewriteStorageUrl = (url: string | null | undefined): string | null | undefined => {
    if (!url || !url.startsWith("/api/storage/")) return url;
    return `${url}${tokenParam}`;
  };
  const entryWithTokenUrls = {
    ...entry,
    coverImage: rewriteStorageUrl(entry.coverImage),
    photos: entry.photos.map((p) => ({ ...p, url: rewriteStorageUrl(p.url) ?? p.url })),
  };

  console.log(`[share] token=${token} entryId=${share.entryId} coverImage=${entryWithTokenUrls.coverImage} photoUrls=${entryWithTokenUrls.photos.slice(0,2).map(p=>p.url).join("|")}`);

  res.json({ entry: entryWithTokenUrls, likeCount: likeCount?.count ?? 0, viewerLiked, comments, author, viewerFavorited, viewerFollowing });
});

// ── Entry access guard ───────────────────────────────────────────────────────

/**
 * Resolve whether the given viewer may access an entry's social data.
 * Returns the entry if access is granted, or responds with 404/403 and
 * returns null.  Access is granted when:
 *   - the viewer is the authenticated owner, OR
 *   - the entry visibility is "public", OR
 *   - the entry visibility is "share" AND a valid share token for that entry
 *     is supplied.
 *
 * Raw entryId alone never authorises access to another user's private or
 * share-only content.
 */
async function assertEntryAccessible(
  entryId: number,
  viewerUserId: string | null,
  res: any,
  shareToken?: string,
): Promise<typeof diaryEntriesTable.$inferSelect | null> {
  const [entry] = await db
    .select()
    .from(diaryEntriesTable)
    .where(eq(diaryEntriesTable.id, entryId));
  if (!entry) { res.status(404).json({ error: "Not found" }); return null; }

  if (viewerUserId && viewerUserId === entry.userId) return entry;
  if (entry.visibility === "public") return entry;
  if (entry.visibility === "share" && shareToken) {
    const [shareRecord] = await db
      .select({ id: entrySharesTable.id })
      .from(entrySharesTable)
      .where(and(eq(entrySharesTable.token, shareToken), eq(entrySharesTable.entryId, entryId)));
    if (shareRecord) return entry;
  }

  res.status(403).json({ error: "Forbidden" });
  return null;
}

// ── Likes ────────────────────────────────────────────────────────────────────

// GET /api/entries/:id/likes
router.get("/entries/:id/likes", optionalAuth, async (req, res) => {
  const entryId = Number(req.params.id);
  if (isNaN(entryId)) { res.status(400).json({ error: "Invalid id" }); return; }

  const viewerUserId: string | null = (req as any).userId;
  const shareToken = typeof req.query.shareToken === "string" ? req.query.shareToken : undefined;
  const entry = await assertEntryAccessible(entryId, viewerUserId, res, shareToken);
  if (!entry) return;

  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(entryLikesTable)
    .where(eq(entryLikesTable.entryId, entryId));

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
  const userId = (req as unknown as AuthedRequest).userId;
  if (isNaN(entryId)) { res.status(400).json({ error: "Invalid id" }); return; }

  const shareToken = typeof req.query.shareToken === "string" ? req.query.shareToken : undefined;
  const entry = await assertEntryAccessible(entryId, userId, res, shareToken);
  if (!entry) return;

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

  // Fire-and-forget: notify entry owner on new like (not on unlike, not on self-like)
  if (!existing) {
    try {
      if (entry && entry.userId && entry.userId !== userId) {
        const [ownerProfile] = await db.select().from(userProfilesTable).where(eq(userProfilesTable.userId, entry.userId));
        const [likerProfile] = await db.select().from(userProfilesTable).where(eq(userProfilesTable.userId, userId));
        if (likerProfile) {
          // In-app notification
          await db.insert(notificationsTable).values({
            userId: entry.userId,
            type: "like",
            actorId: userId,
            actorName: likerProfile.name,
            actorAvatar: likerProfile.avatar ?? null,
            entryId,
            entryTitle: entry.title,
            body: `${likerProfile.name} 赞了你的日记「${entry.title}」`,
          });
        }
        if (ownerProfile?.email && likerProfile) {
          const { subject, html } = buildLikeEmail({
            ownerName: ownerProfile.name,
            likerName: likerProfile.name,
            entryTitle: entry.title,
            entryId,
          });
          sendEmail({ to: ownerProfile.email, subject, html });
        }
      }
    } catch { /* best-effort */ }
  }
});

// ── Comments ─────────────────────────────────────────────────────────────────

// GET /api/entries/:id/comments
router.get("/entries/:id/comments", optionalAuth, async (req, res) => {
  const entryId = Number(req.params.id);
  if (isNaN(entryId)) { res.status(400).json({ error: "Invalid id" }); return; }

  const viewerUserId: string | null = (req as any).userId;
  const shareToken = typeof req.query.shareToken === "string" ? req.query.shareToken : undefined;
  const entry = await assertEntryAccessible(entryId, viewerUserId, res, shareToken);
  if (!entry) return;

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
  const userId = (req as unknown as AuthedRequest).userId;
  if (isNaN(entryId)) { res.status(400).json({ error: "Invalid id" }); return; }

  const shareToken = typeof req.query.shareToken === "string" ? req.query.shareToken : undefined;
  const accessibleEntry = await assertEntryAccessible(entryId, userId, res, shareToken);
  if (!accessibleEntry) return;

  const { content, userName, userAvatar } = req.body;
  if (!content?.trim()) { res.status(400).json({ error: "评论内容不能为空" }); return; }
  if (!userName?.trim()) { res.status(400).json({ error: "缺少用户名" }); return; }

  const [comment] = await db
    .insert(entryCommentsTable)
    .values({ entryId, userId, userName, userAvatar: userAvatar ?? null, content: content.trim() })
    .returning();

  res.status(201).json(comment);

  // Fire-and-forget: notify entry owner by email + in-app (skip if self-comment)
  try {
    const entry = accessibleEntry;
    if (entry && entry.userId && entry.userId !== userId) {
      const [commenterProfile] = await db.select().from(userProfilesTable).where(eq(userProfilesTable.userId, userId));
      // In-app notification
      await db.insert(notificationsTable).values({
        userId: entry.userId,
        type: "comment",
        actorId: userId,
        actorName: userName,
        actorAvatar: commenterProfile?.avatar ?? userAvatar ?? null,
        entryId,
        entryTitle: entry.title,
        body: `${userName} 评论了你的日记：「${content.trim().slice(0, 30)}${content.trim().length > 30 ? "…" : ""}」`,
      });
      const [ownerProfile] = await db.select().from(userProfilesTable).where(eq(userProfilesTable.userId, entry.userId));
      if (ownerProfile?.email) {
        const { subject, html } = buildCommentEmail({
          ownerName: ownerProfile.name,
          commenterName: userName,
          entryTitle: entry.title,
          entryId,
          commentContent: content.trim(),
        });
        sendEmail({ to: ownerProfile.email, subject, html });
      }
    }
  } catch { /* best-effort */ }
});

// DELETE /api/comments/:commentId — only comment owner can delete
router.delete("/comments/:commentId", requireAuth, async (req, res) => {
  const commentId = Number(req.params.commentId);
  const userId = (req as unknown as AuthedRequest).userId;
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
// Supports ?tag=<name> to filter by tag
router.get("/square", optionalAuth, async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(40, Number(req.query.limit) || 20);
  const offset = (page - 1) * limit;
  const tagName = typeof req.query.tag === "string" && req.query.tag.trim() ? req.query.tag.trim() : null;

  // Build WHERE condition — optionally scoped to a tag, excluding blocked users
  const viewerUserId: string | null = (req as any).userId;
  const publicNoteOnly = and(eq(diaryEntriesTable.visibility, "public"), eq(diaryEntriesTable.entryType, "note"));
  let whereCondition: any = publicNoteOnly;

  // Gather blocked user IDs (when logged in) to hide their content
  let blockedUserIds: string[] = [];
  if (viewerUserId) {
    const blockRows = await db
      .select({ blockedId: userBlocksTable.blockedId })
      .from(userBlocksTable)
      .where(eq(userBlocksTable.blockerId, viewerUserId));
    blockedUserIds = blockRows.map((r) => r.blockedId);
  }

  if (tagName && blockedUserIds.length > 0) {
    const taggedIds = db
      .select({ entryId: entryTagsTable.entryId })
      .from(entryTagsTable)
      .innerJoin(tagsTable, eq(entryTagsTable.tagId, tagsTable.id))
      .where(eq(tagsTable.name, tagName));
    whereCondition = and(
      publicNoteOnly,
      inArray(diaryEntriesTable.id, taggedIds),
      notInArray(diaryEntriesTable.userId, blockedUserIds),
    );
  } else if (tagName) {
    const taggedIds = db
      .select({ entryId: entryTagsTable.entryId })
      .from(entryTagsTable)
      .innerJoin(tagsTable, eq(entryTagsTable.tagId, tagsTable.id))
      .where(eq(tagsTable.name, tagName));
    whereCondition = and(publicNoteOnly, inArray(diaryEntriesTable.id, taggedIds));
  } else if (blockedUserIds.length > 0) {
    whereCondition = and(publicNoteOnly, notInArray(diaryEntriesTable.userId, blockedUserIds));
  }

  const baseEntries = await db
    .select()
    .from(diaryEntriesTable)
    .where(whereCondition)
    .orderBy(sql`${diaryEntriesTable.createdAt} desc`)
    .limit(limit)
    .offset(offset);

  const result = await hydrateEntries(baseEntries, viewerUserId);

  const [{ total }] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(diaryEntriesTable)
    .where(whereCondition);

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
  const userId = (req as unknown as AuthedRequest).userId;
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
  const userId = (req as unknown as AuthedRequest).userId;
  const { name, avatar, bio, email } = req.body ?? {};
  if (typeof name !== "string" || !name.trim()) {
    res.status(400).json({ error: "name required" });
    return;
  }
  const hasAvatar = typeof avatar === "string";
  const hasBio = typeof bio === "string";

  // On insert, seed with what we have (null where not provided).
  // On update, only overwrite fields the caller explicitly sent — so the
  // sign-in sync (which only sends name+avatar from Clerk) never wipes a
  // user's edited bio.
  const hasEmail = typeof email === "string" && email.includes("@");

  const updateSet: Record<string, unknown> = {
    name: name.trim(),
    updatedAt: new Date(),
  };
  if (hasAvatar) updateSet.avatar = avatar;
  if (hasBio) updateSet.bio = bio.trim() || null;
  if (hasEmail) updateSet.email = email.trim().toLowerCase();

  const [row] = await db
    .insert(userProfilesTable)
    .values({
      userId,
      name: name.trim(),
      avatar: hasAvatar ? avatar : null,
      bio: hasBio ? (bio.trim() || null) : null,
      email: hasEmail ? email.trim().toLowerCase() : null,
    })
    .onConflictDoUpdate({
      target: userProfilesTable.userId,
      set: updateSet,
    })
    .returning();
  res.json(row);
});

// GET /api/me/profile  — returns own profile + stats. Synthesizes a stub
// profile if the row isn't synced yet, so the page never 404s.
router.get("/me/profile", requireAuth, async (req, res) => {
  const userId = (req as unknown as AuthedRequest).userId;
  const [row] = await db.select().from(userProfilesTable).where(eq(userProfilesTable.userId, userId));
  const profile = row ?? { userId, name: "旅行者", avatar: null, bio: null, updatedAt: null };

  const [
    [{ entryCount }],
    [{ publicEntryCount }],
    [{ followingCount }],
    [{ followerCount }],
    [{ likesReceived }],
    [{ favoritesReceived }],
  ] = await Promise.all([
    db
      .select({ entryCount: sql<number>`count(*)::int` })
      .from(diaryEntriesTable)
      .where(eq(diaryEntriesTable.userId, userId)),
    db
      .select({ publicEntryCount: sql<number>`count(*)::int` })
      .from(diaryEntriesTable)
      .where(and(eq(diaryEntriesTable.userId, userId), eq(diaryEntriesTable.visibility, "public"))),
    db
      .select({ followingCount: sql<number>`count(*)::int` })
      .from(userFollowsTable)
      .where(eq(userFollowsTable.followerId, userId)),
    db
      .select({ followerCount: sql<number>`count(*)::int` })
      .from(userFollowsTable)
      .where(eq(userFollowsTable.followeeId, userId)),
    db
      .select({ likesReceived: sql<number>`count(*)::int` })
      .from(entryLikesTable)
      .innerJoin(diaryEntriesTable, eq(diaryEntriesTable.id, entryLikesTable.entryId))
      .where(eq(diaryEntriesTable.userId, userId)),
    db
      .select({ favoritesReceived: sql<number>`count(*)::int` })
      .from(entryFavoritesTable)
      .innerJoin(diaryEntriesTable, eq(diaryEntriesTable.id, entryFavoritesTable.entryId))
      .where(eq(diaryEntriesTable.userId, userId)),
  ]);

  res.json({
    ...profile,
    entryCount: entryCount ?? 0,
    publicEntryCount: publicEntryCount ?? 0,
    followingCount: followingCount ?? 0,
    followerCount: followerCount ?? 0,
    likesReceived: likesReceived ?? 0,
    favoritesReceived: favoritesReceived ?? 0,
  });
});

// PATCH /api/me/profile — edit name, bio, and custom avatar
router.patch("/me/profile", requireAuth, async (req, res) => {
  const userId = (req as unknown as AuthedRequest).userId;
  const { name, bio, avatar, weeklyDigest } = req.body ?? {};
  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (typeof name === "string" && name.trim()) updates.name = name.trim();
  if (typeof bio === "string") updates.bio = bio.trim() || null;
  if (typeof avatar === "string") updates.avatar = avatar || null;
  if (typeof weeklyDigest === "boolean") updates.weeklyDigest = weeklyDigest;
  if (Object.keys(updates).length === 1) {
    res.status(400).json({ error: "Nothing to update" });
    return;
  }

  // Ensure a row exists first.
  const [existing] = await db.select().from(userProfilesTable).where(eq(userProfilesTable.userId, userId));
  if (!existing) {
    await db.insert(userProfilesTable).values({
      userId,
      name: typeof name === "string" && name.trim() ? name.trim() : "旅行者",
      bio: typeof bio === "string" ? bio.trim() || null : null,
    });
  } else {
    await db.update(userProfilesTable).set(updates).where(eq(userProfilesTable.userId, userId));
  }
  const [row] = await db.select().from(userProfilesTable).where(eq(userProfilesTable.userId, userId));
  res.json(row);
});

// GET /api/users/:userId/entries — paginated public entries by user
router.get("/users/:userId/entries", optionalAuth, async (req, res) => {
  const { userId } = req.params;
  const viewerUserId: string | null = (req as any).userId;
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(40, Number(req.query.limit) || 20);
  const offset = (page - 1) * limit;

  const baseEntries = await db
    .select()
    .from(diaryEntriesTable)
    .where(and(eq(diaryEntriesTable.userId, userId), eq(diaryEntriesTable.visibility, "public"), eq(diaryEntriesTable.entryType, "note")))
    .orderBy(desc(diaryEntriesTable.createdAt))
    .limit(limit)
    .offset(offset);

  const entries = await hydrateEntries(baseEntries, viewerUserId);

  const [{ total }] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(diaryEntriesTable)
    .where(and(eq(diaryEntriesTable.userId, userId), eq(diaryEntriesTable.visibility, "public"), eq(diaryEntriesTable.entryType, "note")));

  res.json({ entries, total, page, limit });
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
  const followerId = (req as unknown as AuthedRequest).userId;
  const followeeId = req.params.userId as string;
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
    // In-app notification for new follow
    try {
      const [followerProfile] = await db.select().from(userProfilesTable).where(eq(userProfilesTable.userId, followerId));
      if (followerProfile) {
        await db.insert(notificationsTable).values({
          userId: followeeId,
          type: "follow",
          actorId: followerId,
          actorName: followerProfile.name,
          actorAvatar: followerProfile.avatar ?? null,
          entryId: null,
          entryTitle: null,
          body: `${followerProfile.name} 开始关注你了`,
        });
      }
    } catch { /* best-effort */ }
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
  const userId = (req as unknown as AuthedRequest).userId;
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
  const userId = (req as unknown as AuthedRequest).userId;
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
  const userId = (req as unknown as AuthedRequest).userId;
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
    coverPhotoUrl: coverMap.get(e.id) ?? e.coverImage ?? null,
    tags: tagMap.get(e.id) ?? [],
    viewerLiked: likedSet.has(e.id),
    viewerFavorited: favSet.has(e.id),
    author: e.userId ? authorMap.get(e.userId) ?? { userId: e.userId, name: "旅行者", avatar: null } : null,
    viewerFollowing: e.userId ? followingSet.has(e.userId) : false,
  }));
}

// GET /api/me/favorites — paginated list of favorited (still-public) entries
router.get("/me/favorites", requireAuth, async (req, res) => {
  const userId = (req as unknown as AuthedRequest).userId;
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

// GET /api/me/photos — paginated photos across all user entries
router.get("/me/photos", requireAuth, async (req, res) => {
  const userId = (req as unknown as AuthedRequest).userId;
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(60, Number(req.query.limit) || 24);
  const offset = (page - 1) * limit;
  const dest = (req.query.destination as string) || undefined;

  const where = dest
    ? and(eq(diaryEntriesTable.userId, userId), eq(diaryEntriesTable.destination, dest))
    : eq(diaryEntriesTable.userId, userId);

  const [countResult, rows] = await Promise.all([
    db
      .select({ total: sql<number>`count(*)::int` })
      .from(photosTable)
      .innerJoin(diaryEntriesTable, eq(photosTable.entryId, diaryEntriesTable.id))
      .where(where),
    db
      .select({
        id: photosTable.id,
        url: photosTable.url,
        caption: photosTable.caption,
        createdAt: photosTable.createdAt,
        entryId: diaryEntriesTable.id,
        entryTitle: diaryEntriesTable.title,
        entryDestination: diaryEntriesTable.destination,
        entryStartDate: diaryEntriesTable.startDate,
      })
      .from(photosTable)
      .innerJoin(diaryEntriesTable, eq(photosTable.entryId, diaryEntriesTable.id))
      .where(where)
      .orderBy(desc(photosTable.createdAt))
      .limit(limit)
      .offset(offset),
  ]);

  const total = countResult[0]?.total ?? 0;
  const totalPages = Math.ceil(total / limit);
  res.json({ photos: rows, total, page, limit, totalPages, hasMore: page < totalPages });
});

// GET /api/me/feed — paginated public entries from followed users
router.get("/me/feed", requireAuth, async (req, res) => {
  const userId = (req as unknown as AuthedRequest).userId;
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
        eq(diaryEntriesTable.entryType, "note"),
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
        eq(diaryEntriesTable.entryType, "note"),
        inArray(diaryEntriesTable.userId, followeeIds),
      ),
    );

  res.json({ entries, total, page, limit, followingCount: followeeIds.length });
});

// ── Compose style presets ────────────────────────────────────────────────────

// GET /api/me/compose-styles
router.get("/me/compose-styles", requireAuth, async (req, res) => {
  const userId = (req as unknown as AuthedRequest).userId;
  const rows = await db
    .select()
    .from(composeStylesTable)
    .where(eq(composeStylesTable.userId, userId))
    .orderBy(desc(composeStylesTable.createdAt));
  res.json(rows);
});

// POST /api/me/compose-styles
router.post("/me/compose-styles", requireAuth, async (req, res) => {
  const userId = (req as unknown as AuthedRequest).userId;
  const { name, style } = req.body ?? {};
  if (typeof name !== "string" || !name.trim() || typeof style !== "string" || !style.trim()) {
    res.status(400).json({ error: "name and style are required" });
    return;
  }
  // Quota: style presets
  const { tier: sTier, limits: sLimits } = await getUserTier(userId);
  if (sLimits.styles < 999999) {
    const [{ cnt }] = await db
      .select({ cnt: count() })
      .from(composeStylesTable)
      .where(eq(composeStylesTable.userId, userId));
    if (cnt >= sLimits.styles) {
      res.status(403).json({ code: "STYLE_LIMIT", tier: sTier, limit: sLimits.styles });
      return;
    }
  }
  const [row] = await db
    .insert(composeStylesTable)
    .values({ userId, name: name.trim(), style: style.trim() })
    .returning();
  res.status(201).json(row);
});

// GET /api/me/subscription
router.get("/me/subscription", requireAuth, async (req, res) => {
  const userId = (req as unknown as AuthedRequest).userId;
  const { tier } = await getUserTier(userId);
  const [compose, enhance] = await Promise.all([
    getAiComposeUsage(userId),
    getAiEnhanceUsage(userId),
  ]);
  const [profile] = await db
    .select({ 
      subscriptionExpiresAt: userProfilesTable.subscriptionExpiresAt,
      cancelAtPeriodEnd: userProfilesTable.cancelAtPeriodEnd,
    })
    .from(userProfilesTable)
    .where(eq(userProfilesTable.userId, userId));
  res.json({
    tier,
    tierName: TIER_NAMES[tier],
    expiresAt: profile?.subscriptionExpiresAt ?? null,
    cancelAtPeriodEnd: profile?.cancelAtPeriodEnd ?? false,
    aiComposedThisMonth: compose.used,
    aiComposeLimit: compose.limit,
    aiEnhancedThisMonth: enhance.used,
    aiEnhanceLimit: enhance.limit,
  });
});

// POST /api/me/subscription/cancel
router.post("/me/subscription/cancel", requireAuth, async (req, res) => {
  const userId = (req as unknown as AuthedRequest).userId;
  const [profile] = await db
    .select()
    .from(userProfilesTable)
    .where(eq(userProfilesTable.userId, userId));
  
  if (!profile || profile.subscriptionTier === "free") {
    res.status(400).json({ error: "No active subscription to cancel" });
    return;
  }

  await db
    .update(userProfilesTable)
    .set({ cancelAtPeriodEnd: true, updatedAt: new Date() })
    .where(eq(userProfilesTable.userId, userId));

  res.json({ ok: true, expiresAt: profile.subscriptionExpiresAt });
});

// POST /api/me/subscription/restore
router.post("/me/subscription/restore", requireAuth, async (req, res) => {
  const userId = (req as unknown as AuthedRequest).userId;
  await db
    .update(userProfilesTable)
    .set({ cancelAtPeriodEnd: false, updatedAt: new Date() })
    .where(eq(userProfilesTable.userId, userId));

  res.json({ ok: true });
});

// DELETE /api/me/compose-styles/:id
router.delete("/me/compose-styles/:id", requireAuth, async (req, res) => {
  const userId = (req as unknown as AuthedRequest).userId;
  const id = Number(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  await db
    .delete(composeStylesTable)
    .where(and(eq(composeStylesTable.id, id), eq(composeStylesTable.userId, userId)));
  res.json({ ok: true });
});

// GET /api/me/orders
router.get("/me/orders", requireAuth, async (req, res) => {
  const userId = (req as unknown as AuthedRequest).userId;
  const orders = await db
    .select({
      id: subscriptionOrdersTable.id,
      outTradeNo: subscriptionOrdersTable.outTradeNo,
      tier: subscriptionOrdersTable.tier,
      period: subscriptionOrdersTable.period,
      amountCents: subscriptionOrdersTable.amountCents,
      status: subscriptionOrdersTable.status,
      paidAt: subscriptionOrdersTable.paidAt,
      expiresAt: subscriptionOrdersTable.expiresAt,
      createdAt: subscriptionOrdersTable.createdAt,
    })
    .from(subscriptionOrdersTable)
    .where(eq(subscriptionOrdersTable.userId, userId))
    .orderBy(desc(subscriptionOrdersTable.createdAt));

  res.json(orders);
});

export default router;
