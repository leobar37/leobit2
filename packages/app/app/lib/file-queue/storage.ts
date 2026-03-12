const DB_NAME = "avileo-file-queue";
const DB_VERSION = 2; // Incrementado para recrear object stores
const STORE_NAME = "pending-uploads";

export interface PendingFileUpload {
  id: string;
  fileData: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  entityType: "payment" | "order" | "business" | "profile";
  entityId?: string;
  fieldName: string;
  createdAt: number;
  attempts: number;
  lastError?: string;
  nextRetryAt?: number;
}

let db: IDBDatabase | null = null;

async function getDb(): Promise<IDBDatabase> {
  if (db) return db;

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      db = request.result;
      resolve(request.result);
    };

    request.onupgradeneeded = (event) => {
      const database = (event.target as IDBOpenDBRequest).result;
      
      // Delete existing store if it exists (to handle schema changes)
      if (database.objectStoreNames.contains(STORE_NAME)) {
        database.deleteObjectStore(STORE_NAME);
      }
      
      // Create fresh store
      const store = database.createObjectStore(STORE_NAME, { keyPath: "id" });
      store.createIndex("entityType", "entityType", { unique: false });
      store.createIndex("createdAt", "createdAt", { unique: false });
    };
  });
}

export async function queueFileUpload(
  file: File,
  entityType: PendingFileUpload["entityType"],
  options: {
    entityId?: string;
    fieldName: string;
  }
): Promise<string> {
  const db = await getDb();
  const id = crypto.randomUUID();

  const fileData = await fileToBase64(file);

  const upload: PendingFileUpload = {
    id,
    fileData,
    filename: file.name,
    mimeType: file.type,
    sizeBytes: file.size,
    entityType,
    entityId: options.entityId,
    fieldName: options.fieldName,
    createdAt: Date.now(),
    attempts: 0,
  };

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.add(upload);

    request.onsuccess = () => resolve(id);
    request.onerror = () => reject(request.error);
  });
}

export async function getPendingUploads(): Promise<PendingFileUpload[]> {
  const db = await getDb();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readonly");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result as PendingFileUpload[]);
    request.onerror = () => reject(request.error);
  });
}

export async function getPendingUploadsByEntity(
  entityType: PendingFileUpload["entityType"],
  entityId?: string
): Promise<PendingFileUpload[]> {
  const uploads = await getPendingUploads();
  return uploads.filter(
    (u) => u.entityType === entityType && (!entityId || u.entityId === entityId)
  );
}

export async function removePendingUpload(id: string): Promise<void> {
  const db = await getDb();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

function calculateNextRetry(attempts: number): number {
  const baseDelay = 5000;
  const maxDelay = 300000;
  const delay = Math.min(baseDelay * Math.pow(2, attempts - 1), maxDelay);
  return Date.now() + delay;
}

export async function markUploadFailed(
  id: string,
  error: string
): Promise<void> {
  const db = await getDb();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const getRequest = store.get(id);

    getRequest.onsuccess = () => {
      const upload = getRequest.result as PendingFileUpload;
      if (upload) {
        upload.attempts += 1;
        upload.lastError = error;
        upload.nextRetryAt = calculateNextRetry(upload.attempts);
        const putRequest = store.put(upload);
        putRequest.onsuccess = () => resolve();
        putRequest.onerror = () => reject(putRequest.error);
      } else {
        resolve();
      }
    };
    getRequest.onerror = () => reject(getRequest.error);
  });
}

export async function getUploadsReadyForRetry(): Promise<PendingFileUpload[]> {
  const uploads = await getPendingUploads();
  const now = Date.now();
  return uploads.filter(
    (u) => u.attempts < 3 && (!u.nextRetryAt || u.nextRetryAt <= now)
  );
}

export async function getFileFromQueue(id: string): Promise<File | null> {
  const db = await getDb();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readonly");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(id);

    request.onsuccess = () => {
      const upload = request.result as PendingFileUpload | undefined;
      if (upload) {
        const file = base64ToFile(upload.fileData, upload.filename, upload.mimeType);
        resolve(file);
      } else {
        resolve(null);
      }
    };
    request.onerror = () => reject(request.error);
  });
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function base64ToFile(base64: string, filename: string, mimeType: string): File {
  const byteString = atob(base64.split(",")[1]);
  const arrayBuffer = new ArrayBuffer(byteString.length);
  const intArray = new Uint8Array(arrayBuffer);

  for (let i = 0; i < byteString.length; i++) {
    intArray[i] = byteString.charCodeAt(i);
  }

  return new File([arrayBuffer], filename, { type: mimeType });
}
