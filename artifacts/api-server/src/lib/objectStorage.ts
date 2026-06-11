import { S3Client, GetObjectCommand, HeadObjectCommand, PutObjectCommand, CopyObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { Readable } from "stream";
import { randomUUID } from "crypto";
import { ObjectAclPolicy, ObjectPermission } from "./objectAcl";

function getS3Client(): S3Client {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error("R2 storage not configured. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY.");
  }
  return new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  });
}

function getBucket(): string {
  const bucket = process.env.R2_BUCKET_NAME;
  if (!bucket) throw new Error("R2_BUCKET_NAME not set.");
  return bucket;
}

export class R2StoredFile {
  constructor(
    public readonly bucket: string,
    public readonly key: string,
    public readonly contentType?: string,
    public readonly contentLength?: number,
    public readonly customMetadata?: Record<string, string>,
  ) {}
  get name() { return this.key; }
}

export class ObjectNotFoundError extends Error {
  constructor() {
    super("Object not found");
    this.name = "ObjectNotFoundError";
    Object.setPrototypeOf(this, ObjectNotFoundError.prototype);
  }
}

export class ObjectStorageService {
  async getObjectEntityUploadURL(): Promise<string> {
    const client = getS3Client();
    const bucket = getBucket();
    const key = `private/uploads/${randomUUID()}`;
    const cmd = new PutObjectCommand({ Bucket: bucket, Key: key });
    return getSignedUrl(client, cmd, { expiresIn: 900 });
  }

  normalizeObjectEntityPath(rawPath: string): string {
    try {
      const url = new URL(rawPath);
      const bucket = getBucket();
      const prefix = `/${bucket}/`;
      if (url.pathname.startsWith(prefix)) {
        const keyPath = url.pathname.slice(prefix.length);
        if (keyPath.startsWith("private/")) {
          return `/objects/${keyPath.slice("private/".length)}`;
        }
      }
    } catch {
      // not a URL
    }
    return rawPath;
  }

  async searchPublicObject(filePath: string): Promise<R2StoredFile | null> {
    const client = getS3Client();
    const bucket = getBucket();
    const key = `public/${filePath}`;
    try {
      const meta = await client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
      return new R2StoredFile(bucket, key, meta.ContentType, meta.ContentLength, meta.Metadata);
    } catch (err: any) {
      if (err.$metadata?.httpStatusCode === 404 || err.name === "NotFound") return null;
      throw err;
    }
  }

  async downloadObject(file: R2StoredFile, cacheTtlSec = 3600): Promise<Response> {
    const client = getS3Client();
    const result = await client.send(new GetObjectCommand({ Bucket: file.bucket, Key: file.key }));
    const isPublic = file.key.startsWith("public/");
    const headers: Record<string, string> = {
      "Content-Type": result.ContentType ?? "application/octet-stream",
      "Cache-Control": `${isPublic ? "public" : "private"}, max-age=${cacheTtlSec}`,
    };
    if (result.ContentLength) headers["Content-Length"] = String(result.ContentLength);
    const webStream = Readable.toWeb(result.Body as Readable) as ReadableStream;
    return new Response(webStream, { headers });
  }

  async getObjectEntityFile(objectPath: string): Promise<R2StoredFile> {
    if (!objectPath.startsWith("/objects/")) throw new ObjectNotFoundError();
    const client = getS3Client();
    const bucket = getBucket();
    const key = `private/${objectPath.slice("/objects/".length)}`;
    try {
      const meta = await client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
      return new R2StoredFile(bucket, key, meta.ContentType, meta.ContentLength, meta.Metadata);
    } catch (err: any) {
      if (err.$metadata?.httpStatusCode === 404 || err.name === "NotFound") throw new ObjectNotFoundError();
      throw err;
    }
  }

  async trySetObjectEntityAclPolicy(rawPath: string, _aclPolicy: ObjectAclPolicy): Promise<string> {
    return this.normalizeObjectEntityPath(rawPath);
  }

  async canAccessObjectEntity(_opts: {
    userId?: string;
    objectFile: R2StoredFile;
    requestedPermission?: ObjectPermission;
  }): Promise<boolean> {
    return true;
  }
}
