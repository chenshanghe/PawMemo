import { Router } from "express";
import path from "path";
import fs from "fs";

const router = Router();

const FILES: Record<string, { filename: string; label: string }> = {
  prd: {
    filename: "顽童日记_PRD.docx",
    label: "顽童日记_PRD.docx",
  },
  roadmap: {
    filename: "顽童日记_产品规划.docx",
    label: "顽童日记_产品规划.docx",
  },
};

router.get("/downloads/:key", (req, res) => {
  const key = req.params.key as string;
  const entry = FILES[key];
  if (!entry) {
    res.status(404).json({ error: "File not found" });
    return;
  }
  const filePath = path.resolve(process.cwd(), "downloads", entry.filename);
  if (!fs.existsSync(filePath)) {
    res.status(404).json({ error: "File not ready" });
    return;
  }
  res.setHeader(
    "Content-Disposition",
    `attachment; filename*=UTF-8''${encodeURIComponent(entry.label)}`
  );
  res.setHeader(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  );
  res.sendFile(filePath);
});

export default router;
