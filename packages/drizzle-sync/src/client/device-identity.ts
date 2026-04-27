/**
 * Device Identity Implementation
 *
 * Provides device identification using an injectable IKVStorage backend.
 * Supports browser (localStorage), React Native (AsyncStorage), and in-memory for SSR.
 */

import type { IKVStorage } from "./storage";
import { createNoOpStorage } from "./storage/storage";
import type { DeviceIdentityOptions, IDeviceIdentity } from "./device-identity-types";

const DEFAULT_PREFIX = "drizzle_sync";
const DEVICE_ID_SUFFIX = "device_id";
const DEVICE_FINGERPRINT_SUFFIX = "device_fingerprint";

function buildKey(suffix: string, prefix: string, namespace?: string): string {
  return namespace ? `${prefix}:${namespace}_${suffix}` : `${prefix}_${suffix}`;
}

function generateUUID(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * In-memory device identity for SSR, Node.js, or test environments.
 */
class InMemoryDeviceIdentity implements IDeviceIdentity {
  private deviceId: string;
  private fingerprint: string;

  constructor() {
    this.deviceId = generateUUID();
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    this.fingerprint = `${this.deviceId.substring(0, 8)}-${timestamp}-${random}`;
  }

  getDeviceId(): string {
    return this.deviceId;
  }

  getFingerprint(): string {
    return this.fingerprint;
  }

  clear(): void {
    this.deviceId = generateUUID();
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    this.fingerprint = `${this.deviceId.substring(0, 8)}-${timestamp}-${random}`;
  }

  regenerate(): { deviceId: string; fingerprint: string } {
    this.clear();
    return { deviceId: this.deviceId, fingerprint: this.fingerprint };
  }
}

/**
 * Storage-backed device identity using an injectable IKVStorage.
 */
class StorageDeviceIdentity implements IDeviceIdentity {
  private readonly storage: IKVStorage;
  private readonly prefix: string;
  private readonly namespace?: string;
  private readonly deviceIdKey: string;
  private readonly fingerprintKey: string;

  constructor(storage: IKVStorage, options?: DeviceIdentityOptions) {
    this.storage = storage;
    this.prefix = options?.prefix ?? DEFAULT_PREFIX;
    this.namespace = options?.namespace;
    this.deviceIdKey = buildKey(DEVICE_ID_SUFFIX, this.prefix, this.namespace);
    this.fingerprintKey = buildKey(DEVICE_FINGERPRINT_SUFFIX, this.prefix, this.namespace);
  }

  getDeviceId(): string {
    try {
      let deviceId = this.storage.getItem(this.deviceIdKey);
      if (!deviceId) {
        deviceId = generateUUID();
        this.storage.setItem(this.deviceIdKey, deviceId);
      }
      return deviceId;
    } catch {
      return "unknown-device";
    }
  }

  getFingerprint(): string {
    try {
      let fingerprint = this.storage.getItem(this.fingerprintKey);
      if (!fingerprint) {
        const deviceId = this.getDeviceId();
        const timestamp = Date.now().toString(36);
        const random = Math.random().toString(36).substring(2, 8);
        fingerprint = `${deviceId.substring(0, 8)}-${timestamp}-${random}`;
        this.storage.setItem(this.fingerprintKey, fingerprint);
      }
      return fingerprint;
    } catch {
      return "unknown-fingerprint";
    }
  }

  clear(): void {
    try {
      this.storage.removeItem(this.deviceIdKey);
      this.storage.removeItem(this.fingerprintKey);
    } catch {
      // Ignore
    }
  }

  regenerate(): { deviceId: string; fingerprint: string } {
    this.clear();
    return { deviceId: this.getDeviceId(), fingerprint: this.getFingerprint() };
  }
}

/**
 * Create an in-memory device identity for SSR/Node.js environments.
 */
export function createInMemoryDeviceIdentity(): IDeviceIdentity {
  return new InMemoryDeviceIdentity();
}

/**
 * Create a storage-backed device identity using the provided IKVStorage backend.
 *
 * @example
 * ```typescript
 * // Browser: use localStorage-backed storage
 * import { createStorageAdapter, createLocalStorageBackend } from './storage';
 * const identity = createDeviceIdentity(createLocalStorageBackend());
 *
 * // React Native: use AsyncStorage-backed storage
 * import { createAsyncStorageBackend } from './storage/react-native';
 * const identity = createDeviceIdentity(await createAsyncStorageBackend());
 * ```
 */
export function createDeviceIdentity(
  storage: IKVStorage,
  options?: DeviceIdentityOptions
): IDeviceIdentity {
  return new StorageDeviceIdentity(storage, options);
}

/**
 * Create a device identity from a StorageAdapter-compatible config.
 * Uses a no-op storage for SSR environments where localStorage is unavailable.
 */
export function createDeviceIdentityFromConfig(
  options?: DeviceIdentityOptions
): IDeviceIdentity {
  const storage = options?.storage ?? createNoOpStorage();
  return new StorageDeviceIdentity(storage, options);
}

export type { IDeviceIdentity, DeviceIdentityOptions } from "./device-identity-types";
