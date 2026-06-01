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
    });
  } catch (err: any) {
    console.error("[prefs/get] error:", err);
    res.status(500).json({ error: "获取失败" });
  }
});

router.put("/prefs", requireAuth, async (req, res) => {
  const { userId } = getAuth(req);
  if (!userId) { res.status(401).json({ error: "未登录" }); return; }

  const { travelMode, budget, specialNeeds, fromCity, travelStyle } = req.body ?? {};

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
