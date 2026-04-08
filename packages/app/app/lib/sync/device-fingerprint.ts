/**
 * Device Fingerprinting
 * Generates and manages a unique device identifier for multi-device sync tracking
 */

const DEVICE_ID_KEY = "avileo_device_id";
const DEVICE_FINGERPRINT_KEY = "avileo_device_fingerprint";

/**
 * Generate a simple UUID v4
 */
function generateUUID(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Get or create a unique device ID for this browser/device
 * This ID persists in localStorage and is used to track which device
 * made changes during sync conflict resolution
 */
export function getDeviceId(): string {
  if (typeof window === "undefined") {
    return "server";
  }

  try {
    let deviceId = localStorage.getItem(DEVICE_ID_KEY);
    if (!deviceId) {
      deviceId = generateUUID();
      localStorage.setItem(DEVICE_ID_KEY, deviceId);
    }
    return deviceId;
  } catch {
    // Fallback if localStorage is not available
    return "unknown-device";
  }
}

/**
 * Get device fingerprint - includes additional metadata about the device
 * This can be useful for debugging multi-device issues
 */
export function getDeviceFingerprint(): string {
  if (typeof window === "undefined") {
    return "server";
  }

  try {
    let fingerprint = localStorage.getItem(DEVICE_FINGERPRINT_KEY);
    if (!fingerprint) {
      const deviceId = getDeviceId();
      const timestamp = Date.now().toString(36);
      const random = Math.random().toString(36).substring(2, 8);
      fingerprint = `${deviceId.substring(0, 8)}-${timestamp}-${random}`;
      localStorage.setItem(DEVICE_FINGERPRINT_KEY, fingerprint);
    }
    return fingerprint;
  } catch {
    return "unknown-fingerprint";
  }
}

/**
 * Clear device identifiers (useful for logout/reset)
 */
export function clearDeviceIdentifiers(): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    localStorage.removeItem(DEVICE_ID_KEY);
    localStorage.removeItem(DEVICE_FINGERPRINT_KEY);
  } catch {
    // Ignore errors
  }
}

/**
 * Regenerate device identifiers (useful for device transfer)
 */
export function regenerateDeviceIdentifiers(): { deviceId: string; fingerprint: string } {
  clearDeviceIdentifiers();
  return {
    deviceId: getDeviceId(),
    fingerprint: getDeviceFingerprint(),
  };
}
