import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

type PresignInput = { key: string; contentType: string; sizeBytes: number };

const required = (name: string): string => {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required for object storage.`);
  return value;
};

let client: S3Client | undefined;
const getClient = () => {
  if (client) return client;
  const endpoint = process.env.S3_ENDPOINT?.trim();
  client = new S3Client({
    region: process.env.S3_REGION?.trim() || "auto",
    ...(endpoint ? { endpoint, forcePathStyle: true } : {}),
    credentials: {
      accessKeyId: required("S3_ACCESS_KEY_ID"),
      secretAccessKey: required("S3_SECRET_ACCESS_KEY"),
    },
  });
  return client;
};

const publicUrl = (key: string) => {
  const base = required("PUBLIC_ASSETS_BASE_URL").replace(/\/+$/, "");
  return `${base}/${key.split("/").map(encodeURIComponent).join("/")}`;
};

/** Create a short-lived, content-type-bound PUT URL for S3-compatible storage (including Cloudflare R2). */
export async function createPresignedUpload(input: PresignInput): Promise<{ presignedUrl: string; url: string }> {
  if (!Number.isInteger(input.sizeBytes) || input.sizeBytes < 1 || input.sizeBytes > 50 * 1024 * 1024) {
    throw new Error("Upload size is outside the allowed range.");
  }
  const bucket = required("S3_BUCKET");
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: input.key,
    ContentType: input.contentType,
  });
  const presignedUrl = await getSignedUrl(getClient(), command, { expiresIn: 300 });
  return { presignedUrl, url: publicUrl(input.key) };
}
