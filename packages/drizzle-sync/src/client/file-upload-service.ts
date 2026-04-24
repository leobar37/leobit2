/**
 * FileUploadService
 *
 * Handles temporary file storage (IndexedDB) and upload to server.
 * Replaces the manual file-queue system with a framework-native solution.
 */

const DB_NAME = "drizzle-sync-files";
const DB_VERSION = 1;
const STORE_NAME = "pending-uploads";

export interface FileUploadMetadata {
  entityType: string;
  fieldName: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
}

export interface PendingFileUpload {
  id: string;
  blob: Blob;
  metadata: FileUploadMetadata;
  createdAt: number;
}

export interface FileUploadResult {
  id: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
}

class FileUploadServiceImpl {
  private db: IDBDatabase | null = null;
  private uploadEndpoint: string;

  constructor(options: { uploadEndpoint?: string } = {}) {
    this.uploadEndpoint = options.uploadEndpoint || "/files/upload";
  }

  private async getDb(): Promise<IDBDatabase> {
    if (this.db) return this.db;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve(request.result);
      };

      request.onupgradeneeded = (event) => {
        const database = (event.target as IDBOpenDBRequest).result;
        if (!database.objectStoreNames.contains(STORE_NAME)) {
          const store = database.createObjectStore(STORE_NAME, { keyPath: "id" });
          store.createIndex("createdAt", "createdAt", { unique: false });
        }
      };
    });
  }

  /**
   * Save a file temporarily in IndexedDB for later upload
   */
  async saveTemp(fileId: string, file: File, metadata: FileUploadMetadata): Promise<void> {
    const db = await this.getDb();
    const upload: PendingFileUpload = {
      id: fileId,
      blob: file,
      metadata,
      createdAt: Date.now(),
    };

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(upload);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Upload a file to the server
   */
  async upload(fileId: string, options?: { onProgress?: (progress: number) => void }): Promise<FileUploadResult> {
    const file = await this.getTemp(fileId);
    if (!file) {
      throw new Error(`File ${fileId} not found in temporary storage`);
    }

    const formData = new FormData();
    formData.append("file", file.blob, file.metadata.filename);

    const response = await fetch(this.uploadEndpoint, {
      method: "POST",
      body: formData,
      headers: {
        "X-File-ID": fileId,
      },
    });

    if (!response.ok) {
      throw new Error(`Upload failed: ${response.status} ${response.statusText}`);
    }

    const result: FileUploadResult = await response.json();

    // Remove from temporary storage after successful upload
    await this.removeTemp(fileId);

    return result;
  }

  /**
   * Check if a file has been uploaded (not in temp storage)
   */
  async isUploaded(fileId: string): Promise<boolean> {
    const file = await this.getTemp(fileId);
    return file === null;
  }

  /**
   * Get a file from temporary storage
   */
  async getTemp(fileId: string): Promise<PendingFileUpload | null> {
    const db = await this.getDb();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, "readonly");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(fileId);

      request.onsuccess = () => {
        const result = request.result as PendingFileUpload | undefined;
        resolve(result || null);
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Remove a file from temporary storage
   */
  async removeTemp(fileId: string): Promise<void> {
    const db = await this.getDb();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(fileId);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get all pending uploads
   */
  async getPendingUploads(): Promise<PendingFileUpload[]> {
    const db = await this.getDb();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, "readonly");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result as PendingFileUpload[]);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Clear all temporary files (use with caution)
   */
  async clearAll(): Promise<void> {
    const db = await this.getDb();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
}

// Singleton instance
let instance: FileUploadServiceImpl | null = null;

export function getFileUploadService(options?: { uploadEndpoint?: string }): FileUploadServiceImpl {
  if (!instance) {
    instance = new FileUploadServiceImpl(options);
  }
  return instance;
}

export function resetFileUploadService(): void {
  instance = null;
}

// Export the class type for testing
export { FileUploadServiceImpl };

// Convenience exports matching the interface
export const saveTemp = (fileId: string, file: File, metadata: FileUploadMetadata) =>
  getFileUploadService().saveTemp(fileId, file, metadata);
export const uploadFile = (fileId: string, options?: { onProgress?: (progress: number) => void }) =>
  getFileUploadService().upload(fileId, options);
export const isUploaded = (fileId: string) => getFileUploadService().isUploaded(fileId);
export const getTemp = (fileId: string) => getFileUploadService().getTemp(fileId);
export const removeTemp = (fileId: string) => getFileUploadService().removeTemp(fileId);
export const getPendingUploads = () => getFileUploadService().getPendingUploads();
export const clearAll = () => getFileUploadService().clearAll();
