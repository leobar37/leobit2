import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  BaseSyncHandler,
  SyncErrorCategory,
  type PostgresErrorDetails,
} from "./base-handler";
import type { SyncOperationInput, EntityRegistry, SyncEntity } from "./types";

describe("base-handler", () => {
  // Concrete implementation for testing abstract class
  class TestHandler extends BaseSyncHandler {
    readonly entityType: SyncEntity = "sales";

    async validateBusinessRules(): Promise<void> {}

    async execute(): Promise<{ success: boolean; idempotencyKey: string; error?: string; serverTimestamp: string }> {
      return { success: true, idempotencyKey: "", serverTimestamp: new Date().toISOString() };
    }

    // Expose protected methods for testing
    testGenerateCorrelationId(): string {
      return this.generateCorrelationId();
    }

    testExtractPostgresError(error: Error): PostgresErrorDetails {
      return this.extractPostgresError(error);
    }

    testClassifyError(error: Error): string {
      return this.classifyError(error);
    }

    testCreateSuccessResult(op: SyncOperationInput) {
      return this.createSuccessResult(op);
    }

    testCreateErrorResult(op: SyncOperationInput, error: string) {
      return this.createErrorResult(op, error);
    }

    testLogStart(ctx: unknown, op: SyncOperationInput, details?: Record<string, unknown>) {
      return this.logStart(ctx as never, op, details);
    }

    testLogSuccess(ctx: unknown, op: SyncOperationInput, details?: Record<string, unknown>) {
      return this.logSuccess(ctx as never, op, details);
    }

    testLogError(ctx: unknown, op: SyncOperationInput, error: Error, details?: Record<string, unknown>) {
      return this.logError(ctx as never, op, error, details);
    }

    testLogValidationError(
      ctx: unknown,
      op: SyncOperationInput,
      error: Error,
      payload: Record<string, unknown>,
      validationErrors: string[],
      details?: Record<string, unknown>
    ) {
      return this.logValidationError(ctx as never, op, error, payload, validationErrors, details);
    }
  }

  let handler: TestHandler;

  beforeEach(() => {
    handler = new TestHandler();
  });

  const makeOp = (overrides: Partial<SyncOperationInput> = {}): SyncOperationInput =>
    ({
      idempotencyKey: "key-1",
      entityType: "sales",
      entityId: "entity-1",
      operation: "create",
      payload: {},
      localVersion: 1,
      localTimestamp: new Date().toISOString(),
      ...overrides,
    }) as unknown as SyncOperationInput;

  describe("entityType", () => {
    it("has entityType defined", () => {
      expect(handler.entityType).toBe("sales");
    });
  });

  describe("setRegistry", () => {
    it("sets the entity registry", () => {
      const mockRegistry = {
        register: vi.fn(),
        wasCreated: vi.fn().mockReturnValue(false),
        wasModified: vi.fn().mockReturnValue(false),
        wasDeleted: vi.fn().mockReturnValue(false),
        clear: vi.fn(),
        getStats: vi.fn().mockReturnValue({ created: 0, updated: 0, deleted: 0 }),
      } as unknown as EntityRegistry;
      handler.setRegistry(mockRegistry);
      // Access protected registry via public method that uses it
      expect(handler["registry"]).toBe(mockRegistry);
    });
  });

  describe("setLogger", () => {
    it("sets the logger", () => {
      const mockLogger = {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        debug: vi.fn(),
      };
      handler.setLogger(mockLogger);
      expect(handler["logger"]).toBe(mockLogger);
    });
  });

  describe("generateCorrelationId", () => {
    it("generates a unique correlation ID", () => {
      const id1 = handler.testGenerateCorrelationId();
      const id2 = handler.testGenerateCorrelationId();
      expect(id1).toMatch(/^sync-\d+-[a-z0-9]+$/);
      expect(id1).not.toBe(id2);
    });
  });

  describe("extractPostgresError", () => {
    it("extracts PostgreSQL error details from direct error", () => {
      const pgError = new Error("duplicate key") as Error & PostgresErrorDetails;
      pgError.code = "23505";
      pgError.detail = "Key (id)=(1) already exists";
      pgError.routine = "btree_index_tuple";

      const result = handler.testExtractPostgresError(pgError);
      expect(result.code).toBe("23505");
      expect(result.detail).toBe("Key (id)=(1) already exists");
      expect(result.routine).toBe("btree_index_tuple");
    });

    it("extracts PostgreSQL error from cause chain", () => {
      const cause = new Error("underlying error") as Error & PostgresErrorDetails;
      cause.code = "23505";
      cause.detail = "duplicate key";

      const error = new Error("wrapper") as Error;
      error.cause = cause;

      const result = handler.testExtractPostgresError(error);
      expect(result.code).toBe("23505");
    });

    it("returns nulls when no PostgreSQL error found", () => {
      const error = new Error("regular error");
      const result = handler.testExtractPostgresError(error);
      expect(result.code).toBeNull();
      expect(result.detail).toBeNull();
      expect(result.routine).toBeNull();
    });

    it("handles deeply nested cause chain", () => {
      const pgCause = new Error("pg") as Error & PostgresErrorDetails;
      pgCause.code = "23505";

      const midCause = new Error("mid");
      midCause.cause = pgCause;

      const error = new Error("outer");
      error.cause = midCause;

      const result = handler.testExtractPostgresError(error);
      expect(result.code).toBe("23505");
    });

    it("handles circular cause chain (does not infinite loop)", () => {
      const error1 = new Error("e1") as Error;
      const error2 = new Error("e2") as Error;
      error1.cause = error2;
      error2.cause = error1;

      const result = handler.testExtractPostgresError(error1);
      expect(result.code).toBeNull();
    });
  });

  describe("classifyError", () => {
    it("classifies validation errors", () => {
      expect(handler.testClassifyError(new Error("validation failed"))).toBe(SyncErrorCategory.VALIDATION_ERROR);
      expect(handler.testClassifyError(new Error("invalid input"))).toBe(SyncErrorCategory.VALIDATION_ERROR);
      expect(handler.testClassifyError(new Error("el campo requiere"))).toBe(SyncErrorCategory.VALIDATION_ERROR);
      expect(handler.testClassifyError(new Error("must be a string"))).toBe(SyncErrorCategory.VALIDATION_ERROR);
    });

    it("classifies not found errors", () => {
      expect(handler.testClassifyError(new Error("not found"))).toBe(SyncErrorCategory.NOT_FOUND);
      expect(handler.testClassifyError(new Error("no encontrado"))).toBe(SyncErrorCategory.NOT_FOUND);
      expect(handler.testClassifyError(new Error("no existe"))).toBe(SyncErrorCategory.NOT_FOUND);
    });

    it("classifies conflict errors", () => {
      expect(handler.testClassifyError(new Error("version conflict"))).toBe(SyncErrorCategory.CONFLICT);
      expect(handler.testClassifyError(new Error("versión modificada"))).toBe(SyncErrorCategory.CONFLICT);
    });

    it("classifies database errors", () => {
      expect(handler.testClassifyError(new Error("database locked"))).toBe(SyncErrorCategory.DATABASE_ERROR);
      expect(handler.testClassifyError(new Error("duplicate key"))).toBe(SyncErrorCategory.DATABASE_ERROR);
      expect(handler.testClassifyError(new Error("unique constraint"))).toBe(SyncErrorCategory.DATABASE_ERROR);
    });

    it("classifies network errors", () => {
      expect(handler.testClassifyError(new Error("connection timeout"))).toBe(SyncErrorCategory.NETWORK_ERROR);
      expect(handler.testClassifyError(new Error("econnrefused"))).toBe(SyncErrorCategory.NETWORK_ERROR);
      expect(handler.testClassifyError(new Error("enotfound"))).toBe(SyncErrorCategory.NETWORK_ERROR);
    });

    it("defaults to UNKNOWN_ERROR for unrecognized errors", () => {
      expect(handler.testClassifyError(new Error("something went wrong"))).toBe(SyncErrorCategory.UNKNOWN_ERROR);
    });
  });

  describe("createSuccessResult", () => {
    it("creates success result with idempotency key", () => {
      const op = makeOp({ idempotencyKey: "key-123" });
      const result = handler.testCreateSuccessResult(op);
      expect(result).toEqual({
        success: true,
        idempotencyKey: "key-123",
        serverTimestamp: expect.any(String),
      });
    });
  });

  describe("createErrorResult", () => {
    it("creates error result with message", () => {
      const op = makeOp({ idempotencyKey: "key-123" });
      const result = handler.testCreateErrorResult(op, "something went wrong");
      expect(result).toEqual({
        success: false,
        idempotencyKey: "key-123",
        error: "something went wrong",
        serverTimestamp: expect.any(String),
      });
    });
  });

  describe("logStart", () => {
    it("logs without throwing when no logger", () => {
      const op = makeOp();
      expect(() => {
        handler.testLogStart({} as never, op);
      }).not.toThrow();
    });
  });

  describe("logSuccess", () => {
    it("logs without throwing when no logger", () => {
      const op = makeOp();
      expect(() => {
        handler.testLogSuccess({} as never, op);
      }).not.toThrow();
    });
  });

  describe("logError", () => {
    it("logs without throwing when no logger", () => {
      const op = makeOp();
      expect(() => {
        handler.testLogError({} as never, op, new Error("test error"));
      }).not.toThrow();
    });
  });

  describe("logValidationError", () => {
    it("logs without throwing when no logger", () => {
      const op = makeOp();
      expect(() => {
        handler.testLogValidationError(
          {} as never,
          op,
          new Error("validation failed"),
          { name: "test" },
          ["name is required"]
        );
      }).not.toThrow();
    });
  });

  describe("SyncErrorCategory", () => {
    it("has all expected categories", () => {
      expect(SyncErrorCategory.VALIDATION_ERROR).toBe("VALIDATION_ERROR");
      expect(SyncErrorCategory.NOT_FOUND).toBe("NOT_FOUND");
      expect(SyncErrorCategory.CONFLICT).toBe("CONFLICT");
      expect(SyncErrorCategory.DATABASE_ERROR).toBe("DATABASE_ERROR");
      expect(SyncErrorCategory.NETWORK_ERROR).toBe("NETWORK_ERROR");
      expect(SyncErrorCategory.UNKNOWN_ERROR).toBe("UNKNOWN_ERROR");
    });
  });
});
