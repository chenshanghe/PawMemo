import {
  S3Client,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { Storage, File as GCSFile } from "@google-cloud/storage";
import { Readable } from "stream";
import { randomUUID } from "crypto";
import {
  ObjectAclPolicy,
  ObjectPermission,
  canAccessObject,
  getObjectAclPolicy,
  setObjectAclPolicy,
} from "./objectAcl";

// ── Provider selection ─────────────────────────────────────────────────────
// STORAGE_PROVIDER=s3   → use S3-compatible storage (火山引擎 TOS, etc.)
// STORAGE_PROVIDER=replit (default) → use Replit GCS sidecar
const STORAGE_PROVIDER = (process.env.STORAGE_PROVIDER ?? "replit").toLowerCase();
const useS3 = STORAGE_PROVIDER === "s3";

// ── GCS client (Replit-only) ───────────────────────────────────────────────
const REPLIT_SIDECAR_ENDPOINT = "http://127.0.0.1:1106";
export const objectStorageClient: Storage | null = useS3
  ? null
  : new Storage({
      credentials: {
        audience: "replit",
        subject_token_type: "access_token",
        token_url: `${REPLIT_SIDECAR_ENDPOINT}/token`,
        type: "external_account",
        credential_source: {
          url: `${REPLIT_SIDECAR_ENDPOINT}/credential`,
          format: {
            type: "json",
            subject_token_field_name: "access_token",
          },
        },
        universe_domain: "googleapis.com",
      },
      projectId: "",
    });

// ── S3 client (TOS / any S3-compatible) ────────────────────────────────────
// Required env vars when STORAGE_PROVIDER=s3:
//   S3_ENDPOINT   e.g. https://tos-cn-beijing.volces.com
//   S3_REGION     e.g. cn-beijing
//   S3_BUCKET     bucket name
//   S3_ACCESS_KEY access key ID
//   S3_SECRET_KEY secret access key
//   S3_PRIVATE_PREFIX  prefix for private uploads (default: "private")
//   S3_PUBLIC_PREFIX   prefix for public assets  (default: "public")
const s3Client: S3Client | null = useS3
  ? new S3Client({
      region: process.env.S3_REGION ?? "cn-beijing",
      endpoint: process.env.S3_ENDPOINT,
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY ?? "",
        secretAccessKey: process.env.S3_SECRET_KEY ?? "",
      },
      forcePathStyle: true,
    })
  : null;

// ── Unified file handle ────────────────────────────────────────────────────
export type StoredFile =
  | { kind: "gcs"; file: GCSFile }
  | { kind: "s3"; key: string };

/** Backward-compat alias — storage.ts imports this name */
export type R2StoredFile = StoredFile;

// ── Error ──────────────────────────────────────────────────────────────────
export class ObjectNotFoundError extends Error {
  constructor() {
    super("Object not found");
    this.name = "ObjectNotFoundError";
    Object.setPrototypeOf(this, ObjectNotFoundError.prototype);
  }
}

// ── S3 helpers ─────────────────────────────────────────────────────────────
function getS3Bucket(): string {
  const bucket = process.env.S3_BUCKET;
  if (!bucket) throw new Error("S3_BUCKET env var not set");
  return bucket;
}
function getS3PrivatePrefix(): string {
  return (process.env.S3_PRIVATE_PREFIX ?? "private").replace(/\/$/, "");
}
function getS3PublicPrefix(): string {
  return (process.env.S3_PUBLIC_PREFIX ?? "public").replace(/\/$/, "");
}

// ── Service ────────────────────────────────────────────────────────────────
export class ObjectStorageService {
  constructor() {}

  // ── Config (kept for interface compat) ───────────────────────────────────
  getPublicObjectSearchPaths(): Array<string> {
    if (useS3) return [`s3://${getS3Bucket()}/${getS3PublicPrefix()}`];
    const pathsStr = process.env.PUBLIC_OBJECT_SEARCH_PATHS || "";
    const paths = Array.from(
      new Set(
        pathsStr
          .split(",")
          .map((p) => p.trim())
          .filter((p) => p.length > 0)
      )
    );
    if (paths.length === 0) {
      throw new Error(
        "PUBLIC_OBJECT_SEARCH_PATHS not set. Create a bucket in 'Object Storage' " +
          "tool and set PUBLIC_OBJECT_SEARCH_PATHS env var (comma-separated paths)."
      );
    }
    return paths;
  }

  getPrivateObjectDir(): string {
    if (useS3) return `s3://${getS3Bucket()}/${getS3PrivatePrefix()}`;
    const dir = process.env.PRIVATE_OBJECT_DIR || "";
    if (!dir) {
      throw new Error(
        "PRIVATE_OBJECT_DIR not set. Create a bucket in 'Object Storage' " +
          "tool and set PRIVATE_OBJECT_DIR env var."
      );
    }
    return dir;
  }

  // ── Public object search ─────────────────────────────────────────────────
  async searchPublicObject(filePath: string): Promise<StoredFile | null> {
    if (useS3) {
      const key = `${getS3PublicPrefix()}/${filePath}`;
      try {
        await s3Client!.send(
          new HeadObjectCommand({ Bucket: getS3Bucket(), Key: key })
        );
        return { kind: "s3", key };
      } catch {
        return null;
      }
    }
    // GCS path
    for (const searchPath of this.getPublicObjectSearchPaths()) {
      const fullPath = `${searchPath}/${filePath}`;
      const { bucketName, objectName } = parseObjectPath(fullPath);
      const bucket = objectStorageClient!.bucket(bucketName);
      const file = bucket.file(objectName);
      const [exists] = await file.exists();
      if (exists) return { kind: "gcs", file };
    }
    return null;
  }

  // ── Download ─────────────────────────────────────────────────────────────
  async downloadObject(
    stored: StoredFile,
    cacheTtlSec: number = 3600
  ): Promise<Response> {
    if (stored.kind === "s3") {
      const result = await s3Client!.send(
        new GetObjectCommand({ Bucket: getS3Bucket(), Key: stored.key })
      );
      const body = result.Body as NodeJS.ReadableStream;
      const webStream = Readable.toWeb(
        Readable.from(body)
      ) as ReadableStream;
      const headers: Record<string, string> = {
        "Content-Type": result.ContentType ?? "application/octet-stream",
        "Cache-Control": `private, max-age=${cacheTtlSec}`,
      };
      if (result.ContentLength != null) {
        headers["Content-Length"] = String(result.ContentLength);
      }
      return new Response(webStream, { headers });
    }
    // GCS path
    const { file } = stored;
    const [metadata] = await file.getMetadata();
    const aclPolicy = await getObjectAclPolicy(file);
    const isPublic = aclPolicy?.visibility === "public";
    const nodeStream = file.createReadStream();
    const webStream = Readable.toWeb(nodeStream) as ReadableStream;
    const headers: Record<string, string> = {
      "Content-Type":
        (metadata.contentType as string) || "application/octet-stream",
      "Cache-Control": `${isPublic ? "public" : "private"}, max-age=${cacheTtlSec}`,
    };
    if (metadata.size) {
      headers["Content-Length"] = String(metadata.size);
    }
    return new Response(webStream, { headers });
  }

  // ── Upload URL ────────────────────────────────────────────────────────────
  async getObjectEntityUploadURL(): Promise<string> {
    const objectId = randomUUID();
    if (useS3) {
      const key = `${getS3PrivatePrefix()}/uploads/${objectId}`;
      const cmd = new PutObjectCommand({ Bucket: getS3Bucket(), Key: key });
      return getSignedUrl(s3Client!, cmd, { expiresIn: 900 });
    }
    const privateObjectDir = this.getPrivateObjectDir();
    const fullPath = `${privateObjectDir}/uploads/${objectId}`;
    const { bucketName, objectName } = parseObjectPath(fullPath);
    return signGCSObjectURL({ bucketName, objectName, method: "PUT", ttlSec: 900 });
  }

  // ── Get object file (for serving) ─────────────────────────────────────────
  async getObjectEntityFile(objectPath: string): Promise<StoredFile> {
    if (!objectPath.startsWith("/objects/")) throw new ObjectNotFoundError();
    const parts = objectPath.slice(1).split("/");
    if (parts.length < 2) throw new ObjectNotFoundError();
    const entityId = parts.slice(1).join("/"); // e.g. "uploads/<uuid>"

    if (useS3) {
      const key = `${getS3PrivatePrefix()}/${entityId}`;
      try {
        await s3Client!.send(
          new HeadObjectCommand({ Bucket: getS3Bucket(), Key: key })
        );
        return { kind: "s3", key };
      } catch {
        throw new ObjectNotFoundError();
      }
    }
    // GCS path
    let entityDir = this.getPrivateObjectDir();
    if (!entityDir.endsWith("/")) entityDir = `${entityDir}/`;
    const objectEntityPath = `${entityDir}${entityId}`;
    const { bucketName, objectName } = parseObjectPath(objectEntityPath);
    const bucket = objectStorageClient!.bucket(bucketName);
    const objectFile = bucket.file(objectName);
    const [exists] = await objectFile.exists();
    if (!exists) throw new ObjectNotFoundError();
    return { kind: "gcs", file: objectFile };
  }

  // ── Normalize presigned URL → /objects/<entityId> ─────────────────────────
  normalizeObjectEntityPath(rawPath: string): string {
    if (useS3) {
      // Presigned URL formats:
      //   Path-style:    https://<endpoint>/<bucket>/<key>?X-Amz-...
      //   Virtual-host:  https://<bucket>.<endpoint>/<key>?X-Amz-...
      try {
        const url = new URL(rawPath);
        let pathname = url.pathname; // starts with /
        if (pathname.startsWith("/")) pathname = pathname.slice(1);
        // Strip bucket name if path-style
        const bucket = getS3Bucket();
        if (pathname.startsWith(`${bucket}/`)) {
          pathname = pathname.slice(bucket.length + 1);
        }
        // pathname is now the S3 key: e.g. "private/uploads/<uuid>"
        const prefix = `${getS3PrivatePrefix()}/`;
        if (pathname.startsWith(prefix)) {
          return `/objects/${pathname.slice(prefix.length)}`;
        }
        return `/${pathname}`;
      } catch {
        return rawPath;
      }
    }
    // GCS path
    if (!rawPath.startsWith("https://storage.googleapis.com/")) return rawPath;
    const url = new URL(rawPath);
    const rawObjectPath = url.pathname;
    let objectEntityDir = this.getPrivateObjectDir();
    if (!objectEntityDir.endsWith("/")) objectEntityDir = `${objectEntityDir}/`;
    if (!rawObjectPath.startsWith(objectEntityDir)) return rawObjectPath;
    const entityId = rawObjectPath.slice(objectEntityDir.length);
    return `/objects/${entityId}`;
  }

  // ── ACL helpers (GCS only; DB-level ACL is used in S3 mode) ───────────────
  async trySetObjectEntityAclPolicy(
    rawPath: string,
    aclPolicy: ObjectAclPolicy
  ): Promise<string> {
    const normalizedPath = this.normalizeObjectEntityPath(rawPath);
    if (!normalizedPath.startsWith("/")) return normalizedPath;
    const stored = await this.getObjectEntityFile(normalizedPath);
    if (stored.kind !== "gcs") return normalizedPath; // S3: no GCS ACL metadata
    await setObjectAclPolicy(stored.file, aclPolicy);
    return normalizedPath;
  }

  async canAccessObjectEntity({
    userId,
    objectFile,
    requestedPermission,
  }: {
    userId?: string;
    objectFile: StoredFile;
    requestedPermission?: ObjectPermission;
  }): Promise<boolean> {
    if (objectFile.kind !== "gcs") return true; // S3: rely on DB-level ACL in storage.ts
    return canAccessObject({
      userId,
      objectFile: objectFile.file,
      requestedPermission: requestedPermission ?? ObjectPermission.READ,
    });
  }
}

// ── GCS internal helpers ──────────────────────────────────────────────────
function parseObjectPath(path: string): {
  bucketName: string;
  objectName: string;
} {
  if (!path.startsWith("/")) path = `/${path}`;
  const pathParts = path.split("/");
  if (pathParts.length < 3) {
    throw new Error("Invalid path: must contain at least a bucket name");
  }
  return { bucketName: pathParts[1], objectName: pathParts.slice(2).join("/") };
}

async function signGCSObjectURL({
  bucketName,
  objectName,
  method,
  ttlSec,
}: {
  bucketName: string;
  objectName: string;
  method: "GET" | "PUT" | "DELETE" | "HEAD";
  ttlSec: number;
}): Promise<string> {
  const request = {
    bucket_name: bucketName,
    object_name: objectName,
    method,
    expires_at: new Date(Date.now() + ttlSec * 1000).toISOString(),
  };
  const response = await fetch(
    `${REPLIT_SIDECAR_ENDPOINT}/object-storage/signed-object-url`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
      signal: AbortSignal.timeout(30_000),
    }
  );
  if (!response.ok) {
    throw new Error(
      `Failed to sign object URL, errorcode: ${response.status}, ` +
        `make sure you're running on Replit`
    );
  }
  const { signed_url: signedURL } = (await response.json()) as {
    signed_url: string;
  };
  return signedURL;
}
