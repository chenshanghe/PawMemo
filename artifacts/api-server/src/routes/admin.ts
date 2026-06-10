import { Router } from "express";
import { db } from "@workspace/db";
import {
  userProfilesTable,
  subscriptionEventsTable,
  diaryEntriesTable,
  photosTable,
  subscriptionOrdersTable,
  appKnowledgeTable,
  appChangelogsTable,
  tierConfigTable,
} from "@workspace/db";
import { eq, desc, asc, ilike, or, count, sql, and, gte, lte } from "drizzle-orm";
import { requireAuth, AuthedRequest } from "../middlewares/auth";
import { logSubEvent } from "../lib/sub-events";

const router = Router();
router.use(requireAuth);

// Clerk user IDs are always pure ASCII [a-zA-Z0-9_].
// Map common Unicode confusables (Cyrillic lookalikes) → Latin equivalents so
// that env vars typed on a CJK/Cyrillic keyboard still compare correctly.
const CONFUSABLES: Record<string, string> = {
  "\u0410": "A", "\u0412": "B", "\u0421": "C", "\u0415": "E",
  "\u0425": "X", "\u041D": "H", "\u0406": "I", "\u041A": "K",
  "\u041C": "M", "\u041E": "O", "\u0420": "P", "\u0422": "T",
  "\u0430": "a", "\u0441": "c", "\u0435": "e", "\u0456": "i",
  "\u043E": "o", "\u0440": "p", "\u0455": "s", "\u0443": "y",
  "\u0445": "x", "\u0458": "j", "\u0432": "b", "\u0491": "r",
};
function toAsciiId(s: string): string {
  return Array.from(s).map(c => CONFUSABLES[c] ?? c).join("");
}

function requireAdmin(req: any, res: any): boolean {
  const userId = (req as AuthedRequest).userId;
  const raw = process.env.ADMIN_USER_IDS ?? "";
  const adminIds = raw
    .replace(/^["']|["']$/g, "")
    .split(",")
    .map(s => toAsciiId(s.trim().replace(/^["']|["']$/g, "")))
    .filter(Boolean);
  const normalizedUserId = toAsciiId(userId);
  const match = adminIds.includes(normalizedUserId);
  if (!match) {
    res.status(403).json({ error: "FORBIDDEN" });
    return false;
  }
  return true;
}

// ── GET /api/admin/stats ──────────────────────────────────────────────────────
router.get("/stats", async (req, res) => {
  if (!requireAdmin(req, res)) return;

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOf30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [
    [totalUsers],
    [paidUsers],
    [proUsers],
    [plusUsers],
    [newThisMonth],
    [cancelUsers],
    [totalEntries],
    [totalPhotos],
    paidOrders,
  ] = await Promise.all([
    db.select({ c: count() }).from(userProfilesTable),
    db.select({ c: count() }).from(userProfilesTable)
      .where(sql`${userProfilesTable.subscriptionTier} != 'free'`),
    db.select({ c: count() }).from(userProfilesTable)
      .where(eq(userProfilesTable.subscriptionTier, "pro")),
    db.select({ c: count() }).from(userProfilesTable)
      .where(eq(userProfilesTable.subscriptionTier, "plus")),
    db.select({ c: count() }).from(userProfilesTable)
      .where(gte(userProfilesTable.createdAt, startOfMonth)),
    db.select({ c: count() }).from(userProfilesTable)
      .where(eq(userProfilesTable.cancelAtPeriodEnd, true)),
    db.select({ c: count() }).from(diaryEntriesTable),
    db.select({ c: count() }).from(photosTable),
    db.select({
      amountCents: subscriptionOrdersTable.amountCents,
    }).from(subscriptionOrdersTable)
      .where(and(
        eq(subscriptionOrdersTable.status, "paid"),
        gte(subscriptionOrdersTable.paidAt as any, startOf30Days),
      )),
  ]);

  const mrr30 = paidOrders.reduce((s, o) => s + o.amountCents, 0);

  res.json({
    totalUsers: totalUsers.c,
    paidUsers: paidUsers.c,
    proUsers: proUsers.c,
    plusUsers: plusUsers.c,
    freeUsers: Number(totalUsers.c) - Number(paidUsers.c),
    newThisMonth: newThisMonth.c,
    cancelPending: cancelUsers.c,
    totalEntries: totalEntries.c,
    totalPhotos: totalPhotos.c,
    revenue30Days: mrr30,
  });
});

// ── GET /api/admin/users ──────────────────────────────────────────────────────
router.get("/users", async (req, res) => {
  if (!requireAdmin(req, res)) return;

  const page = Math.max(1, Number(req.query.page ?? 1));
  const limit = 30;
  const offset = (page - 1) * limit;
  const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
  const tierFilter = typeof req.query.tier === "string" ? req.query.tier : "";

  const conditions: any[] = [];
  if (q) {
    conditions.push(or(
      ilike(userProfilesTable.name, `%${q}%`),
      ilike(userProfilesTable.email, `%${q}%`),
    ));
  }
  if (tierFilter && ["free", "plus", "pro"].includes(tierFilter)) {
    conditions.push(eq(userProfilesTable.subscriptionTier, tierFilter));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [users, [{ total }]] = await Promise.all([
    db.select({
      userId: userProfilesTable.userId,
      name: userProfilesTable.name,
      email: userProfilesTable.email,
      avatar: userProfilesTable.avatar,
      subscriptionTier: userProfilesTable.subscriptionTier,
      subscriptionExpiresAt: userProfilesTable.subscriptionExpiresAt,
      cancelAtPeriodEnd: userProfilesTable.cancelAtPeriodEnd,
      aiChatUsed: userProfilesTable.aiChatUsed,
      aiComposeUsed: userProfilesTable.aiComposeUsed,
      aiEnhanceUsed: userProfilesTable.aiEnhanceUsed,
      createdAt: userProfilesTable.createdAt,
      updatedAt: userProfilesTable.updatedAt,
    }).from(userProfilesTable)
      .where(whereClause)
      .orderBy(desc(userProfilesTable.createdAt))
      .limit(limit)
      .offset(offset),
    db.select({ total: count() }).from(userProfilesTable).where(whereClause),
  ]);

  res.json({ users, total: Number(total), page, pages: Math.ceil(Number(total) / limit) });
});

// ── GET /api/admin/events ─────────────────────────────────────────────────────
router.get("/events", async (req, res) => {
  if (!requireAdmin(req, res)) return;

  const page = Math.max(1, Number(req.query.page ?? 1));
  const limit = 50;
  const offset = (page - 1) * limit;
  const typeFilter = typeof req.query.type === "string" ? req.query.type : "";
  const userIdFilter = typeof req.query.userId === "string" ? req.query.userId : "";

  const conditions: any[] = [];
  if (typeFilter) conditions.push(eq(subscriptionEventsTable.eventType, typeFilter));
  if (userIdFilter) conditions.push(eq(subscriptionEventsTable.userId, userIdFilter));
  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [events, [{ total }]] = await Promise.all([
    db.select({
      id: subscriptionEventsTable.id,
      userId: subscriptionEventsTable.userId,
      eventType: subscriptionEventsTable.eventType,
      fromTier: subscriptionEventsTable.fromTier,
      toTier: subscriptionEventsTable.toTier,
      amountFen: subscriptionEventsTable.amountFen,
      orderNo: subscriptionEventsTable.orderNo,
      note: subscriptionEventsTable.note,
      createdAt: subscriptionEventsTable.createdAt,
      userName: userProfilesTable.name,
      userEmail: userProfilesTable.email,
      userAvatar: userProfilesTable.avatar,
    })
      .from(subscriptionEventsTable)
      .leftJoin(userProfilesTable, eq(subscriptionEventsTable.userId, userProfilesTable.userId))
      .where(whereClause)
      .orderBy(desc(subscriptionEventsTable.createdAt))
      .limit(limit)
      .offset(offset),
    db.select({ total: count() }).from(subscriptionEventsTable).where(whereClause),
  ]);

  res.json({ events, total: Number(total), page, pages: Math.ceil(Number(total) / limit) });
});

// ── PATCH /api/admin/users/:id/tier ──────────────────────────────────────────
router.patch("/users/:id/tier", async (req, res) => {
  if (!requireAdmin(req, res)) return;

  const targetUserId = req.params.id as string;
  const { tier, expiresAt, note } = req.body ?? {};

  if (!["free", "plus", "pro"].includes(tier)) {
    res.status(400).json({ error: "invalid tier" });
    return;
  }

  const [profile] = await db.select().from(userProfilesTable).where(eq(userProfilesTable.userId, targetUserId));
  if (!profile) { res.status(404).json({ error: "user not found" }); return; }

  const fromTier = profile.subscriptionTier;
  const newExpiresAt = tier === "free" ? null : (expiresAt ? new Date(expiresAt) : new Date(Date.now() + 31 * 24 * 60 * 60 * 1000));

  await db.update(userProfilesTable)
    .set({ subscriptionTier: tier, subscriptionExpiresAt: newExpiresAt, updatedAt: new Date() })
    .where(eq(userProfilesTable.userId, targetUserId));

  const adminUserId = (req as AuthedRequest).userId;
  const eventType = tier === "free" ? "downgraded" : (fromTier === "free" ? "upgraded" : "upgraded");
  await logSubEvent({
    userId: targetUserId,
    eventType,
    fromTier,
    toTier: tier,
    amountFen: 0,
    note: note ?? `管理员手动修改 by ${adminUserId}`,
  });

  res.json({ ok: true, tier, expiresAt: newExpiresAt });
});

// ── GET /api/admin/trends ─────────────────────────────────────────────────────
router.get("/trends", async (req, res) => {
  if (!requireAdmin(req, res)) return;

  const days = Math.min(90, Math.max(7, Number(req.query.days ?? 30)));
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const [userRows, revenueRows] = await Promise.all([
    db.execute(sql`
      SELECT DATE(created_at AT TIME ZONE 'UTC') AS day, COUNT(*)::int AS count
      FROM user_profiles
      WHERE created_at >= ${since}
      GROUP BY 1 ORDER BY 1
    `),
    db.execute(sql`
      SELECT DATE(created_at AT TIME ZONE 'UTC') AS day, COALESCE(SUM(amount_fen),0)::int AS revenue
      FROM subscription_events
      WHERE event_type = 'upgraded' AND created_at >= ${since}
      GROUP BY 1 ORDER BY 1
    `),
  ]);

  // Fill gaps with zeros so charts render continuous lines
  const fill = (rows: { day: string; [k: string]: unknown }[], key: string) => {
    const map = new Map(rows.map(r => [r.day as string, Number(r[key])]));
    const result: { day: string; value: number }[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      const k = d.toISOString().slice(0, 10);
      result.push({ day: k, value: map.get(k) ?? 0 });
    }
    return result;
  };

  res.json({
    users: fill(userRows.rows as any, "count"),
    revenue: fill(revenueRows.rows as any, "revenue"),
  });
});

// ── Knowledge Base CRUD ───────────────────────────────────────────────────────
router.get("/knowledge", async (req, res) => {
  if (!requireAdmin(req, res)) return;
  const items = await db.select().from(appKnowledgeTable).orderBy(asc(appKnowledgeTable.sortOrder), asc(appKnowledgeTable.id));
  res.json(items);
});

router.post("/knowledge", async (req, res) => {
  if (!requireAdmin(req, res)) return;
  const { title, content, sortOrder, isActive } = req.body ?? {};
  if (!title?.trim() || !content?.trim()) { res.status(400).json({ error: "title and content required" }); return; }
  const [item] = await db.insert(appKnowledgeTable).values({
    title: title.trim(), content: content.trim(),
    sortOrder: Number(sortOrder ?? 0), isActive: isActive !== false,
  }).returning();
  res.json(item);
});

router.patch("/knowledge/:id", async (req, res) => {
  if (!requireAdmin(req, res)) return;
  const id = Number(req.params.id as string);
  if (!Number.isInteger(id) || id <= 0) { res.status(400).json({ error: "invalid id" }); return; }
  const { title, content, sortOrder, isActive } = req.body ?? {};
  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (title !== undefined) {
    const t = String(title).trim();
    if (!t) { res.status(400).json({ error: "title cannot be empty" }); return; }
    updates.title = t;
  }
  if (content !== undefined) {
    const c = String(content).trim();
    if (!c) { res.status(400).json({ error: "content cannot be empty" }); return; }
    updates.content = c;
  }
  if (sortOrder !== undefined) updates.sortOrder = Number(sortOrder) || 0;
  if (isActive !== undefined) updates.isActive = Boolean(isActive);
  const [item] = await db.update(appKnowledgeTable).set(updates).where(eq(appKnowledgeTable.id, id)).returning();
  if (!item) { res.status(404).json({ error: "not found" }); return; }
  res.json(item);
});

router.delete("/knowledge/:id", async (req, res) => {
  if (!requireAdmin(req, res)) return;
  const id = Number(req.params.id as string);
  if (!Number.isInteger(id) || id <= 0) { res.status(400).json({ error: "invalid id" }); return; }
  await db.delete(appKnowledgeTable).where(eq(appKnowledgeTable.id, id));
  res.json({ ok: true });
});

// ── Changelogs CRUD ───────────────────────────────────────────────────────────
router.get("/changelogs", async (req, res) => {
  if (!requireAdmin(req, res)) return;
  const items = await db.select().from(appChangelogsTable).orderBy(desc(appChangelogsTable.createdAt));
  res.json(items);
});

router.post("/changelogs", async (req, res) => {
  if (!requireAdmin(req, res)) return;
  const { version, title, content, isPublished } = req.body ?? {};
  if (!version?.trim() || !title?.trim() || !content?.trim()) {
    res.status(400).json({ error: "version, title and content required" }); return;
  }
  const published = isPublished === true;
  const [item] = await db.insert(appChangelogsTable).values({
    version: version.trim(), title: title.trim(), content: content.trim(),
    isPublished: published, publishedAt: published ? new Date() : null,
  }).returning();
  res.json(item);
});

router.patch("/changelogs/:id", async (req, res) => {
  if (!requireAdmin(req, res)) return;
  const id = Number(req.params.id as string);
  if (!Number.isInteger(id) || id <= 0) { res.status(400).json({ error: "invalid id" }); return; }
  const { version, title, content, isPublished } = req.body ?? {};
  const updates: Record<string, unknown> = {};
  if (version !== undefined) updates.version = version.trim();
  if (title !== undefined) updates.title = title.trim();
  if (content !== undefined) updates.content = content.trim();
  if (isPublished !== undefined) {
    updates.isPublished = isPublished;
    if (isPublished && !updates.publishedAt) updates.publishedAt = new Date();
    if (!isPublished) updates.publishedAt = null;
  }
  const [item] = await db.update(appChangelogsTable).set(updates).where(eq(appChangelogsTable.id, id)).returning();
  if (!item) { res.status(404).json({ error: "not found" }); return; }
  res.json(item);
});

router.delete("/changelogs/:id", async (req, res) => {
  if (!requireAdmin(req, res)) return;
  const id = Number(req.params.id as string);
  if (!Number.isInteger(id) || id <= 0) { res.status(400).json({ error: "invalid id" }); return; }
  await db.delete(appChangelogsTable).where(eq(appChangelogsTable.id, id));
  res.json({ ok: true });
});

// ── Tier Config CRUD ──────────────────────────────────────────────────────────
router.get("/tier-config", async (req, res) => {
  if (!requireAdmin(req, res)) return;
  const rows = await db.select().from(tierConfigTable);
  res.json(rows);
});

router.patch("/tier-config/:tier", async (req, res) => {
  if (!requireAdmin(req, res)) return;
  const tier = req.params.tier as string;
  if (!["free", "plus", "pro"].includes(tier)) {
    res.status(400).json({ error: "tier must be free, plus or pro" }); return;
  }
  const fields = ["entries", "photosPerEntry", "aiCompose", "aiEnhance", "aiChat", "styles"] as const;
  const updates: Record<string, unknown> = { updatedAt: new Date() };
  for (const f of fields) {
    if (req.body[f] !== undefined) {
      const v = Number(req.body[f]);
      if (!Number.isFinite(v) || v < 0) {
        res.status(400).json({ error: `${f} must be a non-negative number` }); return;
      }
      updates[f] = Math.round(v);
    }
  }
  const [row] = await db.update(tierConfigTable).set(updates).where(eq(tierConfigTable.tier, tier)).returning();
  if (!row) { res.status(404).json({ error: "not found" }); return; }
  // Invalidate in-process cache
  const { invalidateTierLimitsCache } = await import("../lib/tiers");
  invalidateTierLimitsCache();
  res.json(row);
});

export default router;
