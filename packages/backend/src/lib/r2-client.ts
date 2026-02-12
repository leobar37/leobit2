import { S3Client } from "@aws-sdk/client-s3";

/**
 * Global S3Client instance for R2 (Cloudflare)
 * Lazy-initialized to avoid blocking Elysia startup
 */

let globalClient: S3Client | null = null;
let globalBucket = "";
let globalPublicUrl: string | null = null;

export function getR2Client(): S3Client {
  if (!globalClient) {
    const accountId = process.env.R2_ACCOUNT_ID;
    const accessKeyId = process.env.R2_ACCESS_KEY_ID;
    const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

    if (!accountId || !accessKeyId || !secretAccessKey) {
      console.warn(
        "⚠️ R2 credentials not configured. Storage features will not work locally."
      );
      globalClient = new S3Client({
        region: "auto",
        credentials: { accessKeyId: "", secretAccessKey: "" },
      });
      globalBucket = "";
      globalPublicUrl = null;
      return globalClient;
    }

    globalClient = new S3Client({
      region: "auto",
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });

    globalBucket = process.env.R2_BUCKET_NAME || "avileo-assets";
    globalPublicUrl = process.env.R2_PUBLIC_URL || null;
  }

  return globalClient;
}

export function getR2Bucket(): string {
  if (!globalBucket) {
    // Trigger lazy initialization
    getR2Client();
  }
  return globalBucket;
}

export function getR2PublicUrl(): string | null {
  if (globalPublicUrl === null) {
    // Trigger lazy initialization
    getR2Client();
  }
  return globalPublicUrl;
}
