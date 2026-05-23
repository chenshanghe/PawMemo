import { pgTable, text, serial, integer, timestamp, date, unique } from "drizzle-orm/pg-core";
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
