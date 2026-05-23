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
} from "@workspace/db";
import { eq, sql, and } from "drizzle-orm";
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

  res.json({ entry, likeCount: likeCount?.count ?? 0, viewerLiked, comments });
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

  const entries = await db
    .select()
    .from(diaryEntriesTable)
    .where(eq(diaryEntriesTable.visibility, "public"))
    .orderBy(sql`${diaryEntriesTable.createdAt} desc`)
    .limit(limit)
    .offset(offset);

  const viewerUserId: string | null = (req as any).userId;

  const result = await Promise.all(
    entries.map(async (entry) => {
      const [{ likeCount }] = await db
        .select({ likeCount: sql<number>`count(*)::int` })
        .from(entryLikesTable)
        .where(eq(entryLikesTable.entryId, entry.id));

      const [{ commentCount }] = await db
        .select({ commentCount: sql<number>`count(*)::int` })
        .from(entryCommentsTable)
        .where(eq(entryCommentsTable.entryId, entry.id));

      const [coverPhoto] = await db
        .select({ url: photosTable.url })
        .from(photosTable)
        .where(eq(photosTable.entryId, entry.id))
        .orderBy(photosTable.createdAt)
        .limit(1);

      const tags = await db
        .select({ id: tagsTable.id, name: tagsTable.name })
        .from(entryTagsTable)
        .innerJoin(tagsTable, eq(entryTagsTable.tagId, tagsTable.id))
        .where(eq(entryTagsTable.entryId, entry.id));

      let viewerLiked = false;
      if (viewerUserId) {
        const [row] = await db
          .select()
          .from(entryLikesTable)
          .where(and(eq(entryLikesTable.entryId, entry.id), eq(entryLikesTable.userId, viewerUserId)));
        viewerLiked = !!row;
      }

      return { ...entry, likeCount: likeCount ?? 0, commentCount: commentCount ?? 0, coverPhotoUrl: coverPhoto?.url ?? null, tags, viewerLiked };
    })
  );

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

  res.json({ entry, likeCount: likeCount ?? 0, viewerLiked, comments });
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

export default router;
