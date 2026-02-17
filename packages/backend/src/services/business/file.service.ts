import type { FileRepository } from "../repository/file.repository";
import type { RequestContext } from "../../context/request-context";
import { r2Storage } from "../r2-storage.service";
import type { FileRecord } from "../../db/schema/files";
import { ValidationError, NotFoundError } from "../../errors";

export class FileService {
  constructor(private repository: FileRepository) {}

  /**
   * Upload file to storage and create DB record
   */
  async upload(ctx: RequestContext, file: File): Promise<FileRecord> {
    this.validateFile(file);

    const extension = file.name.split(".").pop() || "jpg";
    const path = `${ctx.businessId}/files/${crypto.randomUUID()}.${extension}`;

    const buffer = await file.arrayBuffer();
    await r2Storage.uploadFile(path, { buffer, type: file.type });

    const fileRecord = await this.repository.create(ctx, {
      filename: file.name,
      storagePath: path,
      mimeType: file.type,
      sizeBytes: file.size,
    });

    return fileRecord;
  }

  /**
   * Upload file during onboarding (no business yet)
   */
  async uploadForOnboarding(file: File): Promise<FileRecord> {
    this.validateFile(file);

    const extension = file.name.split(".").pop() || "jpg";
    const path = `onboarding/files/${crypto.randomUUID()}.${extension}`;

    const buffer = await file.arrayBuffer();
    await r2Storage.uploadFile(path, { buffer, type: file.type });

    const fileRecord = await this.repository.createForOnboarding({
      filename: file.name,
      storagePath: path,
      mimeType: file.type,
      sizeBytes: file.size,
    });

    return fileRecord;
  }

  /**
   * Get file with public URL
   */
  async getWithUrl(ctx: RequestContext, id: string): Promise<{ file: FileRecord; url: string }> {
    const file = await this.repository.findById(ctx, id);
    if (!file) {
      throw new NotFoundError("File");
    }

    const url = await r2Storage.getFileUrl(file.storagePath);
    return { file, url };
  }

  /**
   * Batch get files with URLs
   */
  async getWithUrls(ctx: RequestContext, ids: string[]): Promise<Map<string, string>> {
    if (ids.length === 0) return new Map();

    const files = await this.repository.findByIds(ctx, ids);
    const urlMap = new Map<string, string>();

    for (const file of files) {
      const url = await r2Storage.getFileUrl(file.storagePath);
      urlMap.set(file.id, url);
    }

    return urlMap;
  }

  /**
   * Soft delete file
   */
  async delete(ctx: RequestContext, id: string): Promise<void> {
    const file = await this.repository.findById(ctx, id);
    if (!file) {
      throw new NotFoundError("File");
    }

    await this.repository.softDelete(ctx, id);

    r2Storage.deleteFile(file.storagePath).catch((err) => {
      console.error("Failed to delete file from storage:", err);
    });
  }

  /**
   * Associate onboarding file with business after creation
   */
  async associateWithBusiness(
    fileId: string,
    businessId: string
  ): Promise<void> {
    await this.repository.updateBusinessId(fileId, businessId);
  }

  private validateFile(file: File): void {
    const MAX_SIZE = 5 * 1024 * 1024; // 5MB

    if (file.size > MAX_SIZE) {
      throw new ValidationError("El archivo no puede superar 5MB");
    }

    const validTypes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/webp",
    ];

    if (!validTypes.includes(file.type)) {
      throw new ValidationError("Tipo de archivo no válido. Solo imágenes (JPG, PNG, WEBP)");
    }
  }
}
