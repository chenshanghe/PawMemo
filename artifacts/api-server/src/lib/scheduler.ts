import { db } from "@workspace/db";
import { userProfilesTable, diaryEntriesTable } from "@workspace/db";
import { eq, and, gte } from "drizzle-orm";
import { sendEmail, buildWeeklyDigestEmail } from "./email";
import { logger } from "./logger";

export async function sendWeeklyDigests() {
  logger.info("Running weekly digest job");
  const optedIn = await db
    .select()
    .from(userProfilesTable)
    .where(eq(userProfilesTable.weeklyDigest, true));

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const dateStr = sevenDaysAgo.toISOString().slice(0, 10);

  let sent = 0;
  for (const profile of optedIn) {
    if (!profile.email) continue;
    const entries = await db
      .select()
      .from(diaryEntriesTable)
      .where(
        and(
          eq(diaryEntriesTable.userId, profile.userId),
          gte(diaryEntriesTable.startDate, dateStr),
        ),
      )
      .limit(10);
    if (entries.length === 0) continue;
    const { subject, html } = buildWeeklyDigestEmail({ name: profile.name, entries });
    await sendEmail({ to: profile.email, subject, html });
    sent++;
  }
  logger.info({ sent, total: optedIn.length }, "Weekly digest job done");
}

export function scheduleWeeklyDigest() {
  function msUntilNextSundayEvening(): number {
    const now = new Date();
    // Beijing = UTC+8; target: Sunday 21:00 Beijing = Sunday 13:00 UTC
    const target = new Date(now);
    const utcDay = target.getUTCDay(); // 0 = Sunday
    const daysUntilSunday = utcDay === 0 ? 0 : 7 - utcDay;
    target.setUTCDate(target.getUTCDate() + daysUntilSunday);
    target.setUTCHours(13, 0, 0, 0);
    if (target <= now) target.setUTCDate(target.getUTCDate() + 7);
    return target.getTime() - now.getTime();
  }

  function scheduleNext() {
    const ms = msUntilNextSundayEvening();
    logger.info({ hoursUntilDigest: +(ms / 3600000).toFixed(1) }, "Next weekly digest scheduled");
    setTimeout(async () => {
      try {
        await sendWeeklyDigests();
      } catch (err) {
        logger.error({ err }, "Weekly digest failed");
      }
      scheduleNext();
    }, ms);
  }

  scheduleNext();
}
