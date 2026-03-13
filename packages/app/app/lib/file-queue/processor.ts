import { uploadFile } from "~/lib/api-client";
import { getDatabase } from "~/engine";
import { abonos } from "~/engine/schema";
import { eq, sql } from "drizzle-orm";
import {
  getUploadsReadyForRetry,
  removePendingUpload,
  markUploadFailed,
  getFileFromQueue,
  type PendingFileUpload,
} from "./storage";

export interface FileUploadResult {
  uploadId: string;
  fileId?: string;
  url?: string;
  success: boolean;
  error?: string;
}

async function updateEntityWithFileId(
  upload: PendingFileUpload,
  fileId: string
): Promise<void> {
  if (!upload.entityId) return;

  const { pg } = getDatabase();
  const escapedFileId = fileId.replace(/'/g, "''");
  const escapedEntityId = upload.entityId.replace(/'/g, "''");

  try {
    switch (upload.entityType) {
      case "payment": {
        const { db } = getDatabase();
        await db
          .update(abonos)
          .set({ 
            proofImageId: sql`${fileId}`,
          })
          .where(eq(abonos.id, upload.entityId));
        break;
      }
      case "order": {
        await pg.exec(`
          UPDATE purchases 
          SET receipt_image_id = '${escapedFileId}',
              updated_at = CURRENT_TIMESTAMP
          WHERE id = '${escapedEntityId}'
        `);
        break;
      }
      case "business": {
        await pg.exec(`
          UPDATE businesses 
          SET image_id = '${escapedFileId}',
              updated_at = CURRENT_TIMESTAMP
          WHERE id = '${escapedEntityId}'
        `);
        break;
      }
      case "profile": {
        await pg.exec(`
          UPDATE user_profiles 
          SET image_id = '${escapedFileId}',
              updated_at = CURRENT_TIMESTAMP
          WHERE id = '${escapedEntityId}'
        `);
        break;
      }
      default:
        console.warn(`Unhandled entity type: ${upload.entityType}`);
    }
  } catch (error) {
    console.error(`Failed to update ${upload.entityType} with file ID:`, error);
    throw error;
  }
}

export async function processFileUpload(upload: PendingFileUpload): Promise<FileUploadResult> {
  try {
    const file = await getFileFromQueue(upload.id);
    if (!file) {
      await removePendingUpload(upload.id);
      return {
        uploadId: upload.id,
        success: false,
        error: "File not found in queue",
      };
    }

    const formData = new FormData();
    formData.append("file", file);

    const data = await uploadFile<{
      id: string;
      filename: string;
      mimeType: string;
      sizeBytes: number;
      createdAt: string;
    }>("/files/upload", formData);

    await updateEntityWithFileId(upload, data.id);
    await removePendingUpload(upload.id);

    return {
      uploadId: upload.id,
      fileId: data.id,
      success: true,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    await markUploadFailed(upload.id, errorMessage);

    return {
      uploadId: upload.id,
      success: false,
      error: errorMessage,
    };
  }
}

export async function processAllPendingUploads(): Promise<FileUploadResult[]> {
  const uploads = await getUploadsReadyForRetry();

  if (uploads.length === 0) {
    return [];
  }

  const results: FileUploadResult[] = [];

  for (const upload of uploads) {
    const result = await processFileUpload(upload);
    results.push(result);
  }

  return results;
}

export async function uploadFileNow(file: File): Promise<{ id: string; url?: string }> {
  const formData = new FormData();
  formData.append("file", file);

  const data = await uploadFile<{
    id: string;
    filename: string;
    mimeType: string;
    sizeBytes: number;
    createdAt: string;
  }>("/files/upload", formData);

  return { id: data.id };
}
