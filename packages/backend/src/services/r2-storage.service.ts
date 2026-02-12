import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadBucketCommand,
  CreateBucketCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import {
  getR2Client,
  getR2Bucket,
  getR2PublicUrl,
} from "../lib/r2-client";

export class R2StorageService {
  private bucketEnsured = false;

  constructor() {
    // NO initialization - lazy loading via getters
    // This prevents blocking Elysia startup
  }

  /**
   * Get S3Client (lazy initialization)
   */
  private get s3Client(): S3Client {
    return getR2Client();
  }

  /**
   * Get bucket name (lazy initialization)
   */
  private get BUCKET(): string {
    return getR2Bucket();
  }

  /**
   * Get public URL (lazy initialization)
   */
  private get publicUrl(): string | null {
    return getR2PublicUrl();
  }

  /**
   * Ensure bucket exists, create if not
   */
  private async ensureBucketExists(): Promise<void> {
    // Only check once per service instance

    if (this.bucketEnsured) return;

    try {
      await this.s3Client.send(
        new HeadBucketCommand({
          Bucket: this.BUCKET,
        })
      );
      this.bucketEnsured = true;
    } catch (error: any) {
      // Bucket doesn't exist, create it
      if (error.name === "NotFound") {
        console.log(`📦 Creating bucket "${this.BUCKET}"...`);
        try {
          await this.s3Client.send(
            new CreateBucketCommand({
              Bucket: this.BUCKET,
            })
          );
          console.log(`✅ Bucket "${this.BUCKET}" created successfully`);
          this.bucketEnsured = true;
        } catch (createError: any) {
          throw new Error(`Error al crear bucket: ${createError.message}`);
        }
      } else {
        throw new Error(`Error al verificar bucket: ${error.message}`);
      }
    }
  }

  /**
   * Upload file to R2
   * Path: {userId}/avatars/{uuid}.{ext} or {businessId}/logos/{uuid}.{ext}
   */
  async uploadFile(
    path: string,
    file: { buffer: ArrayBuffer; type: string }
  ): Promise<string> {
    await this.ensureBucketExists();

    await this.s3Client.send(
      new PutObjectCommand({
        Bucket: this.BUCKET,
        Key: path,
        Body: new Uint8Array(file.buffer),
        ContentType: file.type,
      })
    );

    return path;
  }

  /**
   * Get file URL (signed or public)
   */
  async getFileUrl(
    path: string,
    expiresInSeconds = 60 * 60 * 24 * 7
  ): Promise<string> {
    // If public URL is configured, use it directly
    if (this.publicUrl) {
      return `${this.publicUrl}/${path}`;
    }

    // Otherwise, generate signed URL
    const command = new GetObjectCommand({
      Bucket: this.BUCKET,
      Key: path,
    });

    return await getSignedUrl(this.s3Client, command, {
      expiresIn: expiresInSeconds,
    });
  }

  /**
   * Delete file
   */
  async deleteFile(path: string): Promise<void> {
    await this.s3Client.send(
      new DeleteObjectCommand({
        Bucket: this.BUCKET,
        Key: path,
      })
    );
  }

  /**
   * Check if file exists
   */
  async fileExists(path: string): Promise<boolean> {
    try {
      await this.s3Client.send(
        new GetObjectCommand({
          Bucket: this.BUCKET,
          Key: path,
        })
      );
      return true;
    } catch (error: any) {
      if (error.name === "NoSuchKey" || error.name === "NotFound") {
        return false;
      }
      throw error;
    }
  }

  /**
   * Get bucket info
   */
  getBucketInfo() {
    return {
      bucket: this.BUCKET,
      hasPublicUrl: !!this.publicUrl,
      publicUrl: this.publicUrl,
    };
  }
}

// Export singleton instance
export const r2Storage = new R2StorageService();
