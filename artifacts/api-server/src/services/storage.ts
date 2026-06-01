// ============ Photo storage abstraction ============
// One small interface, two providers:
//   - "local"  → writes to <cwd>/uploads, served by express.static("/uploads").
//                Fine for dev/Replit preview. NOT durable on autoscaled deploys.
//   - "s3"     → any S3-compatible bucket (AWS S3, Cloudflare R2, GCS via the
//                interop endpoint, Replit Object Storage). The AWS SDK is loaded
//                lazily so the server still boots without it when using local.
//
// Selection: STORAGE_PROVIDER=local|s3 (defaults to "local").
// Returned value is always a URL the client can render directly.

import fs from "fs";
import path from "path";
import { nanoid } from "nanoid";

export type UploadInput = {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
};

export interface PhotoStorageProvider {
  /** Persist one image and return a publicly-renderable URL. */
  save(file: UploadInput): Promise<string>;
  /** Best-effort delete by the URL previously returned from save(). */
  delete(url: string): Promise<void>;
}

const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"]);
const MAX_BYTES = 8 * 1024 * 1024;

function extFor(file: UploadInput): string {
  const ext = path.extname(file.originalname).toLowerCase().slice(0, 6);
  if (ext) return ext;
  if (file.mimetype === "image/png") return ".png";
  if (file.mimetype === "image/webp") return ".webp";
  return ".jpg";
}

export function assertValidImage(file: UploadInput): void {
  if (!ALLOWED_MIME.has(file.mimetype)) throw new Error("Unsupported image type");
  if (!file.buffer || file.buffer.length === 0) throw new Error("Empty file");
  if (file.buffer.length > MAX_BYTES) throw new Error("File too large");
}

// --------------------------- Local provider ---------------------------------
class LocalStorageProvider implements PhotoStorageProvider {
  private dir = path.join(process.cwd(), "uploads");
  // When set (e.g. the deploy's own URL), returns absolute URLs; otherwise a
  // relative "/uploads/..." path that resolves against the API origin.
  private publicBase = (process.env.PUBLIC_BASE_URL || "").replace(/\/+$/, "");

  constructor() {
    if (!fs.existsSync(this.dir)) fs.mkdirSync(this.dir, { recursive: true });
  }

  async save(file: UploadInput): Promise<string> {
    assertValidImage(file);
    const name = `${nanoid(16)}${extFor(file)}`;
    await fs.promises.writeFile(path.join(this.dir, name), file.buffer);
    const rel = `/uploads/${name}`;
    return this.publicBase ? `${this.publicBase}${rel}` : rel;
  }

  async delete(url: string): Promise<void> {
    const idx = url.indexOf("/uploads/");
    if (idx === -1) return;
    const name = url.slice(idx + "/uploads/".length);
    await fs.promises.unlink(path.join(this.dir, name)).catch(() => {});
  }
}

// ---------------------------- S3 provider ------------------------------------
class S3StorageProvider implements PhotoStorageProvider {
  private client: any;
  private bucket: string;
  private keyPrefix: string;
  private publicBase: string;

  constructor() {
    const bucket = process.env.S3_BUCKET;
    if (!bucket) throw new Error("S3_BUCKET must be set when STORAGE_PROVIDER=s3");
    this.bucket = bucket;
    this.keyPrefix = (process.env.S3_KEY_PREFIX || "photos").replace(/^\/+|\/+$/g, "");
    this.publicBase = (process.env.S3_PUBLIC_BASE_URL || "").replace(/\/+$/, "");

    let S3Client: any, PutObjectCommand: any, DeleteObjectCommand: any;
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      ({ S3Client, PutObjectCommand, DeleteObjectCommand } = require("@aws-sdk/client-s3"));
    } catch {
      throw new Error("STORAGE_PROVIDER=s3 requires the @aws-sdk/client-s3 package to be installed.");
    }
    this._Put = PutObjectCommand;
    this._Delete = DeleteObjectCommand;
    this.client = new S3Client({
      region: process.env.S3_REGION || "us-east-1",
      endpoint: process.env.S3_ENDPOINT || undefined, // set for R2/GCS/Replit
      forcePathStyle: process.env.S3_FORCE_PATH_STYLE === "true",
      credentials: process.env.S3_ACCESS_KEY_ID && process.env.S3_SECRET_ACCESS_KEY
        ? { accessKeyId: process.env.S3_ACCESS_KEY_ID, secretAccessKey: process.env.S3_SECRET_ACCESS_KEY }
        : undefined, // fall back to ambient/instance credentials
    });
  }
  private _Put: any;
  private _Delete: any;

  private urlFor(key: string): string {
    if (this.publicBase) return `${this.publicBase}/${key}`;
    const endpoint = process.env.S3_ENDPOINT;
    if (endpoint) return `${endpoint.replace(/\/+$/, "")}/${this.bucket}/${key}`;
    return `https://${this.bucket}.s3.${process.env.S3_REGION || "us-east-1"}.amazonaws.com/${key}`;
  }

  async save(file: UploadInput): Promise<string> {
    assertValidImage(file);
    const key = `${this.keyPrefix}/${nanoid(16)}${extFor(file)}`;
    await this.client.send(new this._Put({
      Bucket: this.bucket,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
      CacheControl: "public, max-age=31536000, immutable",
    }));
    return this.urlFor(key);
  }

  async delete(url: string): Promise<void> {
    const marker = this.publicBase ? this.publicBase : `/${this.bucket}/`;
    const idx = url.indexOf(this.keyPrefix + "/");
    if (idx === -1) return;
    const key = url.slice(idx);
    await this.client.send(new this._Delete({ Bucket: this.bucket, Key: key })).catch(() => {});
    void marker;
  }
}

let _provider: PhotoStorageProvider | null = null;
export function getPhotoStorage(): PhotoStorageProvider {
  if (_provider) return _provider;
  const kind = (process.env.STORAGE_PROVIDER || "local").toLowerCase();
  _provider = kind === "s3" ? new S3StorageProvider() : new LocalStorageProvider();
  console.log(`[storage] photo storage provider: ${kind}`);
  return _provider;
}
