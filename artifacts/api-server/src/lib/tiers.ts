import { db } from "@workspace/db";
import { userProfilesTable } from "@workspace/db";
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

const INF = 999999;

export const TIER_LIMITS: Record<Tier, TierLimits> = {
  free: { entries: 20, photosPerEntry: 3, aiCompose: 3,   aiEnhance: 5,   aiChat: 30,  styles: 3 },
  plus: { entries: INF, photosPerEntry: 9, aiCompose: 30,  aiEnhance: 100, aiChat: 200, styles: INF },
  pro:  { entries: INF, photosPerEntry: 30, aiCompose: 100, aiEnhance: 300, aiChat: INF, styles: INF },
};

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
  const [profile] = await db
    .select()
    .from(userProfilesTable)
    .where(eq(userProfilesTable.userId, userId));

  if (!profile) return { tier: "free", limits: TIER_LIMITS.free, profile: null };

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

  return { tier, limits: TIER_LIMITS[tier], profile };
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
