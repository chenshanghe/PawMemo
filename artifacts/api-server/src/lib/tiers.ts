import { db } from "@workspace/db";
import { userProfilesTable, tierConfigTable } from "@workspace/db";
import { eq } from "drizzle-orm";

export type Tier = "free" | "pro" | "plus";

export interface TierLimits {
  entries: number;
  photosPerEntry: number;
  aiCompose: number;
  aiEnhance: number;
  aiChat: number;
  styles: number;
}

export const INF = 999999;

// Fallback hardcoded limits (used if DB unavailable)
const DEFAULT_TIER_LIMITS: Record<Tier, TierLimits> = {
  free: { entries: 20, photosPerEntry: 3,  aiCompose: 3,   aiEnhance: 5,   aiChat: 30,   styles: 3 },
  pro:  { entries: INF, photosPerEntry: 9,  aiCompose: 30,  aiEnhance: 100, aiChat: 500,  styles: INF },
  plus: { entries: INF, photosPerEntry: 30, aiCompose: 100, aiEnhance: 300, aiChat: 1500, styles: INF },
};

// 60-second in-memory cache for tier limits
let tierLimitsCache: { limits: Record<Tier, TierLimits>; expiresAt: number } | null = null;

export async function getTierLimits(): Promise<Record<Tier, TierLimits>> {
  const now = Date.now();
  if (tierLimitsCache && now < tierLimitsCache.expiresAt) return tierLimitsCache.limits;
  try {
    const rows = await db.select().from(tierConfigTable);
    if (rows.length === 0) return DEFAULT_TIER_LIMITS;
    const limits = { ...DEFAULT_TIER_LIMITS };
    for (const row of rows) {
      if (row.tier === "free" || row.tier === "plus" || row.tier === "pro") {
        limits[row.tier] = {
          entries: row.entries,
          photosPerEntry: row.photosPerEntry,
          aiCompose: row.aiCompose,
          aiEnhance: row.aiEnhance,
          aiChat: row.aiChat,
          styles: row.styles,
        };
      }
    }
    tierLimitsCache = { limits, expiresAt: now + 60_000 };
    return limits;
  } catch {
    return DEFAULT_TIER_LIMITS;
  }
}

export function invalidateTierLimitsCache() {
  tierLimitsCache = null;
}

export const TIER_LIMITS: Record<Tier, TierLimits> = DEFAULT_TIER_LIMITS;

export const TIER_NAMES: Record<Tier, string> = {
  free: "旅行者",
  pro:  "探索家 Pro",
  plus: "旅记大师 Plus",
};

function isValidTier(t: string): t is Tier {
  return t === "free" || t === "pro" || t === "plus";
}

function isExpired(profile: { subscriptionExpiresAt: Date | null; subscriptionTier: string }): boolean {
  if (profile.subscriptionTier === "free") return false;
  if (!profile.subscriptionExpiresAt) return false;
  return new Date() > profile.subscriptionExpiresAt;
}

function startOfMonth(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

export async function getUserTier(userId: string): Promise<{ tier: Tier; limits: TierLimits; profile: typeof userProfilesTable.$inferSelect | null }> {
  const [[profile], tierLimits] = await Promise.all([
    db.select().from(userProfilesTable).where(eq(userProfilesTable.userId, userId)),
    getTierLimits(),
  ]);

  if (!profile) return { tier: "free", limits: tierLimits.free, profile: null };

  let tier: Tier = "free";
  if (isValidTier(profile.subscriptionTier) && !isExpired(profile)) {
    tier = profile.subscriptionTier as Tier;
  } else if (isExpired(profile)) {
    await db
      .update(userProfilesTable)
      .set({ subscriptionTier: "free", subscriptionExpiresAt: null })
      .where(eq(userProfilesTable.userId, userId));
    import("../lib/sub-events").then(m =>
      m.logSubEvent({ userId, eventType: "expired", fromTier: profile.subscriptionTier, toTier: "free" })
    ).catch(() => {});
  }

  return { tier, limits: tierLimits[tier], profile };
}

export async function checkAndIncrAiCompose(userId: string): Promise<
  { ok: true; used: number; limit: number; tier: Tier } |
  { ok: false; used: number; limit: number; tier: Tier }
> {
  const { tier, limits, profile } = await getUserTier(userId);

  const resetPoint = startOfMonth();
  const lastReset = profile?.aiComposeResetAt ?? null;
  const needsReset = !lastReset || lastReset < resetPoint;

  let used = needsReset ? 0 : (profile?.aiComposeUsed ?? 0);

  if (used >= limits.aiCompose) {
    return { ok: false, used, limit: limits.aiCompose, tier };
  }

  if (needsReset) {
    await db
      .update(userProfilesTable)
      .set({ aiComposeUsed: 1, aiComposeResetAt: new Date() })
      .where(eq(userProfilesTable.userId, userId));
  } else {
    await db
      .update(userProfilesTable)
      .set({ aiComposeUsed: used + 1 })
      .where(eq(userProfilesTable.userId, userId));
  }

  return { ok: true, used: used + 1, limit: limits.aiCompose, tier };
}

export async function getAiComposeUsage(userId: string): Promise<{ used: number; limit: number; tier: Tier }> {
  const { tier, limits, profile } = await getUserTier(userId);
  const resetPoint = startOfMonth();
  const lastReset = profile?.aiComposeResetAt ?? null;
  const needsReset = !lastReset || lastReset < resetPoint;
  const used = needsReset ? 0 : (profile?.aiComposeUsed ?? 0);
  return { used, limit: limits.aiCompose, tier };
}

export async function checkAndIncrAiEnhance(userId: string): Promise<
  { ok: true; used: number; limit: number; tier: Tier } |
  { ok: false; used: number; limit: number; tier: Tier }
> {
  const { tier, limits, profile } = await getUserTier(userId);

  const resetPoint = startOfMonth();
  const lastReset = profile?.aiEnhanceResetAt ?? null;
  const needsReset = !lastReset || lastReset < resetPoint;

  let used = needsReset ? 0 : (profile?.aiEnhanceUsed ?? 0);

  if (used >= limits.aiEnhance) {
    return { ok: false, used, limit: limits.aiEnhance, tier };
  }

  if (needsReset) {
    await db
      .update(userProfilesTable)
      .set({ aiEnhanceUsed: 1, aiEnhanceResetAt: new Date() })
      .where(eq(userProfilesTable.userId, userId));
  } else {
    await db
      .update(userProfilesTable)
      .set({ aiEnhanceUsed: used + 1 })
      .where(eq(userProfilesTable.userId, userId));
  }

  return { ok: true, used: used + 1, limit: limits.aiEnhance, tier };
}

export async function getAiEnhanceUsage(userId: string): Promise<{ used: number; limit: number; tier: Tier }> {
  const { tier, limits, profile } = await getUserTier(userId);
  const resetPoint = startOfMonth();
  const lastReset = profile?.aiEnhanceResetAt ?? null;
  const needsReset = !lastReset || lastReset < resetPoint;
  const used = needsReset ? 0 : (profile?.aiEnhanceUsed ?? 0);
  return { used, limit: limits.aiEnhance, tier };
}

export async function checkAndIncrAiChat(userId: string): Promise<
  { ok: true; used: number; limit: number; tier: Tier } |
  { ok: false; used: number; limit: number; tier: Tier }
> {
  const { tier, limits, profile } = await getUserTier(userId);

  if (limits.aiChat >= 999999) {
    return { ok: true, used: 0, limit: limits.aiChat, tier };
  }

  const resetPoint = startOfMonth();
  const lastReset = profile?.aiChatResetAt ?? null;
  const needsReset = !lastReset || lastReset < resetPoint;

  let used = needsReset ? 0 : (profile?.aiChatUsed ?? 0);

  if (used >= limits.aiChat) {
    return { ok: false, used, limit: limits.aiChat, tier };
  }

  if (needsReset) {
    await db
      .update(userProfilesTable)
      .set({ aiChatUsed: 1, aiChatResetAt: new Date() })
      .where(eq(userProfilesTable.userId, userId));
  } else {
    await db
      .update(userProfilesTable)
      .set({ aiChatUsed: used + 1 })
      .where(eq(userProfilesTable.userId, userId));
  }

  return { ok: true, used: used + 1, limit: limits.aiChat, tier };
}

export async function getAiChatUsage(userId: string): Promise<{ used: number; limit: number; tier: Tier }> {
  const { tier, limits, profile } = await getUserTier(userId);
  if (limits.aiChat >= 999999) return { used: 0, limit: limits.aiChat, tier };
  const resetPoint = startOfMonth();
  const lastReset = profile?.aiChatResetAt ?? null;
  const needsReset = !lastReset || lastReset < resetPoint;
  const used = needsReset ? 0 : (profile?.aiChatUsed ?? 0);
  return { used, limit: limits.aiChat, tier };
}
