import type { AssetRepository } from "../repository/asset.repository";
import type { RequestContext } from "../../context/request-context";
import { r2Storage } from "../r2-storage.service";
import type { Asset } from "../../db/schema/assets";
import { ValidationError, NotFoundError } from "../../errors";

export class AssetService {
  constructor(private repository: AssetRepository) {}

  /**
   * Upload asset to storage and create DB record
   */
  async upload(ctx: RequestContext, file: File): Promise<Asset> {
    this.validateFile(file);

    const extension = file.name.split(".").pop() || "jpg";
    const path = `${ctx.businessId}/assets/${crypto.randomUUID()}.${extension}`;

    const buffer = await file.arrayBuffer();
    await r2Storage.uploadFile(path, { buffer, type: file.type });

    const asset = await this.repository.create(ctx, {
      filename: file.name,
      storagePath: path,
      mimeType: file.type,
      sizeBytes: file.size,
    });

    return asset;
  }

  /**
   * Get asset with public URL
   */
  async getWithUrl(ctx: RequestContext, id: string): Promise<{ asset: Asset; url: string }> {
    const asset = await this.repository.findById(ctx, id);
    if (!asset) {
      throw new NotFoundError("Asset");
    }

    const url = await r2Storage.getFileUrl(asset.storagePath);
    return { asset, url };
  }

  /**
   * Batch get assets with URLs (prevents N+1)
   */
  async getWithUrls(ctx: RequestContext, ids: string[]): Promise<Map<string, string>> {
    if (ids.length === 0) return new Map();

    const assets = await this.repository.findByIds(ctx, ids);
    const urlMap = new Map<string, string>();

    for (const asset of assets) {
      const url = await r2Storage.getFileUrl(asset.storagePath);
      urlMap.set(asset.id, url);
    }

    return urlMap;
  }

  /**
   * Get all assets with URLs for gallery
   */
  async getAllWithUrls(ctx: RequestContext): Promise<Array<Asset & { url: string }>> {
    const assets = await this.repository.findMany(ctx);
    
    return Promise.all(
      assets.map(async (asset) => {
        const url = await r2Storage.getFileUrl(asset.storagePath);
        return { ...asset, url };
      })
    );
  }

  /**
   * Soft delete asset
   */
  async delete(ctx: RequestContext, id: string): Promise<void> {
    const asset = await this.repository.findById(ctx, id);
    if (!asset) {
      throw new NotFoundError("Asset");
    }

    await this.repository.softDelete(ctx, id);

    r2Storage.deleteFile(asset.storagePath).catch((err) => {
      console.error("Failed to delete asset from storage:", err);
    });
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
      "image/gif",
      "video/mp4",
      "video/quicktime",
    ];

    if (!validTypes.includes(file.type)) {
      throw new ValidationError("Tipo de archivo no válido. Solo imágenes (JPG, PNG, WEBP, GIF) y videos (MP4)");
    }
  }
}
