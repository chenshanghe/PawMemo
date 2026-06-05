import { Router, type IRouter, type Request, type Response } from "express";
import { Readable } from "stream";
import {
  RequestUploadUrlBody,
  RequestUploadUrlResponse,
} from "@workspace/api-zod";
import { ObjectStorageService, ObjectNotFoundError } from "../lib/objectStorage";
import { ObjectPermission } from "../lib/objectAcl";
import { requireAuth } from "../middlewares/auth";
import { db } from "@workspace/db";
import { photosTable, diaryEntriesTable, entrySharesTable, userProfilesTable } from "@workspace/db";
import { eq, and, inArray } from "drizzle-orm";
import { getAuth } from "@clerk/express";

function parseBatchUploadBody(body: unknown):
  | { files: { name: string; size: number; contentType: string }[] }
  | null {
  if (!body || typeof body !== "object") return null;
  const files = (body as { files?: unknown }).files;
  if (!Array.isArray(files) || files.length === 0 || files.length > 30) return null;
  const out: { name: string; size: number; contentType: string }[] = [];
  for (const f of files) {
    if (!f || typeof f !== "object") return null;
    const { name, size, contentType } = f as Record<string, unknown>;
    if (typeof name !== "string" || typeof size !== "number" || typeof contentType !== "string") {
      return null;
    }
    out.push({ name, size, contentType });
  }
  return { files: out };
}

// ── ACL result cache ─────────────────────────────────────────────────────────
// Caches the ACL decision (allow / deny / not_found) for each
// (storedUrl, callerId, shareToken) triple to avoid 2+ DB queries per image
// request on hot pages. TTL 60 s — permission changes propagate within one
// minute. Only "allow" and "not_found" are cached; "deny" is also cached so
// repeated probing doesn't hammer the DB. Cache is process-local (single
// instance), which is fine for the current single-server deployment.
const ACL_CACHE_TTL_MS = 60_000;
type AclDecision = "allow" | "deny" | "not_found";

const aclCache = new Map<string, { decision: AclDecision; expiresAt: number }>();

function aclCacheKey(
  storedUrl: string,
  callerId: string | null,
  shareToken: string | null,
): string {
  return `${storedUrl}|${callerId ?? ""}|${shareToken ?? ""}`;
}

function aclCacheLookup(key: string): AclDecision | null {
  const entry = aclCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    aclCache.delete(key);
    return null;
  }
  return entry.decision;
}

function aclCacheSet(key: string, decision: AclDecision): void {
  aclCache.set(key, { decision, expiresAt: Date.now() + ACL_CACHE_TTL_MS });
}

// Periodically evict expired entries to prevent unbounded growth.
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of aclCache) {
    if (now > entry.expiresAt) aclCache.delete(key);
  }
}, 120_000);

const router: IRouter = Router();
const objectStorageService = new ObjectStorageService();

/**
 * POST /storage/uploads/request-url
 *
 * Request a presigned URL for file upload.
 * The client sends JSON metadata (name, size, contentType) — NOT the file.
 * Then uploads the file directly to the returned presigned URL.
 */
router.post("/storage/uploads/request-url", requireAuth, async (req: Request, res: Response) => {
  const parsed = RequestUploadUrlBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Missing or invalid required fields" });
    return;
  }

  try {
    const { name, size, contentType } = parsed.data;

    const uploadURL = await objectStorageService.getObjectEntityUploadURL();
    const objectPath = objectStorageService.normalizeObjectEntityPath(uploadURL);

    res.json(
      RequestUploadUrlResponse.parse({
        uploadURL,
        objectPath,
        metadata: { name, size, contentType },
      }),
    );
  } catch (error) {
    req.log.error({ err: error }, "Error generating upload URL");
    res.status(500).json({ error: "Failed to generate upload URL" });
  }
});

/**
 * POST /storage/uploads/request-urls
 *
 * Batched variant — returns N presigned URLs in one round-trip.
 * Client sends `{ files: [{name,size,contentType}, ...] }` and gets back
 * `{ items: [{uploadURL, objectPath, metadata}, ...] }` in the same order.
 */
router.post("/storage/uploads/request-urls", requireAuth, async (req: Request, res: Response) => {
  const parsed = parseBatchUploadBody(req.body);
  if (!parsed) {
    res.status(400).json({ error: "Missing or invalid required fields" });
    return;
  }

  try {
    const items = await Promise.all(
      parsed.files.map(async (f) => {
        const uploadURL = await objectStorageService.getObjectEntityUploadURL();
        const objectPath = objectStorageService.normalizeObjectEntityPath(uploadURL);
        return { uploadURL, objectPath, metadata: f };
      }),
    );
    res.json({ items });
  } catch (error) {
    req.log.error({ err: error }, "Error generating batch upload URLs");
    res.status(500).json({ error: "Failed to generate upload URLs" });
  }
});

/**
 * GET /storage/public-objects/*
 *
 * Serve public assets from PUBLIC_OBJECT_SEARCH_PATHS.
 * These are unconditionally public — no authentication or ACL checks.
 * IMPORTANT: Always provide this endpoint when object storage is set up.
 */
router.get("/storage/public-objects/*filePath", async (req: Request, res: Response) => {
  try {
    const raw = req.params.filePath;
    const filePath = Array.isArray(raw) ? raw.join("/") : raw;
    const file = await objectStorageService.searchPublicObject(filePath);
    if (!file) {
      res.status(404).json({ error: "File not found" });
      return;
    }

    const response = await objectStorageService.downloadObject(file);

    res.status(response.status);
    response.headers.forEach((value, key) => res.setHeader(key, value));
    // Public assets are immutable (content-addressed paths); cache aggressively.
    res.setHeader("Cache-Control", "public, max-age=86400, stale-while-revalidate=86400");

    if (response.body) {
      const nodeStream = Readable.fromWeb(response.body as ReadableStream<Uint8Array>);
      nodeStream.pipe(res);
    } else {
      res.end();
    }
  } catch (error) {
    req.log.error({ err: error }, "Error serving public object");
    res.status(500).json({ error: "Failed to serve public object" });
  }
});

/**
 * GET /storage/objects/*
 *
 * Serve object entities from PRIVATE_OBJECT_DIR.
 * These are served from a separate path from /public-objects and can optionally
 * be protected with authentication or ACL checks based on the use case.
 */
router.get("/storage/objects/*path", async (req: Request, res: Response) => {
  try {
    const raw = req.params.path;
    const wildcardPath = Array.isArray(raw) ? raw.join("/") : raw;
    const objectPath = `/objects/${wildcardPath}`;

    // Enforce diary entry visibility before serving any private object.
    // The URL stored in the database is `/api/storage/objects/<wildcardPath>`.
    const storedUrl = `/api/storage/objects/${wildcardPath}`;

    // Determine caller identity once (needed for cache key and ACL check).
    const auth = getAuth(req);
    const callerId = (auth?.sessionClaims?.userId as string) || auth?.userId || null;
    const rawShareToken = req.query.shareToken;
    const shareToken = typeof rawShareToken === "string"
      ? rawShareToken
      : Array.isArray(rawShareToken) && typeof rawShareToken[0] === "string"
        ? rawShareToken[0]
        : null;

    const cacheKey = aclCacheKey(storedUrl, callerId, shareToken);
    const cached = aclCacheLookup(cacheKey);

    if (cached === "not_found") {
      res.status(404).json({ error: "Object not found" });
      return;
    }
    if (cached === "deny") {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    if (cached !== "allow") {
      // Cache miss — run the full ACL check.

      // Collect ALL entries that reference this object URL (photos table + cover
      // image column). Using all matching rows rather than limit(1) prevents a
      // policy-bypass if the same URL is somehow stored on multiple entries.
      const [photoRows, coverRows] = await Promise.all([
        db.select({ entryId: photosTable.entryId })
          .from(photosTable)
          .where(eq(photosTable.url, storedUrl)),
        db.select({ id: diaryEntriesTable.id })
          .from(diaryEntriesTable)
          .where(eq(diaryEntriesTable.coverImage, storedUrl)),
      ]);

      const entryIds = Array.from(new Set([
        ...photoRows.map(r => r.entryId),
        ...coverRows.map(r => r.id),
      ]));

      if (entryIds.length === 0) {
        // Object not in any diary entry — check if it is a user profile avatar.
        // Avatars are public (shown on author cards, square feed, etc.) so any
        // match here serves the file without further auth checks.
        const [avatarRow] = await db
          .select({ userId: userProfilesTable.userId })
          .from(userProfilesTable)
          .where(eq(userProfilesTable.avatar, storedUrl))
          .limit(1);

        if (!avatarRow) {
          // Not referenced by any known entity — deny (fail closed).
          aclCacheSet(cacheKey, "not_found");
          res.status(404).json({ error: "Object not found" });
          return;
        }
        // Avatar found — allow unconditionally.
        aclCacheSet(cacheKey, "allow");
      } else {
        // Object belongs to one or more diary entries: enforce diary visibility.
        const owningEntries = await db
          .select({ id: diaryEntriesTable.id, visibility: diaryEntriesTable.visibility, userId: diaryEntriesTable.userId })
          .from(diaryEntriesTable)
          .where(inArray(diaryEntriesTable.id, entryIds));

        if (owningEntries.length === 0) {
          aclCacheSet(cacheKey, "not_found");
          res.status(404).json({ error: "Object not found" });
          return;
        }

        // The caller must satisfy the access policy for EVERY owning entry
        // (most-restrictive wins). Policy per entry:
        //   owner         → allowed
        //   public        → allowed
        //   share         → allowed (entry is intentionally shared; image URLs
        //                   are opaque UUIDs and the share token gates the page)
        //   share + valid token → also allowed (legacy / extra check)
        //   otherwise     → 403
        for (const owningEntry of owningEntries) {
          if (callerId && callerId === owningEntry.userId) continue;
          if (owningEntry.visibility === "public") continue;
          if (owningEntry.visibility === "share") continue;
          if (shareToken) {
            const [shareRecord] = await db
              .select({ id: entrySharesTable.id })
              .from(entrySharesTable)
              .where(and(
                eq(entrySharesTable.token, shareToken),
                eq(entrySharesTable.entryId, owningEntry.id),
              ));
            if (shareRecord) continue;
          }
          aclCacheSet(cacheKey, "deny");
          res.status(403).json({ error: "Forbidden" });
          return;
        }

        aclCacheSet(cacheKey, "allow");
      }
    }

    const objectFile = await objectStorageService.getObjectEntityFile(objectPath);
    const response = await objectStorageService.downloadObject(objectFile);

    res.status(response.status);
    response.headers.forEach((value, key) => res.setHeader(key, value));
    // Private objects are user-specific; allow browser to cache for 1 hour.
    // The path contains a UUID so there is no risk of stale content after edits
    // (new uploads get new paths). The ACL cache TTL (60 s) is shorter than
    // this, so a revoked-access user gets a 403 on any re-fetch after 60 s.
    res.setHeader("Cache-Control", "private, max-age=3600");

    if (response.body) {
      const nodeStream = Readable.fromWeb(response.body as ReadableStream<Uint8Array>);
      nodeStream.pipe(res);
    } else {
      res.end();
    }
  } catch (error) {
    if (error instanceof ObjectNotFoundError) {
      req.log.warn({ err: error }, "Object not found");
      res.status(404).json({ error: "Object not found" });
      return;
    }
    req.log.error({ err: error }, "Error serving object");
    res.status(500).json({ error: "Failed to serve object" });
  }
});

export default router;
