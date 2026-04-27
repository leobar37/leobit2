/**
 * Device Identity Types
 *
 * Abstraction for device identification used in multi-device sync conflict resolution.
 * Allows the library to run on any platform (browser, React Native, Node.js)
 * by injecting the storage backend instead of hardcoding localStorage.
 */

import type { IKVStorage } from "./storage";

/**
 * Device identity interface.
 * Provides device ID and fingerprint for multi-device sync tracking.
 */
export interface IDeviceIdentity {
  /** Get the persistent device ID */
  getDeviceId(): string;
  /** Get a device fingerprint with optional metadata */
  getFingerprint(): string;
  /** Clear stored device identifiers */
  clear(): void;
  /** Clear and regenerate identifiers (e.g., after device transfer) */
  regenerate(): { deviceId: string; fingerprint: string };
}

/**
 * Options for creating a device identity implementation.
 */
export interface DeviceIdentityOptions {
  /** Prefix for storage keys (default: "drizzle_sync") */
  prefix?: string;
  /** Namespace suffix for multi-tenancy isolation */
  namespace?: string;
  /** Custom IKVStorage backend (default: in-memory for SSR) */
  storage?: IKVStorage;
}
