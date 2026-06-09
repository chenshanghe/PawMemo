import { Router } from "express";
import { db } from "@workspace/db";
import {
  userProfilesTable,
  subscriptionEventsTable,
  diaryEntriesTable,
  photosTable,
  subscriptionOrdersTable,
} from "@workspace/db";
import { eq, desc, ilike, or, count, sql, and, gte } from "drizzle-orm";
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
  const adminId0 = adminIds[0] ?? "";
  const uidCodes = Array.from(normalizedUserId).map(c => c.charCodeAt(0));
  const aidCodes = Array.from(adminId0).map(c => c.charCodeAt(0));
  const match = adminIds.includes(normalizedUserId);
  if (!match) {
    res.status(403).json({
      error: "FORBIDDEN",
      userId,
      normalizedUserId,
      adminId0,
      uidCodes,
      aidCodes,
      uidLen: uidCodes.length,
      aidLen: aidCodes.length,
      firstDiff: uidCodes.findIndex((c, i) => c !== aidCodes[i]),
    });
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

export default router;
