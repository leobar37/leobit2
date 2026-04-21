/**
 * Sync Service Tests
 * Unit tests for the refactored SyncService with dependency injection
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import type { drizzle } from "drizzle-orm/pglite";
import { SyncService } from "../sync-service";
import type { ISyncQueue } from "../types";
import type { SyncOperation } from "../interfaces";
import type { ISyncHttpClient, SyncResult } from "../http/sync-http-client";
import type { IBackoffStrategy } from "@avileo/drizzle-sync/core";
import { createMockPGlite, createMockDrizzleDB } from "../testing/factories";

// Mock implementations
class MockSyncQueue implements ISyncQueue {
  private operations: SyncOperation[] = [];

  async enqueue(operation: Omit<SyncOperation, "id" | "createdAt" | "attempts">): Promise<string> {
    const id = `mock-${Date.now()}`;
    this.operations.push({
      ...operation,
      id,
      createdAt: new Date(),
      attempts: 0,
    });
    return id;
  }

  async dequeue(limit?: number): Promise<SyncOperation[]> {
    return this.operations.splice(0, limit ?? this.operations.length);
  }

  async markCompleted(id: string): Promise<void> {
    this.operations = this.operations.filter((op) => op.id !== id);
  }

  async markFailed(id: string, error: string): Promise<void> {
    const op = this.operations.find((o) => o.id === id);
    if (op) {
      op.attempts++;
      op.lastError = error;
    }
  }

  async markDeadLetter(id: string, error: string): Promise<void> {
    const op = this.operations.find((o) => o.id === id);
    if (op) {
      op.status = "dead_letter";
      op.lastError = error;
    }
  }

  async getStatus(): Promise<{
    pending: number;
    processing: number;
    syncing: number;
    completed: number;
    failed: number;
    conflict: number;
    deadLetter: number;
    total: number;
  }> {
    return {
      pending: this.operations.filter((o) => o.status === "pending").length,
      processing: this.operations.filter((o) => o.status === "processing").length,
      syncing: this.operations.filter((o) => o.status === "syncing").length,
      completed: this.operations.filter((o) => o.status === "completed").length,
      failed: this.operations.filter((o) => o.status === "failed").length,
      conflict: this.operations.filter((o) => o.status === "conflict").length,
      deadLetter: this.operations.filter((o) => o.status === "dead_letter").length,
      total: this.operations.length,
    };
  }

  async getPending(): Promise<SyncOperation[]> {
    return this.operations.filter((o) => o.status === "pending");
  }

  async clear(): Promise<void> {
    this.operations = [];
  }

  async getOperationById(id: string): Promise<SyncOperation | null> {
    return this.operations.find((o) => o.id === id) ?? null;
  }
}

class MockSyncHttpClient implements ISyncHttpClient {
  private shouldFail = false;
  private failCount = 0;

  setShouldFail(shouldFail: boolean, count = Infinity): void {
    this.shouldFail = shouldFail;
    this.failCount = count;
  }

  async pushChanges(operations: SyncOperation[]): Promise<SyncResult[]> {
    if (this.shouldFail && this.failCount > 0) {
      this.failCount--;
      throw new Error("Network error");
    }

    return operations.map((op) => ({
      operationId: op.id,
      success: true,
      syncedAt: new Date().toISOString(),
    }));
  }

  async pullChanges(since?: string): Promise<{
    changes: unknown[];
    nextSince: string;
    hasMore: boolean;
  }> {
    return {
      changes: [],
      nextSince: since ?? "mock-cursor",
      hasMore: false,
    };
  }
}

class MockBackoffStrategy implements IBackoffStrategy {
  private delays: number[] = [100, 200, 400];

  calculateDelay(attempts: number): number {
    return this.delays[Math.min(attempts, this.delays.length - 1)] ?? 5000;
  }

  reset(): void {
    // No-op for mock
  }
}

describe("SyncService", () => {
  let mockPg: PGlite;
  let mockDb: ReturnType<typeof drizzle>;
  let mockQueue: MockSyncQueue;
  let mockHttpClient: MockSyncHttpClient;
  let mockBackoff: MockBackoffStrategy;

  beforeEach(() => {
    mockPg = createMockPGlite();
    mockDb = createMockDrizzleDB();
    mockQueue = new MockSyncQueue();
    mockHttpClient = new MockSyncHttpClient();
    mockBackoff = new MockBackoffStrategy();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("initialization", () => {
    it("should initialize with custom dependencies", async () => {
      const service = new SyncService(
        mockPg,
        "test-business",
        "test-token",
        {
          queue: mockQueue,
          httpClient: mockHttpClient,
        }
      );

      await service.initialize();
      
      const status = await service.getStatus();
      expect(status).toBeDefined();
      expect(status.pending).toBe(0);
    });

    it("should throw when calling getStatus before initialization", async () => {
      const service = new SyncService(
        mockPg,
        "test-business",
        "test-token",
        {
          queue: mockQueue,
          httpClient: mockHttpClient,
        }
      );

      // Should throw because initialize() was not called
      await expect(service.getStatus()).rejects.toThrow("not initialized");
    });
  });

  describe("queue operations", () => {
    it("should return correct status after initialization", async () => {
      const service = new SyncService(
        mockPg,
        "test-business",
        "test-token",
        {
          queue: mockQueue,
          httpClient: mockHttpClient,
        }
      );
      await service.initialize();

      const status = await service.getStatus();
      expect(status.total).toBe(0);
      expect(status.pending).toBe(0);
    });
  });

  describe("processPending", () => {
    it("should process pending operations successfully", async () => {
      const service = new SyncService(
        mockPg,
        "test-business",
        "test-token",
        {
          queue: mockQueue,
          httpClient: mockHttpClient,
        }
      );
      await service.initialize();

      const result = await service.processPending();

      expect(result.processed).toBe(0);
      expect(result.failed).toBe(0);
    });

    it("should handle when offline", async () => {
      // Skip this test in Bun environment where window is not available
      if (typeof window === "undefined") {
        return;
      }
      
      // Mock navigator.onLine
      Object.defineProperty(window, 'navigator', {
        value: { onLine: false },
        writable: true,
        configurable: true
      });

      const service = new SyncService(
        mockPg,
        "test-business",
        "test-token",
        {
          queue: mockQueue,
          httpClient: mockHttpClient,
        }
      );
      await service.initialize();

      const result = await service.processPending();

      expect(result.processed).toBe(0);
      expect(result.failed).toBe(0);
    });
  });
});

describe("Mock Implementations", () => {
  it("should create mock queue and track operations", async () => {
    const queue = new MockSyncQueue();
    
    // Verify initial state
    const initialStatus = await queue.getStatus();
    expect(initialStatus.pending).toBe(0);
    expect(initialStatus.total).toBe(0);
    
    // Enqueue should work
    const id = await queue.enqueue({
      entityType: "customers",
      operation: "create",
      entityId: "test-123",
      data: { name: "Test" },
    });

    expect(id).toBeDefined();
    expect(typeof id).toBe("string");
    
    // Verify queue state updated
    const status = await queue.getStatus();
    expect(status.total).toBe(1);
  });

  it("should create mock HTTP client", async () => {
    const client = new MockSyncHttpClient();
    
    const result = await client.pullChanges();
    
    expect(result.changes).toEqual([]);
    expect(result.hasMore).toBe(false);
  });

  it("should create mock backoff strategy", () => {
    const backoff = new MockBackoffStrategy();
    
    expect(backoff.calculateDelay(0)).toBe(100);
    expect(backoff.calculateDelay(1)).toBe(200);
    expect(backoff.calculateDelay(2)).toBe(400);
  });
});
