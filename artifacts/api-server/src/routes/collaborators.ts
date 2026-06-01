import { Router } from "express";
import { db } from "@workspace/db";
import { entryCollaboratorsTable, diaryEntriesTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth, AuthedRequest } from "../middlewares/auth";
import { randomBytes } from "crypto";

const router = Router();
router.use(requireAuth);

// GET /entries/:id/collaborators
router.get("/:id/collaborators", async (req, res) => {
  const userId = (req as AuthedRequest).userId;
  const entryId = Number(req.params.id);
  try {
    const [entry] = await db.select().from(diaryEntriesTable)
      .where(and(eq(diaryEntriesTable.id, entryId), eq(diaryEntriesTable.userId, userId)));
    if (!entry) { res.status(404).json({ error: "not found or not your entry" }); return; }

    const collabs = await db.select().from(entryCollaboratorsTable)
      .where(eq(entryCollaboratorsTable.entryId, entryId));
    res.json(collabs);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /entries/:id/collaborators/invite
router.post("/:id/collaborators/invite", async (req, res) => {
  const userId = (req as AuthedRequest).userId;
  const entryId = Number(req.params.id);
  const { inviteeName } = req.body ?? {};
  try {
    const [entry] = await db.select().from(diaryEntriesTable)
      .where(and(eq(diaryEntriesTable.id, entryId), eq(diaryEntriesTable.userId, userId)));
    if (!entry) { res.status(404).json({ error: "not found or not your entry" }); return; }

    const inviteToken = randomBytes(16).toString("hex");
    const [collab] = await db.insert(entryCollaboratorsTable).values({
      entryId,
      inviteToken,
      inviteeName: inviteeName?.trim() ?? null,
      role: "editor",
      status: "pending",
    }).returning();

    const origin = `${req.protocol}://${req.get("host")}`;
    const inviteUrl = `${origin}/collab/${inviteToken}`;
    res.json({ ...collab, inviteUrl });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /collab/:token — accept invite (sets userId + status=accepted)
router.get("/collab/:token", async (req, res) => {
  const acceptorId = (req as AuthedRequest).userId;
  const { token } = req.params;
  try {
    const [collab] = await db.select().from(entryCollaboratorsTable)
      .where(eq(entryCollaboratorsTable.inviteToken, token));
    if (!collab) { res.status(404).json({ error: "invite not found or expired" }); return; }
    if (collab.status === "accepted") { res.json({ ok: true, entryId: collab.entryId, alreadyAccepted: true }); return; }

    const [updated] = await db.update(entryCollaboratorsTable)
      .set({ userId: acceptorId, status: "accepted", acceptedAt: new Date() })
      .where(eq(entryCollaboratorsTable.inviteToken, token))
      .returning();
    res.json({ ok: true, entryId: updated.entryId });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /entries/:id/collaborators/:collabId
router.delete("/:id/collaborators/:collabId", async (req, res) => {
  const userId = (req as AuthedRequest).userId;
  const entryId = Number(req.params.id);
  const collabId = Number(req.params.collabId);
  try {
    const [entry] = await db.select().from(diaryEntriesTable)
      .where(and(eq(diaryEntriesTable.id, entryId), eq(diaryEntriesTable.userId, userId)));
    if (!entry) { res.status(403).json({ error: "forbidden" }); return; }

    await db.delete(entryCollaboratorsTable)
      .where(and(
        eq(entryCollaboratorsTable.id, collabId),
        eq(entryCollaboratorsTable.entryId, entryId)
      ));
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
