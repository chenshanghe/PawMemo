import { pgTable, text, serial, integer, timestamp, date, unique, primaryKey, json, real, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const tagsTable = pgTable("tags", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
});

export const diaryEntriesTable = pgTable("diary_entries", {
  id: serial("id").primaryKey(),
  userId: text("user_id"),
  title: text("title").notNull(),
  destination: text("destination").notNull(),
  content: text("content"),
  coverImage: text("cover_image"),
  mood: text("mood"),
  rating: integer("rating"),
  companions: text("companions"),
  visibility: text("visibility").notNull().default("private"),
  startDate: date("start_date").notNull(),
  endDate: date("end_date"),
  entryType: text("entry_type").notNull().default("note"),
  sourceEntryIds: json("source_entry_ids").$type<number[]>(),
  lat: real("lat"),
  lng: real("lng"),
  weather: json("weather"),
  videoUrl: text("video_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const entryTagsTable = pgTable("entry_tags", {
  entryId: integer("entry_id").notNull().references(() => diaryEntriesTable.id, { onDelete: "cascade" }),
  tagId: integer("tag_id").notNull().references(() => tagsTable.id, { onDelete: "cascade" }),
});

export const photosTable = pgTable("photos", {
  id: serial("id").primaryKey(),
  entryId: integer("entry_id").notNull().references(() => diaryEntriesTable.id, { onDelete: "cascade" }),
  url: text("url").notNull(),
  caption: text("caption"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertTagSchema = createInsertSchema(tagsTable).omit({ id: true });
export type InsertTag = z.infer<typeof insertTagSchema>;
export type Tag = typeof tagsTable.$inferSelect;

export const insertEntrySchema = createInsertSchema(diaryEntriesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertEntry = z.infer<typeof insertEntrySchema>;
export type DiaryEntry = typeof diaryEntriesTable.$inferSelect;

export const insertPhotoSchema = createInsertSchema(photosTable).omit({ id: true, createdAt: true });
export type InsertPhoto = z.infer<typeof insertPhotoSchema>;
export type Photo = typeof photosTable.$inferSelect;

export const entrySharesTable = pgTable("entry_shares", {
  id: serial("id").primaryKey(),
  entryId: integer("entry_id").notNull().references(() => diaryEntriesTable.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const entryLikesTable = pgTable("entry_likes", {
  id: serial("id").primaryKey(),
  entryId: integer("entry_id").notNull().references(() => diaryEntriesTable.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const entryCommentsTable = pgTable("entry_comments", {
  id: serial("id").primaryKey(),
  entryId: integer("entry_id").notNull().references(() => diaryEntriesTable.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull(),
  userName: text("user_name").notNull(),
  userAvatar: text("user_avatar"),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type EntryShare = typeof entrySharesTable.$inferSelect;
export type EntryLike = typeof entryLikesTable.$inferSelect;
export type EntryComment = typeof entryCommentsTable.$inferSelect;

// ── Profile / follow / favorite ─────────────────────────────────────────────
// Lightweight profile cache, kept in sync from Clerk session on every authed
// request. We don't rely on Clerk to be reachable when rendering authors.
export const userProfilesTable = pgTable("user_profiles", {
  userId: text("user_id").primaryKey(),
  name: text("name").notNull(),
  avatar: text("avatar"),
  bio: text("bio"),
  email: text("email"),
  subscriptionTier: text("subscription_tier").notNull().default("free"),
  subscriptionExpiresAt: timestamp("subscription_expires_at"),
  aiComposeUsed: integer("ai_compose_used").notNull().default(0),
  aiComposeResetAt: timestamp("ai_compose_reset_at"),
  aiEnhanceUsed: integer("ai_enhance_used").notNull().default(0),
  aiEnhanceResetAt: timestamp("ai_enhance_reset_at"),
  weeklyDigest: boolean("weekly_digest").notNull().default(false),
  cancelAtPeriodEnd: boolean("cancel_at_period_end").notNull().default(false),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const userFollowsTable = pgTable(
  "user_follows",
  {
    followerId: text("follower_id").notNull(),
    followeeId: text("followee_id").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.followerId, t.followeeId] }),
  }),
);

export const entryFavoritesTable = pgTable(
  "entry_favorites",
  {
    userId: text("user_id").notNull(),
    entryId: integer("entry_id")
      .notNull()
      .references(() => diaryEntriesTable.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.userId, t.entryId] }),
  }),
);

export type UserProfile = typeof userProfilesTable.$inferSelect;
export type UserFollow = typeof userFollowsTable.$inferSelect;
export type EntryFavorite = typeof entryFavoritesTable.$inferSelect;

// ── Compose style presets ────────────────────────────────────────────────────
export const composeStylesTable = pgTable("compose_styles", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  name: text("name").notNull(),
  style: text("style").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type ComposeStyle = typeof composeStylesTable.$inferSelect;

// ── Saved AI plans ──────────────────────────────────────────────────────────
export const savedPlansTable = pgTable("saved_plans", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  title: text("title").notNull(),
  summary: text("summary"),
  from: text("from_city").notNull(),
  destinations: json("destinations").$type<string[]>().notNull(),
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  travelers: integer("travelers").notNull().default(2),
  style: text("style"),
  travelMode: text("travel_mode"),
  budget: text("budget"),
  specialNeeds: json("special_needs").$type<string[]>().default([]),
  groupType: text("group_type"),
  planData: json("plan_data").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  lastViewedAt: timestamp("last_viewed_at"),
});

export type SavedPlan = typeof savedPlansTable.$inferSelect;

// ── Subscription orders ──────────────────────────────────────────────────────
export const subscriptionOrdersTable = pgTable("subscription_orders", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  outTradeNo: text("out_trade_no").notNull().unique(),
  tier: text("tier").notNull(),
  period: text("period").notNull().default("monthly"),
  amountCents: integer("amount_cents").notNull(),
  status: text("status").notNull().default("pending"),
  tradeNo: text("alipay_trade_no"),
  qrCodeUrl: text("qr_code_url"),
  paidAt: timestamp("paid_at"),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type SubscriptionOrder = typeof subscriptionOrdersTable.$inferSelect;

// ── Notifications ─────────────────────────────────────────────────────────────
export const notificationsTable = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  type: text("type").notNull(), // 'like' | 'comment' | 'follow'
  actorId: text("actor_id").notNull(),
  actorName: text("actor_name").notNull(),
  actorAvatar: text("actor_avatar"),
  entryId: integer("entry_id"),
  entryTitle: text("entry_title"),
  body: text("body").notNull(),
  read: boolean("read").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Notification = typeof notificationsTable.$inferSelect;

// ── Collections ───────────────────────────────────────────────────────────────
export const collectionsTable = pgTable("collections", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  coverImage: text("cover_image"),
  visibility: text("visibility").notNull().default("private"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const collectionEntriesTable = pgTable("collection_entries", {
  id: serial("id").primaryKey(),
  collectionId: integer("collection_id").notNull(),
  entryId: integer("entry_id").notNull(),
  addedAt: timestamp("added_at").defaultNow().notNull(),
});

export type Collection = typeof collectionsTable.$inferSelect;
export type CollectionEntry = typeof collectionEntriesTable.$inferSelect;

// ── User travel preferences ───────────────────────────────────────────────────
export const userPrefsTable = pgTable("user_prefs", {
  userId: text("user_id").primaryKey(),
  travelMode: text("travel_mode").notNull().default(""),
  budget: text("budget").notNull().default(""),
  specialNeeds: json("special_needs").$type<string[]>().notNull().default([]),
  fromCity: text("from_city").notNull().default(""),
  travelStyle: text("travel_style").notNull().default(""),
  travelersCount: integer("travelers_count").notNull().default(2),
  groupType: text("group_type").notNull().default(""),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type UserPref = typeof userPrefsTable.$inferSelect;

// ── Entry Collaborators ───────────────────────────────────────────────────────
export const entryCollaboratorsTable = pgTable("entry_collaborators", {
  id: serial("id").primaryKey(),
  entryId: integer("entry_id").notNull(),
  userId: text("user_id"),
  inviteToken: text("invite_token").notNull().unique(),
  role: text("role").notNull().default("editor"),
  status: text("status").notNull().default("pending"),
  inviteeName: text("invitee_name"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  acceptedAt: timestamp("accepted_at"),
});

export type EntryCollaborator = typeof entryCollaboratorsTable.$inferSelect;

// ── User Feedback ─────────────────────────────────────────────────────────────
export const feedbackTable = pgTable("feedback", {
  id: serial("id").primaryKey(),
  userId: text("user_id"),
  type: text("type").notNull().default("other"),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Feedback = typeof feedbackTable.$inferSelect;

// ── Safety / Moderation ───────────────────────────────────────────────────────
export const userBlocksTable = pgTable(
  "user_blocks",
  {
    blockerId: text("blocker_id").notNull(),
    blockedId: text("blocked_id").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.blockerId, t.blockedId] }),
  }),
);

export const contentReportsTable = pgTable("content_reports", {
  id: serial("id").primaryKey(),
  reporterId: text("reporter_id").notNull(),
  targetType: text("target_type").notNull(),
  targetId: text("target_id").notNull(),
  reason: text("reason").notNull(),
  details: text("details"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type UserBlock = typeof userBlocksTable.$inferSelect;
export type ContentReport = typeof contentReportsTable.$inferSelect;
