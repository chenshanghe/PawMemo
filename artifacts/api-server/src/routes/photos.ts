import { Router } from "express";
import { db } from "@workspace/db";
import { photosTable, diaryEntriesTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { DeletePhotoParams } from "@workspace/api-zod";
import { requireAuth, AuthedRequest } from "../middlewares/auth";

const router = Router();

router.use(requireAuth);

// DELETE /photos/:photoId
router.delete("/:photoId", async (req, res) => {
  const userId = (req as AuthedRequest).userId;
  const parsed = DeletePhotoParams.safeParse({ photoId: Number(req.params.photoId) });
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid photoId" });
    return;
  }
  const [photo] = await db
    .select()
    .from(photosTable)
    .where(eq(photosTable.id, parsed.data.photoId));
  if (!photo) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  const [entry] = await db
    .select()
    .from(diaryEntriesTable)
    .where(and(eq(diaryEntriesTable.id, photo.entryId), eq(diaryEntriesTable.userId, userId)));
  if (!entry) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  await db.delete(photosTable).where(and(eq(photosTable.id, parsed.data.photoId), eq(photosTable.entryId, entry.id)));
  res.status(204).send();
});

export default router;
