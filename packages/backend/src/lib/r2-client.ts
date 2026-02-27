import { S3Client } from "@aws-sdk/client-s3";

/**
 * Global S3Client instance for R2 (Cloudflare)
 * Lazy-initialized to avoid blocking Elysia startup
 */

let globalClient: S3Client | null = null;
let globalBucket = "";
let globalPublicUrl: string | null = null;

const REQUIRED_R2_ENV_VARS = [
  "R2_ACCOUNT_ID",
  "R2_ACCESS_KEY_ID",
  "R2_SECRET_ACCESS_KEY",
] as const;

export function getMissingR2EnvVars(): string[] {
  return REQUIRED_R2_ENV_VARS.filter((key) => !process.env[key]);
}

export function isR2Configured(): boolean {
  return getMissingR2EnvVars().length === 0;
}

export function getR2Client(): S3Client {
  if (!globalClient) {
    const accountId = process.env.R2_ACCOUNT_ID;
    const accessKeyId = process.env.R2_ACCESS_KEY_ID;
    const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

    if (!accountId || !accessKeyId || !secretAccessKey) {
      const missingVars = getMissingR2EnvVars();
      console.warn(
        `⚠️ R2 credentials not configured (${missingVars.join(", ")}). Storage features will not work locally.`
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
