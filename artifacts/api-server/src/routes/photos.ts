import { Router } from "express";
import { db } from "@workspace/db";
import { photosTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { DeletePhotoParams } from "@workspace/api-zod";

const router = Router();

// DELETE /photos/:photoId
router.delete("/:photoId", async (req, res) => {
  const parsed = DeletePhotoParams.safeParse({ photoId: Number(req.params.photoId) });
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid photoId" });
    return;
  }
  await db.delete(photosTable).where(eq(photosTable.id, parsed.data.photoId));
  res.status(204).send();
});

export default router;
