import { uploadFile } from "~/lib/api-client";
import { getDatabase } from "@avileo/drizzle-sync/client";
import { abonos } from "@avileo/shared";
import { eq, sql } from "drizzle-orm";
import {
  getUploadsReadyForRetry,
  removePendingUpload,
  markUploadFailed,
  getFileFromQueue,
  type PendingFileUpload,
} from "./storage";

/**
 * Mapping from file-queue entity types to sync engine entity types
 */
const ENTITY_TYPE_MAP: Record<string, string> = {
  "payment": "abonos",
  "order": "purchases",
  "business": "businesses",
  "profile": "user_profiles",
};

/**
 * Updates the payload of an existing sync operation to include the fileId
 * This ensures the sync engine sends the correct fileId when processing the entity
 */
async function updateSyncOperationPayload(
  entityId: string,
  entityType: string,
  fieldName: string,
  fileId: string
): Promise<void> {
  const { pg } = getDatabase();

  try {
    // Find the most recent pending/failed sync operation for this entity
    const existing = await pg.query<{ id: string; payload: unknown }>(
      `SELECT id, payload FROM sync_operations
       WHERE entity_id = $1 AND entity_type = $2
       AND status IN ('pending', 'failed')
       ORDER BY created_at DESC LIMIT 1`,
      [entityId, entityType]
    );

    if (existing.rows.length === 0) {
      console.log(`[FileQueue] No pending sync operation found for ${entityType}:${entityId}`);
      return;
    }

    const op = existing.rows[0];
    const payload = typeof op.payload === 'string'
      ? JSON.parse(op.payload)
      : op.payload as Record<string, unknown>;

    // Update the field with the fileId
    payload[fieldName] = fileId;

    // Escape for SQL safety
    const escapedPayload = JSON.stringify(payload).replace(/'/g, "''");

    await pg.exec(
      `UPDATE sync_operations
       SET payload = '${escapedPayload}'
       WHERE id = '${op.id}'`
    );

    console.log(`[FileQueue] Updated sync operation ${op.id} with ${fieldName}=${fileId}`);
  } catch (error) {
    console.error(`[FileQueue] Failed to update sync operation:`, error);
    // Don't throw - this is a best-effort operation
  }
}

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

    // Update the sync operation payload with the fileId
    // This ensures the sync engine sends the correct fileId when processing the entity
    const syncEntityType = ENTITY_TYPE_MAP[upload.entityType];
    if (syncEntityType && upload.entityId) {
      await updateSyncOperationPayload(
        upload.entityId,
        syncEntityType,
        upload.fieldName,
        data.id
      );
    }

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
