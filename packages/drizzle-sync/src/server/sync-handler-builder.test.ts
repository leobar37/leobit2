/**
 * Tests for SyncHandlerBuilder
 *
 * Tests the fluent builder API for creating GenericSyncHandler instances.
 * Validates:
 * - Fluent API returns this for chaining
 * - All configuration methods work
 * - build() produces valid handler
 * - Handler with custom operations works
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { SyncHandlerBuilder } from "./sync-handler-builder";
import { GenericSyncHandler, type GenericRepo } from "./generic-handler";
import type { SyncOperationInput } from "./types";
import { z } from "zod";

// Test schemas
const createSchema = z.object({
  name: z.string().optional(), // Optional to allow delete operations
  email: z.string().email().optional(),
  age: z.number().optional(),
  parentId: z.string().optional(),
  tagId: z.string().optional(),
});

const updateSchema = z.object({
  name: z.string().optional(),
  email: z.string().email().optional(),
  age: z.number().optional(),
});

// Mock request context
const mockCtx = {
  businessId: "biz-123",
  businessUserId: "user-456",
};

// Helper to create sync operations
function makeOp(
  partial: Partial<SyncOperationInput> & {
    idempotencyKey: string;
    entityType: "test_entity";
    entityId: string;
    operation: "create" | "update" | "delete";
  }
): SyncOperationInput {
  return {
    idempotencyKey: partial.idempotencyKey,
    entityType: partial.entityType,
    entityId: partial.entityId,
    operation: partial.operation,
    payload: partial.payload ?? {},
    localVersion: partial.localVersion ?? 1,
    localTimestamp: new Date().toISOString(),
    ...partial,
  } as SyncOperationInput;
}

describe("SyncHandlerBuilder", () => {
  let mockRepo: GenericRepo;

  beforeEach(() => {
    mockRepo = {
      create: vi.fn().mockResolvedValue(undefined),
      findById: vi.fn().mockResolvedValue({ id: "entity-1", name: "existing" }),
      update: vi.fn().mockResolvedValue(true),
      delete: vi.fn().mockResolvedValue(undefined),
    };
  });

  describe("constructor", () => {
    it("creates builder with entity type", () => {
      const builder = new SyncHandlerBuilder("test_entity");
      expect(builder).toBeDefined();
    });
  });

  describe("fluent API - all methods return this", () => {
    it("withSchemas returns this", () => {
      const builder = new SyncHandlerBuilder("test_entity");
      const result = builder.withSchemas(createSchema, updateSchema);
      expect(result).toBe(builder);
    });

    it("withSupportedOperations returns this", () => {
      const builder = new SyncHandlerBuilder("test_entity");
      const result = builder.withSupportedOperations(["create", "update"]);
      expect(result).toBe(builder);
    });

    it("withCreateFields returns this", () => {
      const builder = new SyncHandlerBuilder("test_entity");
      const result = builder.withCreateFields({ name: "entity_name" });
      expect(result).toBe(builder);
    });

    it("withUpdateFields returns this", () => {
      const builder = new SyncHandlerBuilder("test_entity");
      const result = builder.withUpdateFields({ name: "entity_name" });
      expect(result).toBe(builder);
    });

    it("withPostCreate returns this", () => {
      const builder = new SyncHandlerBuilder("test_entity");
      const result = builder.withPostCreate(async () => {});
      expect(result).toBe(builder);
    });

    it("withPostUpdate returns this", () => {
      const builder = new SyncHandlerBuilder("test_entity");
      const result = builder.withPostUpdate(async () => {});
      expect(result).toBe(builder);
    });

    it("withParentCheck returns this", () => {
      const builder = new SyncHandlerBuilder("test_entity");
      const result = builder.withParentCheck({
        parentIdField: "parentId",
        parentName: "Parent",
        findParent: async () => null,
      });
      expect(result).toBe(builder);
    });

    it("withTxRequired returns this", () => {
      const builder = new SyncHandlerBuilder("test_entity");
      const result = builder.withTxRequired(true);
      expect(result).toBe(builder);
    });

    it("withRepo returns this", () => {
      const builder = new SyncHandlerBuilder("test_entity");
      const result = builder.withRepo(mockRepo);
      expect(result).toBe(builder);
    });

    it("withCustomCreate returns this", () => {
      const builder = new SyncHandlerBuilder("test_entity");
      const result = builder.withCustomCreate(async () => {});
      expect(result).toBe(builder);
    });

    it("withCustomUpdate returns this", () => {
      const builder = new SyncHandlerBuilder("test_entity");
      const result = builder.withCustomUpdate(async () => {});
      expect(result).toBe(builder);
    });

    it("withCustomDelete returns this", () => {
      const builder = new SyncHandlerBuilder("test_entity");
      const result = builder.withCustomDelete(async () => {});
      expect(result).toBe(builder);
    });

    it("withPreValidation returns this", () => {
      const builder = new SyncHandlerBuilder("test_entity");
      const result = builder.withPreValidation(async () => {});
      expect(result).toBe(builder);
    });

    it("withPayloadEnricher returns this", () => {
      const builder = new SyncHandlerBuilder("test_entity");
      const result = builder.withPayloadEnricher(() => ({}));
      expect(result).toBe(builder);
    });

    it("withPostOperation returns this", () => {
      const builder = new SyncHandlerBuilder("test_entity");
      const result = builder.withPostOperation(async () => {});
      expect(result).toBe(builder);
    });

    it("withAdditionalParentChecks returns this", () => {
      const builder = new SyncHandlerBuilder("test_entity");
      const result = builder.withAdditionalParentChecks([]);
      expect(result).toBe(builder);
    });

    it("withSkipOnParentMissing returns this", () => {
      const builder = new SyncHandlerBuilder("test_entity");
      const result = builder.withSkipOnParentMissing();
      expect(result).toBe(builder);
    });

    it("withVersionConflictField returns this", () => {
      const builder = new SyncHandlerBuilder("test_entity");
      const result = builder.withVersionConflictField("version");
      expect(result).toBe(builder);
    });

    it("withCreateDefaults returns this", () => {
      const builder = new SyncHandlerBuilder("test_entity");
      const result = builder.withCreateDefaults({ status: "active" });
      expect(result).toBe(builder);
    });

    it("build returns GenericSyncHandler instance", () => {
      const builder = new SyncHandlerBuilder("test_entity");
      const result = builder.build();
      expect(result).toBeInstanceOf(GenericSyncHandler);
    });
  });

  describe("chaining multiple methods", () => {
    it("chains 5+ methods and returns same instance", () => {
      const builder = new SyncHandlerBuilder("test_entity");

      const r1 = builder.withSchemas(createSchema, updateSchema);
      const r2 = builder.withCreateFields({ name: "entity_name" });
      const r3 = builder.withUpdateFields({ name: "entity_name" });
      const r4 = builder.withCreateDefaults({ status: "active" });
      const r5 = builder.withSupportedOperations(["create", "update", "delete"]);

      expect(r1).toBe(builder);
      expect(r2).toBe(builder);
      expect(r3).toBe(builder);
      expect(r4).toBe(builder);
      expect(r5).toBe(builder);
    });

    it("full chain produces working handler", async () => {
      const postCreate = vi.fn().mockResolvedValue(undefined);

      const handler = new SyncHandlerBuilder("test_entity")
        .withSchemas(createSchema, updateSchema)
        .withCreateFields({ name: "entity_name", email: "contact_email" })
        .withUpdateFields({ name: "entity_name" })
        .withCreateDefaults({ status: "active" })
        .withSupportedOperations(["create", "update", "delete"])
        .withPostCreate(postCreate)
        .withRepo(mockRepo)
        .build();

      const op = makeOp({
        idempotencyKey: "key-1",
        entityType: "test_entity",
        entityId: "entity-1",
        operation: "create",
        payload: { name: "Test Entity", email: "test@example.com" },
      });

      const result = await handler.execute(mockCtx, op);

      expect(result.success).toBe(true);
      expect(postCreate).toHaveBeenCalled();
      // Note: createDefaults are applied before field mapping, but only mapped fields
      // are passed through to repo.create when createFieldMapping is provided
      expect(mockRepo.create).toHaveBeenCalledWith(
        mockCtx,
        expect.objectContaining({
          entity_name: "Test Entity",
          contact_email: "test@example.com",
        }),
        undefined
      );
    });
  });

  describe("build() produces valid handler", () => {
    it("build() returns GenericSyncHandler instance", () => {
      const builder = new SyncHandlerBuilder("test_entity");
      const handler = builder.build();
      expect(handler).toBeInstanceOf(GenericSyncHandler);
    });

    it("handler has correct entityType", () => {
      const builder = new SyncHandlerBuilder("customers");
      const handler = builder.build();
      expect(handler.entityType).toBe("customers");
    });

    it("handler with repo has repo attached", () => {
      const builder = new SyncHandlerBuilder("test_entity");
      const handler = builder.withRepo(mockRepo).build();

      const op = makeOp({
        idempotencyKey: "key-1",
        entityType: "test_entity",
        entityId: "entity-1",
        operation: "create",
        payload: { name: "Test" },
      });

      handler.execute(mockCtx, op);

      expect(mockRepo.create).toHaveBeenCalled();
    });
  });

  describe("build() with custom operations", () => {
    it("builds handler with customCreate only (no repo)", async () => {
      const customCreate = vi.fn().mockResolvedValue(undefined);

      const handler = new SyncHandlerBuilder("test_entity")
        .withSchemas(createSchema, updateSchema)
        .withCustomCreate(customCreate)
        .build();

      const op = makeOp({
        idempotencyKey: "key-1",
        entityType: "test_entity",
        entityId: "entity-1",
        operation: "create",
        payload: { name: "Test" },
      });

      const result = await handler.execute(mockCtx, op);

      expect(result.success).toBe(true);
      expect(customCreate).toHaveBeenCalledWith(
        mockCtx,
        "entity-1",
        expect.objectContaining({ name: "Test" }),
        undefined
      );
    });

    it("builds handler with multiple custom operations", async () => {
      const customCreate = vi.fn().mockResolvedValue(undefined);
      const customUpdate = vi.fn().mockResolvedValue(undefined);
      const customDelete = vi.fn().mockResolvedValue(undefined);

      const handler = new SyncHandlerBuilder("test_entity")
        .withSchemas(createSchema, updateSchema)
        .withSupportedOperations(["create", "update", "delete"])
        .withCustomCreate(customCreate)
        .withCustomUpdate(customUpdate)
        .withCustomDelete(customDelete)
        .build();

      // Test create
      const createOp = makeOp({
        idempotencyKey: "key-1",
        entityType: "test_entity",
        entityId: "entity-1",
        operation: "create",
        payload: { name: "Test" },
      });
      await handler.execute(mockCtx, createOp);
      expect(customCreate).toHaveBeenCalled();

      // Test update
      const updateOp = makeOp({
        idempotencyKey: "key-2",
        entityType: "test_entity",
        entityId: "entity-1",
        operation: "update",
        payload: { name: "Updated" },
      });
      await handler.execute(mockCtx, updateOp);
      expect(customUpdate).toHaveBeenCalled();

      // Test delete
      const deleteOp = makeOp({
        idempotencyKey: "key-3",
        entityType: "test_entity",
        entityId: "entity-1",
        operation: "delete",
        payload: {},
      });
      await handler.execute(mockCtx, deleteOp);
      expect(customDelete).toHaveBeenCalled();
    });

    it("builds handler with postOperation hook", async () => {
      const postOperation = vi.fn().mockResolvedValue(undefined);

      const handler = new SyncHandlerBuilder("test_entity")
        .withSchemas(createSchema, updateSchema)
        .withPostOperation(postOperation)
        .withRepo(mockRepo)
        .build();

      const op = makeOp({
        idempotencyKey: "key-1",
        entityType: "test_entity",
        entityId: "entity-1",
        operation: "create",
        payload: { name: "Test" },
      });

      await handler.execute(mockCtx, op);

      expect(postOperation).toHaveBeenCalledWith(
        mockCtx,
        { name: "Test" },
        op,
        undefined
      );
    });

    it("builds handler with payloadEnricher", async () => {
      const enricher = vi.fn().mockImplementation((ctx, payload) => ({
        ...payload,
        businessId: ctx.businessId,
      }));

      const handler = new SyncHandlerBuilder("test_entity")
        .withSchemas(createSchema, updateSchema)
        .withPayloadEnricher(enricher)
        .withRepo(mockRepo)
        .build();

      const op = makeOp({
        idempotencyKey: "key-1",
        entityType: "test_entity",
        entityId: "entity-1",
        operation: "create",
        payload: { name: "Test" },
      });

      await handler.execute(mockCtx, op);

      // Enricher is called with ctx and payload
      expect(enricher).toHaveBeenCalledWith(mockCtx, { name: "Test" }, op);
      // Repo create receives the id (enriched fields may be stripped by schema validation
      // if they are not defined in the schema - this is expected behavior)
      expect(mockRepo.create).toHaveBeenCalledWith(
        mockCtx,
        expect.objectContaining({ id: "entity-1" }),
        undefined
      );
    });

    it("builds handler with parentCheck", async () => {
      const findParent = vi.fn().mockResolvedValue({ id: "parent-1" });

      const handler = new SyncHandlerBuilder("test_entity")
        .withSchemas(createSchema, updateSchema)
        .withParentCheck({
          parentIdField: "parentId",
          parentName: "Parent",
          findParent,
        })
        .withRepo(mockRepo)
        .build();

      const op = makeOp({
        idempotencyKey: "key-1",
        entityType: "test_entity",
        entityId: "entity-1",
        operation: "create",
        payload: { name: "Test", parentId: "parent-1" },
      });

      const result = await handler.execute(mockCtx, op);

      expect(result.success).toBe(true);
      expect(findParent).toHaveBeenCalledWith(mockCtx, "parent-1");
    });

    it("builds handler with txRequired", async () => {
      const handler = new SyncHandlerBuilder("test_entity")
        .withSchemas(createSchema, updateSchema)
        .withTxRequired(true)
        .withRepo(mockRepo)
        .build();

      const op = makeOp({
        idempotencyKey: "key-1",
        entityType: "test_entity",
        entityId: "entity-1",
        operation: "create",
        payload: { name: "Test" },
      });

      // Without tx, should fail
      const result = await handler.execute(mockCtx, op);
      expect(result.success).toBe(false);
      expect(result.error).toContain("Transaction is required");

      // With tx, should succeed
      const resultWithTx = await handler.execute(mockCtx, op, {} as any);
      expect(resultWithTx.success).toBe(true);
    });

    it("builds handler with versionConflictField", async () => {
      (mockRepo.findById as any).mockResolvedValue({
        id: "entity-1",
        version: 5,
      });

      const handler = new SyncHandlerBuilder("test_entity")
        .withSchemas(createSchema, updateSchema)
        .withVersionConflictField("version")
        .withRepo(mockRepo)
        .build();

      const op = makeOp({
        idempotencyKey: "key-1",
        entityType: "test_entity",
        entityId: "entity-1",
        operation: "update",
        payload: { name: "Updated", version: 3 },
        localVersion: 3,
      });

      const result = await handler.execute(mockCtx, op);

      expect(result.success).toBe(false);
      expect(result.error).toContain("Version conflict");
    });

    it("builds handler with skipOnParentMissing", async () => {
      (mockRepo.findById as any).mockResolvedValue(undefined);
      const findParent = vi.fn().mockResolvedValue(null);

      const handler = new SyncHandlerBuilder("test_entity")
        .withSchemas(createSchema, updateSchema)
        .withSkipOnParentMissing()
        .withParentCheck({
          parentIdField: "parentId",
          parentName: "Parent",
          findParent,
        })
        .withRepo(mockRepo)
        .build();

      const op = makeOp({
        idempotencyKey: "key-1",
        entityType: "test_entity",
        entityId: "entity-1",
        operation: "delete",
        payload: { parentId: "parent-nonexistent" },
      });

      const result = await handler.execute(mockCtx, op);

      // Should succeed silently (skip delete because parent doesn't exist)
      expect(result.success).toBe(true);
      // findParent should have been called to check if parent exists
      expect(findParent).toHaveBeenCalled();
      // repo.delete should NOT have been called since delete was skipped
      expect(mockRepo.delete).not.toHaveBeenCalled();
    });
  });
});
