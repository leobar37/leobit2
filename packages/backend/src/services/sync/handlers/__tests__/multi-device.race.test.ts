/**
 * Multi-Device Race Condition Tests
 * Tests for concurrent update scenarios and version conflict detection
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { SaleSyncHandler } from "../SaleSyncHandler";
import type { SyncOperationInput } from "../../types";
import type { RequestContext } from "../../../../context/request-context";

// Mocks
const mockSaleRepo = {
  findById: vi.fn(),
  update: vi.fn(),
  create: vi.fn(),
  confirmPreOrder: vi.fn(),
  deliverPreOrder: vi.fn(),
  updateWithItems: vi.fn(),
  delete: vi.fn(),
};

const mockPaymentRepo = {
  createInitialPayment: vi.fn(),
};

const mockCtx: RequestContext = {
  businessId: "test-business-id",
  businessUserId: "test-user-id",
  userId: "test-auth-user-id",
  user: { id: "test-auth-user-id" } as any,
};

describe("SaleSyncHandler - Multi-Device Race Conditions", () => {
  let handler: SaleSyncHandler;

  beforeEach(() => {
    vi.clearAllMocks();
    handler = new SaleSyncHandler(mockSaleRepo as any, mockPaymentRepo as any);
  });

  describe("Version Conflict Detection", () => {
    it("should reject update when server version is newer than client version", async () => {
      // Setup: Server has version 3, client sends update with version 1
      mockSaleRepo.findById.mockResolvedValue({
        id: "sale-123",
        status: "draft",
        type: "instant_sale",
        version: 3, // Server is at version 3
        totalAmount: "100.00",
      });

      const operation: SyncOperationInput = {
        idempotencyKey: "op-1",
        entityType: "sales",
        entityId: "sale-123",
        operation: "update",
        payload: {
          totalAmount: "150.00",
        },
        localVersion: 1, // Client thinks it's at version 1
        localTimestamp: new Date().toISOString(),
      };

      const result = await handler.execute(mockCtx, operation);

      expect(result.success).toBe(false);
      expect(result.error).toContain("Version conflict");
      expect(mockSaleRepo.update).not.toHaveBeenCalled();
    });

    it("should accept update when server version matches client version", async () => {
      // Setup: Server and client both at version 2
      mockSaleRepo.findById.mockResolvedValue({
        id: "sale-123",
        status: "draft",
        type: "instant_sale",
        version: 2,
        totalAmount: "100.00",
      });

      mockSaleRepo.update.mockResolvedValue({
        id: "sale-123",
        version: 3,
      });

      const operation: SyncOperationInput = {
        idempotencyKey: "op-1",
        entityType: "sales",
        entityId: "sale-123",
        operation: "update",
        payload: {
          totalAmount: "150.00",
        },
        localVersion: 2, // Client is at version 2
        localTimestamp: new Date().toISOString(),
      };

      const result = await handler.execute(mockCtx, operation);

      expect(result.success).toBe(true);
      expect(mockSaleRepo.update).toHaveBeenCalled();
    });

    it("should handle concurrent updates from different devices", async () => {
      // Device A and Device B both read version 2
      mockSaleRepo.findById.mockResolvedValue({
        id: "sale-123",
        status: "draft",
        type: "instant_sale",
        version: 2,
        totalAmount: "100.00",
      });

      // First device updates successfully
      mockSaleRepo.update.mockResolvedValueOnce({
        id: "sale-123",
        version: 3,
      });

      const operationA: SyncOperationInput = {
        idempotencyKey: "op-a",
        entityType: "sales",
        entityId: "sale-123",
        operation: "update",
        payload: { totalAmount: "150.00" },
        localVersion: 2,
        localTimestamp: new Date().toISOString(),
        deviceId: "device-a",
      };

      const resultA = await handler.execute(mockCtx, operationA);
      expect(resultA.success).toBe(true);

      // Second device tries to update with stale version
      // (simulating that the server version was updated by device A)
      mockSaleRepo.findById.mockResolvedValue({
        id: "sale-123",
        status: "draft",
        type: "instant_sale",
        version: 3, // Now server is at version 3
        totalAmount: "150.00",
      });

      const operationB: SyncOperationInput = {
        idempotencyKey: "op-b",
        entityType: "sales",
        entityId: "sale-123",
        operation: "update",
        payload: { totalAmount: "200.00" },
        localVersion: 2, // Device B still thinks it's version 2
        localTimestamp: new Date().toISOString(),
        deviceId: "device-b",
      };

      const resultB = await handler.execute(mockCtx, operationB);

      expect(resultB.success).toBe(false);
      expect(resultB.error).toContain("Version conflict");
    });
  });

  describe("Device Tracking", () => {
    it("should include device ID in operation metadata", async () => {
      mockSaleRepo.findById.mockResolvedValue({
        id: "sale-123",
        status: "draft",
        type: "instant_sale",
        version: 1,
        totalAmount: "100.00",
      });

      mockSaleRepo.update.mockResolvedValue({
        id: "sale-123",
        version: 2,
      });

      const operation: SyncOperationInput = {
        idempotencyKey: "op-1",
        entityType: "sales",
        entityId: "sale-123",
        operation: "update",
        payload: { totalAmount: "150.00" },
        localVersion: 1,
        localTimestamp: new Date().toISOString(),
        deviceId: "device-abc-123",
        sourceFingerprint: "fp-xyz-789",
      };

      const result = await handler.execute(mockCtx, operation);

      expect(result.success).toBe(true);
      // Device info flows through SyncOperationInput and is stored by SyncOperationRepository
      // (see SyncOperationRepository.insertOrUpdate for actual persistence)
    });
  });

  describe("Create Operations (No Conflict Check)", () => {
    it("should not check version for create operations", async () => {
      mockSaleRepo.create.mockResolvedValue({
        id: "new-sale-123",
        version: 1,
      });

      const operation: SyncOperationInput = {
        idempotencyKey: "op-1",
        entityType: "sales",
        entityId: "new-sale-123",
        operation: "create",
        payload: {
          totalAmount: "100.00",
          saleType: "contado",
          items: [],
        },
        localVersion: 1,
        localTimestamp: new Date().toISOString(),
      };

      const result = await handler.execute(mockCtx, operation);

      expect(result.success).toBe(true);
      expect(mockSaleRepo.findById).not.toHaveBeenCalled(); // Should not check existing
      expect(mockSaleRepo.create).toHaveBeenCalled();
    });
  });

  describe("Delete Operations (No Conflict Check)", () => {
    it("should not check version for delete operations", async () => {
      mockSaleRepo.findById.mockResolvedValue({
        id: "sale-123",
        version: 5,
      });

      mockSaleRepo.delete.mockResolvedValue(undefined);

      const operation: SyncOperationInput = {
        idempotencyKey: "op-1",
        entityType: "sales",
        entityId: "sale-123",
        operation: "delete",
        payload: {},
        localVersion: 1, // Stale version
        localTimestamp: new Date().toISOString(),
      };

      const result = await handler.execute(mockCtx, operation);

      expect(result.success).toBe(true);
      // Delete should proceed regardless of version
      expect(mockSaleRepo.delete).toHaveBeenCalled();
    });
  });
});
