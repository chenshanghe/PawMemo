import { Router } from "express";
import { db } from "@workspace/db";
import { diaryEntriesTable, userProfilesTable } from "@workspace/db";
import { eq, and, gte } from "drizzle-orm";
import { requireAuth, AuthedRequest } from "../middlewares/auth";
import { sendEmail, buildWeeklyDigestEmail } from "../lib/email";

const router = Router();

// POST /api/digest/send — send weekly digest to the current user right now
router.post("/digest/send", requireAuth, async (req, res) => {
  const userId = (req as AuthedRequest).userId;
  const [profile] = await db
    .select()
    .from(userProfilesTable)
    .where(eq(userProfilesTable.userId, userId));

  if (!profile?.email) {
    res.status(400).json({ error: "No email address on record" });
    return;
  }

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const entries = await db
    .select()
    .from(diaryEntriesTable)
    .where(
      and(
        eq(diaryEntriesTable.userId, userId),
        gte(diaryEntriesTable.startDate, sevenDaysAgo.toISOString().slice(0, 10)),
      ),
    )
    .limit(10);

  const { subject, html } = buildWeeklyDigestEmail({ name: profile.name, entries });
  await sendEmail({ to: profile.email, subject, html });
  res.json({ ok: true, to: profile.email, entryCount: entries.length });
});

// GET /api/digest/preview — returns the HTML so the browser can preview it
router.get("/digest/preview", requireAuth, async (req, res) => {
  const userId = (req as AuthedRequest).userId;
  const [profile] = await db
    .select()
    .from(userProfilesTable)
    .where(eq(userProfilesTable.userId, userId));

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const entries = await db
    .select()
    .from(diaryEntriesTable)
    .where(
      and(
        eq(diaryEntriesTable.userId, userId),
        gte(diaryEntriesTable.startDate, sevenDaysAgo.toISOString().slice(0, 10)),
      ),
    )
    .limit(10);

  const { html } = buildWeeklyDigestEmail({ name: profile?.name ?? "旅行者", entries });
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.send(html);
});

export default router;
