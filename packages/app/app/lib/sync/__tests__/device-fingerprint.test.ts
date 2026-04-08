/**
 * Device Fingerprinting Tests
 * Tests for multi-device identification utilities
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  getDeviceId,
  getDeviceFingerprint,
  clearDeviceIdentifiers,
  regenerateDeviceIdentifiers,
} from "../device-fingerprint";

describe("Device Fingerprinting", () => {
  // Mock localStorage
  let localStorageMock: Record<string, string> = {};

  beforeEach(() => {
    localStorageMock = {};
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => localStorageMock[key] || null,
      setItem: (key: string, value: string) => {
        localStorageMock[key] = value;
      },
      removeItem: (key: string) => {
        delete localStorageMock[key];
      },
    });
  });

  describe("getDeviceId", () => {
    it("should generate a new device ID when none exists", () => {
      const deviceId = getDeviceId();

      expect(deviceId).toBeDefined();
      expect(deviceId).not.toBe("unknown-device");
      expect(deviceId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    });

    it("should return the same device ID on subsequent calls", () => {
      const deviceId1 = getDeviceId();
      const deviceId2 = getDeviceId();

      expect(deviceId1).toBe(deviceId2);
    });

    it("should persist device ID in localStorage", () => {
      const deviceId = getDeviceId();

      expect(localStorageMock["avileo_device_id"]).toBe(deviceId);
    });

    it("should return 'server' when window is undefined", () => {
      vi.stubGlobal("window", undefined);

      const deviceId = getDeviceId();

      expect(deviceId).toBe("server");
    });
  });

  describe("getDeviceFingerprint", () => {
    it("should generate a new fingerprint when none exists", () => {
      const fingerprint = getDeviceFingerprint();

      expect(fingerprint).toBeDefined();
      expect(fingerprint).not.toBe("unknown-fingerprint");
    });

    it("should return the same fingerprint on subsequent calls", () => {
      const fingerprint1 = getDeviceFingerprint();
      const fingerprint2 = getDeviceFingerprint();

      expect(fingerprint1).toBe(fingerprint2);
    });

    it("should persist fingerprint in localStorage", () => {
      const fingerprint = getDeviceFingerprint();

      expect(localStorageMock["avileo_device_fingerprint"]).toBe(fingerprint);
    });

    it("should include device ID prefix in fingerprint", () => {
      const deviceId = getDeviceId();
      const fingerprint = getDeviceFingerprint();

      expect(fingerprint.startsWith(deviceId.substring(0, 8))).toBe(true);
    });
  });

  describe("clearDeviceIdentifiers", () => {
    it("should remove device identifiers from localStorage", () => {
      // Setup
      getDeviceId();
      getDeviceFingerprint();

      expect(localStorageMock["avileo_device_id"]).toBeDefined();
      expect(localStorageMock["avileo_device_fingerprint"]).toBeDefined();

      // Clear
      clearDeviceIdentifiers();

      expect(localStorageMock["avileo_device_id"]).toBeUndefined();
      expect(localStorageMock["avileo_device_fingerprint"]).toBeUndefined();
    });
  });

  describe("regenerateDeviceIdentifiers", () => {
    it("should generate new device identifiers", () => {
      const oldDeviceId = getDeviceId();
      const oldFingerprint = getDeviceFingerprint();

      const { deviceId, fingerprint } = regenerateDeviceIdentifiers();

      expect(deviceId).not.toBe(oldDeviceId);
      expect(fingerprint).not.toBe(oldFingerprint);
    });

    it("should return valid identifiers", () => {
      const { deviceId, fingerprint } = regenerateDeviceIdentifiers();

      expect(deviceId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
      expect(fingerprint).toBeDefined();
      expect(fingerprint.length).toBeGreaterThan(0);
    });
  });
});
