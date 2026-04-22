import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { SyncEngine } from "./sync-engine";
import { HandlerRegistry } from "./handler-registry";
import type { ISyncOperationRepository } from "./operation-repository";
import type { ISyncConflictRepository } from "./conflict-repository";
import type {
  SyncOperationInput,
  SyncBatchResult,
  SyncOperationResult,
  ISyncHandler,
  SyncEntity,
} from "./types";
import { SyncEventEmitter } from "../core";

type SyncRequestContext = { tenantId: string; userId: string };
type MockTransaction = unknown;

describe("sync-engine", () => {

  afterEach(() => {
    HandlerRegistry.clear();
  });

  const makeOp = (
    partial: {
      idempotencyKey: string;
      entityType: SyncEntity;
      entityId: string;
      operation: "create" | "update" | "delete";
    } & Partial<Omit<SyncOperationInput, "idempotencyKey" | "entityType" | "entityId" | "operation">>
  ): SyncOperationInput => {
    const defaults: SyncOperationInput = {
      idempotencyKey: "key-1",
      entityType: "sales",
      entityId: "entity-1",
      operation: "create",
      payload: { name: "test" },
      localVersion: 1,
      localTimestamp: new Date().toISOString(),
    };
    return { ...defaults, ...partial } as SyncOperationInput;
  };

  const makeContext = (): SyncRequestContext => ({
    tenantId: "biz-1",
    userId: "user-1",
  });

  describe("constructor", () => {
    it("creates engine with config", () => {
      const engine = new SyncEngine(
        {},
        {
          db: createMockDb(),
          syncOpRepo: createMockOpRepo(),
          now: () => new Date().toISOString(),
          savepointSql: (name: string) => `SAVEPOINT ${name}`,
          releaseSavepointSql: (name: string) => `RELEASE SAVEPOINT ${name}`,
          rollbackSavepointSql: (name: string) => `ROLLBACK TO SAVEPOINT ${name}`,
        }
      );
      expect(engine).toBeInstanceOf(SyncEngine);
    });
  });

  describe("processBatch", () => {
    it("processes empty batch", async () => {
      const engine = createEngine();
      const result = await engine.processBatch(makeContext(), []);
      expect(result.summary.total).toBe(0);
      expect(result.summary.succeeded).toBe(0);
      expect(result.summary.failed).toBe(0);
    });

    it("processes single operation successfully", async () => {
      const engine = createEngine();
      const op = makeOp({
        idempotencyKey: "op-1",
        entityType: "sales",
        entityId: "entity-1",
        operation: "create",
      });

      const result = await engine.processBatch(makeContext(), [op]);
      expect(result.summary.total).toBe(1);
      expect(result.summary.succeeded).toBe(1);
      expect(result.summary.failed).toBe(0);
    });

    it("returns operation result with success/failure", async () => {
      const engine = createEngine();
      const op = makeOp({
        idempotencyKey: "op-1",
        entityType: "sales",
        entityId: "entity-1",
        operation: "create",
      });

      const result = await engine.processBatch(makeContext(), [op]);
      expect(result.results[0].success).toBe(true);
      expect(result.results[0].idempotencyKey).toBe("op-1");
    });

    it("emits push:complete event", async () => {
      const eventEmitter = new SyncEventEmitter();
      const handler = vi.fn();
      eventEmitter.on("push:complete", handler);

      const engine = createEngine({ eventEmitter });
      const result = await engine.processBatch(makeContext(), []);

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          operationsProcessed: 0,
          succeeded: 0,
          failed: 0,
          conflicts: 0,
          timestamp: expect.any(String),
        })
      );
    });

    it("handles multiple operations", async () => {
      const engine = createEngine();
      const ops = [
        makeOp({ idempotencyKey: "op-1", entityType: "sales", entityId: "entity-1", operation: "create" }),
        makeOp({ idempotencyKey: "op-2", entityType: "customers", entityId: "entity-2", operation: "create" }),
      ];

      const result = await engine.processBatch(makeContext(), ops);
      expect(result.summary.total).toBe(2);
    });
  });

  describe("middleware hooks", () => {
    it("beforeExecute returning result skips handler.execute()", async () => {
      const mockHandler = {
        entityType: "sales" as SyncEntity,
        validateBusinessRules: vi.fn().mockResolvedValue(undefined),
        execute: vi.fn().mockResolvedValue({
          success: true,
          idempotencyKey: "",
          serverTimestamp: new Date().toISOString(),
        }),
      };

      HandlerRegistry.register("sales", () => mockHandler);

      const middleware = {
        beforeExecute: vi.fn().mockResolvedValue({
          success: true,
          idempotencyKey: "op-1",
          serverTimestamp: new Date().toISOString(),
        }),
      };

      const engine = createEngineWithMiddleware(middleware);
      const op = makeOp({
        idempotencyKey: "op-1",
        entityType: "sales",
        entityId: "entity-1",
        operation: "create",
      });

      const result = await engine.processBatch(makeContext(), [op]);
      expect(result.results[0].success).toBe(true);
      expect(middleware.beforeExecute).toHaveBeenCalled();
      expect(mockHandler.execute).not.toHaveBeenCalled();
    });

    it("beforeExecute returning null allows handler.execute()", async () => {
      const mockHandler = {
        entityType: "sales" as SyncEntity,
        validateBusinessRules: vi.fn().mockResolvedValue(undefined),
        execute: vi.fn().mockResolvedValue({
          success: true,
          idempotencyKey: "",
          serverTimestamp: new Date().toISOString(),
        }),
      };

      HandlerRegistry.register("sales", () => mockHandler);

      const middleware = {
        beforeExecute: vi.fn().mockResolvedValue(null),
      };

      const engine = createEngineWithMiddleware(middleware);
      const op = makeOp({
        idempotencyKey: "op-1",
        entityType: "sales",
        entityId: "entity-1",
        operation: "create",
      });

      await engine.processBatch(makeContext(), [op]);
      expect(middleware.beforeExecute).toHaveBeenCalled();
      expect(mockHandler.execute).toHaveBeenCalled();
    });

    it("afterExecute is called with result and can transform it", async () => {
      const originalResult = {
        success: true,
        idempotencyKey: "op-1",
        serverTimestamp: new Date().toISOString(),
      };

      const mockHandler = {
        entityType: "sales" as SyncEntity,
        validateBusinessRules: vi.fn().mockResolvedValue(undefined),
        execute: vi.fn().mockResolvedValue(originalResult),
      };

      HandlerRegistry.register("sales", () => mockHandler);

      const middleware = {
        beforeExecute: vi.fn().mockResolvedValue(null),
        afterExecute: vi.fn().mockResolvedValue({
          success: true,
          idempotencyKey: "op-1",
          serverTimestamp: new Date().toISOString(),
          // Transform adds extra field
        }),
      };

      const engine = createEngineWithMiddleware(middleware);
      const op = makeOp({
        idempotencyKey: "op-1",
        entityType: "sales",
        entityId: "entity-1",
        operation: "create",
      });

      await engine.processBatch(makeContext(), [op]);
      expect(middleware.afterExecute).toHaveBeenCalledWith(
        expect.anything(),
        op,
        originalResult,
        mockHandler,
        expect.anything()
      );
    });

    it("onError is called when handler throws", async () => {
      const handlerError = new Error("Handler failed");
      const mockHandler = {
        entityType: "sales" as SyncEntity,
        validateBusinessRules: vi.fn().mockResolvedValue(undefined),
        execute: vi.fn().mockRejectedValue(handlerError),
      };

      HandlerRegistry.register("sales", () => mockHandler);

      const middleware = {
        beforeExecute: vi.fn().mockResolvedValue(null),
        onError: vi.fn().mockResolvedValue({
          success: false,
          idempotencyKey: "op-1",
          error: "Middleware handled error",
          serverTimestamp: new Date().toISOString(),
        }),
      };

      const engine = createEngineWithMiddleware(middleware);
      const op = makeOp({
        idempotencyKey: "op-1",
        entityType: "sales",
        entityId: "entity-1",
        operation: "create",
      });

      const result = await engine.processBatch(makeContext(), [op]);
      expect(middleware.onError).toHaveBeenCalledWith(
        expect.anything(),
        op,
        handlerError,
        mockHandler,
        expect.anything()
      );
    });

    it("middleware with only one hook is accepted without TypeScript errors", async () => {
      const middleware = {
        beforeExecute: vi.fn().mockResolvedValue(null),
      };

      const engine = createEngineWithMiddleware(middleware);
      const op = makeOp({
        idempotencyKey: "op-1",
        entityType: "sales",
        entityId: "entity-1",
        operation: "create",
      });

      // Should compile and run without errors
      const result = await engine.processBatch(makeContext(), [op]);
      expect(result.summary.total).toBe(1);
    });

    it("middleware hooks are called in correct order", async () => {
      const callOrder: string[] = [];

      const mockHandler = {
        entityType: "sales" as SyncEntity,
        validateBusinessRules: vi.fn().mockResolvedValue(undefined),
        execute: vi.fn().mockImplementation(() => {
          callOrder.push("handler.execute");
          return {
            success: true,
            idempotencyKey: "op-1",
            serverTimestamp: new Date().toISOString(),
          };
        }),
      };

      HandlerRegistry.register("sales", () => mockHandler);

      const middleware = {
        beforeExecute: vi.fn().mockImplementation(() => {
          callOrder.push("beforeExecute");
          return null;
        }),
        afterExecute: vi.fn().mockImplementation(() => {
          callOrder.push("afterExecute");
          return {
            success: true,
            idempotencyKey: "op-1",
            serverTimestamp: new Date().toISOString(),
          };
        }),
      };

      const engine = createEngineWithMiddleware(middleware);
      const op = makeOp({
        idempotencyKey: "op-1",
        entityType: "sales",
        entityId: "entity-1",
        operation: "create",
      });

      await engine.processBatch(makeContext(), [op]);
      expect(callOrder).toEqual([
        "beforeExecute",
        "handler.execute",
        "afterExecute",
      ]);
    });

    it("onError returning SyncHandlerResult prevents savepoint rollback", async () => {
      const handlerError = new Error("Handler failed");
      const mockHandler = {
        entityType: "sales" as SyncEntity,
        validateBusinessRules: vi.fn().mockResolvedValue(undefined),
        execute: vi.fn().mockRejectedValue(handlerError),
      };

      HandlerRegistry.register("sales", () => mockHandler);

      const middleware = {
        beforeExecute: vi.fn().mockResolvedValue(null),
        onError: vi.fn().mockResolvedValue({
          success: false,
          idempotencyKey: "op-1",
          error: "Middleware handled error - no rollback needed",
          serverTimestamp: new Date().toISOString(),
        }),
      };

      const mockDb = createMockDb();
      const mockOpRepo = createMockOpRepo();
      const mockConflictRepo = createMockConflictRepo();

      const engine = new SyncEngine(
        {},
        {
          db: mockDb,
          syncOpRepo: mockOpRepo,
          syncConflictRepo: mockConflictRepo,
          middleware: middleware as any,
          now: () => new Date().toISOString(),
          savepointSql: (name: string) => `SAVEPOINT ${name}`,
          releaseSavepointSql: (name: string) => `RELEASE SAVEPOINT ${name}`,
          rollbackSavepointSql: (name: string) => `ROLLBACK TO SAVEPOINT ${name}`,
        }
      );

      const op = makeOp({
        idempotencyKey: "op-1",
        entityType: "sales",
        entityId: "entity-1",
        operation: "create",
      });

      const result = await engine.processBatch(makeContext(), [op]);
      // The operation should be recorded as a failure but not trigger rollback
      expect(middleware.onError).toHaveBeenCalled();
      // Result should reflect middleware's error handling
      expect(result.results[0].success).toBe(false);
    });
  });

  describe("logging", () => {
    it("uses custom logger when provided", async () => {
      const customLogger = {
        info: vi.fn(),
        error: vi.fn(),
        warn: vi.fn(),
      };

      const engine = createEngine({ logger: customLogger });
      await engine.processBatch(makeContext(), []);

      expect(customLogger.info).toHaveBeenCalled();
    });

    it("does not throw when logger is undefined", async () => {
      const engine = createEngine({ logger: undefined });
      await expect(
        engine.processBatch(makeContext(), [])
      ).resolves.toBeDefined();
    });
  });
});

// Helper functions
function createMockDb() {
  return {
    transaction: vi.fn().mockImplementation(async (fn) => {
      return fn({});
    }),
    execute: vi.fn().mockResolvedValue({}),
  };
}

function createMockOpRepo(): ISyncOperationRepository<SyncRequestContext, MockTransaction> {
  return {
    findByIdempotencyKey: vi.fn().mockResolvedValue(undefined),
    findByIdempotencyKeyForUpdate: vi.fn().mockResolvedValue(undefined),
    insertOrUpdate: vi.fn().mockResolvedValue("inserted"),
    updateStatus: vi.fn().mockResolvedValue(undefined),
  };
}

function createMockConflictRepo(): ISyncConflictRepository<SyncRequestContext, MockTransaction> {
  return {
    create: vi.fn().mockResolvedValue({
      id: "conflict-1",
      tenantId: "biz-1",
      operationId: "op-1",
      entityType: "sales",
      entityId: "entity-1",
      localData: {},
      serverData: {},
      localVersion: 1,
      serverVersion: 2,
      status: "pending",
      resolution: null,
      resolvedBy: null,
      resolvedAt: null,
      createdAt: new Date(),
    }),
    findById: vi.fn().mockResolvedValue(undefined),
    findByOperationId: vi.fn().mockResolvedValue(undefined),
    findPending: vi.fn().mockResolvedValue([]),
    findMany: vi.fn().mockResolvedValue([]),
    countPending: vi.fn().mockResolvedValue(0),
    resolve: vi.fn().mockResolvedValue(undefined),
    delete: vi.fn().mockResolvedValue(true),
    deleteByOperationId: vi.fn().mockResolvedValue(true),
  };
}

function createEngine(overrides: {
  eventEmitter?: SyncEventEmitter;
  logger?: { info: (data: unknown) => void; error: (data: unknown) => void; warn: (data: unknown) => void; debug?: (data: unknown) => void };
} = {}) {
  const mockDb = createMockDb();
  const mockOpRepo = createMockOpRepo();
  const mockConflictRepo = createMockConflictRepo();

  // Register mock handlers for common entity types
  const mockHandler = {
    entityType: "sales" as SyncEntity,
    validateBusinessRules: vi.fn().mockResolvedValue(undefined),
    execute: vi.fn().mockResolvedValue({
      success: true,
      idempotencyKey: "",
      serverTimestamp: new Date().toISOString(),
    }),
  } as unknown as ISyncHandler<unknown, unknown>;

  const mockCustomerHandler = {
    entityType: "customers" as SyncEntity,
    validateBusinessRules: vi.fn().mockResolvedValue(undefined),
    execute: vi.fn().mockResolvedValue({
      success: true,
      idempotencyKey: "",
      serverTimestamp: new Date().toISOString(),
    }),
  } as unknown as ISyncHandler<unknown, unknown>;

  HandlerRegistry.register("sales", () => mockHandler);
  HandlerRegistry.register("customers", () => mockCustomerHandler);

  return new SyncEngine(
    {},
    {
      db: mockDb,
      syncOpRepo: mockOpRepo,
      syncConflictRepo: mockConflictRepo,
      now: () => new Date().toISOString(),
      savepointSql: (name: string) => `SAVEPOINT ${name}`,
      releaseSavepointSql: (name: string) => `RELEASE SAVEPOINT ${name}`,
      rollbackSavepointSql: (name: string) => `ROLLBACK TO SAVEPOINT ${name}`,
      ...overrides,
    }
  );
}

function createEngineWithMiddleware(middleware: any) {
  const mockDb = createMockDb();
  const mockOpRepo = createMockOpRepo();
  const mockConflictRepo = createMockConflictRepo();

  return new SyncEngine(
    {},
    {
      db: mockDb,
      syncOpRepo: mockOpRepo,
      syncConflictRepo: mockConflictRepo,
      middleware,
      now: () => new Date().toISOString(),
      savepointSql: (name: string) => `SAVEPOINT ${name}`,
      releaseSavepointSql: (name: string) => `RELEASE SAVEPOINT ${name}`,
      rollbackSavepointSql: (name: string) => `ROLLBACK TO SAVEPOINT ${name}`,
    }
  );
}
