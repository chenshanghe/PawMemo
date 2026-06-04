import { Router } from "express";
import { requireAuth } from "../middlewares/auth";
import { getAuth } from "@clerk/express";
import { db } from "@workspace/db";
import { userPrefsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

const router = Router();

router.get("/prefs", requireAuth, async (req, res) => {
  const { userId } = getAuth(req);
  if (!userId) { res.status(401).json({ error: "未登录" }); return; }

  try {
    const [row] = await db
      .select()
      .from(userPrefsTable)
      .where(eq(userPrefsTable.userId, userId));
    if (!row) { res.json(null); return; }
    res.json({
      travelMode: row.travelMode,
      budget: row.budget,
      specialNeeds: row.specialNeeds,
      fromCity: row.fromCity,
      travelStyle: row.travelStyle,
      travelers: row.travelersCount,
      groupType: row.groupType,
    });
  } catch (err: any) {
    console.error("[prefs/get] error:", err);
    res.status(500).json({ error: "获取失败" });
  }
});

router.put("/prefs", requireAuth, async (req, res) => {
  const { userId } = getAuth(req);
  if (!userId) { res.status(401).json({ error: "未登录" }); return; }

  const { travelMode, budget, specialNeeds, fromCity, travelStyle, travelers, groupType } = req.body ?? {};
  const travelersCount = typeof travelers === "number" && travelers >= 1 ? travelers : 2;
  const validGroupTypes = ["solo", "couple", "family", "friends"];
  const groupTypeVal = validGroupTypes.includes(groupType) ? groupType : "";

  try {
    await db
      .insert(userPrefsTable)
      .values({
        userId,
        travelMode: travelMode ?? "",
        budget: budget ?? "",
        specialNeeds: Array.isArray(specialNeeds) ? specialNeeds : [],
        fromCity: fromCity ?? "",
        travelStyle: travelStyle ?? "",
        travelersCount,
        groupType: groupTypeVal,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: userPrefsTable.userId,
        set: {
          travelMode: travelMode ?? "",
          budget: budget ?? "",
          specialNeeds: Array.isArray(specialNeeds) ? specialNeeds : [],
          fromCity: fromCity ?? "",
          travelStyle: travelStyle ?? "",
          travelersCount,
          groupType: groupTypeVal,
          updatedAt: new Date(),
        },
      });
    res.json({ ok: true });
  } catch (err: any) {
    console.error("[prefs/put] error:", err);
    res.status(500).json({ error: "保存失败" });
  }
});

export default router;
