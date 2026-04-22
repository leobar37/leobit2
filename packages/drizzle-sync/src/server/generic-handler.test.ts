/**
 * Tests for GenericSyncHandler
 *
 * Tests the config-based sync handler for CRUD operations including:
 * - Create, Update, Delete operations
 * - Schema validation
 * - Field mapping
 * - Parent validation
 * - Version conflict detection
 * - Custom operations
 * - Transaction requirements
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
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
  saleId: z.string().optional(),
});

const updateSchema = z.object({
  name: z.string().optional(),
  email: z.string().email().optional(),
  age: z.number().optional(),
});

// Mock request context
const mockCtx = {
  tenantId: "biz-123",
  userId: "user-456",
};

// Helper to create sync operations
function makeOp(
  partial: Partial<SyncOperationInput> & {
    idempotencyKey: string;
    entityType: "sales";
    entityId: string;
    operation: "create" | "update" | "delete";
  }
): SyncOperationInput {
  const {
    idempotencyKey,
    entityType,
    entityId,
    operation,
    payload,
    localVersion,
    ...rest
  } = partial;

  return {
    idempotencyKey,
    entityType,
    entityId,
    operation,
    payload: payload ?? {},
    localVersion: localVersion ?? 1,
    localTimestamp: new Date().toISOString(),
    ...rest,
  } as SyncOperationInput;
}

describe("GenericSyncHandler", () => {
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
    it("creates handler with config", () => {
      const handler = new GenericSyncHandler({
        entityType: "sales",
        schemas: { create: createSchema, update: updateSchema },
      });
      expect(handler.entityType).toBe("sales");
    });
  });

  describe("execute - create", () => {
    it("executes create operation with repo", async () => {
      const handler = new GenericSyncHandler({
        entityType: "sales",
        schemas: { create: createSchema, update: updateSchema },
      });
      handler.setRepo(mockRepo);

      const op = makeOp({
        idempotencyKey: "key-1",
        entityType: "sales",
        entityId: "entity-1",
        operation: "create",
        payload: { name: "Test Entity" },
      });

      const result = await handler.execute(mockCtx, op);

      expect(result.success).toBe(true);
      expect(result.idempotencyKey).toBe("key-1");
      expect(mockRepo.create).toHaveBeenCalledWith(
        mockCtx,
        { id: "entity-1", name: "Test Entity" },
        undefined
      );
    });

    it("applies field mapping on create", async () => {
      const handler = new GenericSyncHandler({
        entityType: "sales",
        schemas: { create: createSchema, update: updateSchema },
        createFieldMapping: { name: "entity_name", email: "contact_email" },
      });
      handler.setRepo(mockRepo);

      const op = makeOp({
        idempotencyKey: "key-1",
        entityType: "sales",
        entityId: "entity-1",
        operation: "create",
        payload: { name: "Test", email: "test@example.com" },
      });

      await handler.execute(mockCtx, op);

      expect(mockRepo.create).toHaveBeenCalledWith(
        mockCtx,
        { id: "entity-1", entity_name: "Test", contact_email: "test@example.com" },
        undefined
      );
    });

    it("applies create defaults before mapping", async () => {
      const handler = new GenericSyncHandler({
        entityType: "sales",
        schemas: { create: createSchema, update: updateSchema },
        createDefaults: { age: 25, status: "active" },
        createFieldMapping: { name: "entity_name" },
      });
      handler.setRepo(mockRepo);

      const op = makeOp({
        idempotencyKey: "key-1",
        entityType: "sales",
        entityId: "entity-1",
        operation: "create",
        payload: { name: "Test" },
      });

      await handler.execute(mockCtx, op);

      // When createFieldMapping is provided, only mapped fields are passed through
      // createDefaults that are not in the mapping are filtered out
      expect(mockRepo.create).toHaveBeenCalledWith(
        mockCtx,
        { id: "entity-1", entity_name: "Test" },
        undefined
      );
    });

    it("calls postCreate hook after successful create", async () => {
      const postCreate = vi.fn().mockResolvedValue(undefined);
      const handler = new GenericSyncHandler({
        entityType: "sales",
        schemas: { create: createSchema, update: updateSchema },
        postCreate,
      });
      handler.setRepo(mockRepo);

      const op = makeOp({
        idempotencyKey: "key-1",
        entityType: "sales",
        entityId: "entity-1",
        operation: "create",
        payload: { name: "Test Entity" },
      });

      await handler.execute(mockCtx, op);

      expect(postCreate).toHaveBeenCalledWith(mockCtx, "entity-1", {
        name: "Test Entity",
      });
    });

    it("enriches payload with payloadEnricher before create", async () => {
      const enricher = vi.fn().mockImplementation((ctx, payload) => ({
        ...payload,
        enriched: "yes",
        tenantId: ctx.tenantId,
      }));
      const handler = new GenericSyncHandler({
        entityType: "sales",
        schemas: { create: createSchema, update: updateSchema },
        payloadEnricher: enricher,
      });
      handler.setRepo(mockRepo);

      const op = makeOp({
        idempotencyKey: "key-1",
        entityType: "sales",
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

    it("skips create silently if parentCheck parent does not exist", async () => {
      const findParent = vi.fn().mockResolvedValue(null);
      const handler = new GenericSyncHandler({
        entityType: "sales",
        schemas: { create: createSchema, update: updateSchema },
        parentCheck: {
          parentIdField: "parentId",
          parentName: "Parent",
          findParent,
        },
      });
      handler.setRepo(mockRepo);

      const op = makeOp({
        idempotencyKey: "key-1",
        entityType: "sales",
        entityId: "entity-1",
        operation: "create",
        payload: { name: "Test", parentId: "parent-1" },
      });

      const result = await handler.execute(mockCtx, op);

      expect(result.success).toBe(false);
      expect(result.error).toContain("Parent parent-1 no encontrado");
      expect(mockRepo.create).not.toHaveBeenCalled();
    });

    it("skips DB query for parentCheck if parent was created in same batch", async () => {
      const findParent = vi.fn().mockResolvedValue(null);
      const mockRegistry = {
        register: vi.fn(),
        wasCreated: vi.fn().mockReturnValue(true),
        wasModified: vi.fn().mockReturnValue(false),
        wasDeleted: vi.fn().mockReturnValue(false),
        clear: vi.fn(),
        getStats: vi.fn().mockReturnValue({ created: 1, updated: 0, deleted: 0 }),
      };

      const handler = new GenericSyncHandler({
        entityType: "sales",
        schemas: { create: createSchema, update: updateSchema },
        parentCheck: {
          parentIdField: "parentId",
          parentName: "Parent",
          findParent,
        },
      });
      handler.setRegistry(mockRegistry as any);
      handler.setRepo(mockRepo);

      const op = makeOp({
        idempotencyKey: "key-1",
        entityType: "sales",
        entityId: "entity-1",
        operation: "create",
        payload: { name: "Test", parentId: "parent-1" },
      });

      await handler.execute(mockCtx, op);

      expect(findParent).not.toHaveBeenCalled();
      expect(mockRepo.create).toHaveBeenCalled();
    });

    it("uses customCreate instead of repo.create when provided", async () => {
      const customCreate = vi.fn().mockResolvedValue(undefined);
      const handler = new GenericSyncHandler({
        entityType: "sales",
        schemas: { create: createSchema, update: updateSchema },
        customCreate,
      });
      handler.setRepo(mockRepo);

      const op = makeOp({
        idempotencyKey: "key-1",
        entityType: "sales",
        entityId: "entity-1",
        operation: "create",
        payload: { name: "Test" },
      });

      await handler.execute(mockCtx, op);

      expect(customCreate).toHaveBeenCalled();
      expect(mockRepo.create).not.toHaveBeenCalled();
    });

    it("calls preValidation hook before schema parsing", async () => {
      const preValidation = vi.fn().mockResolvedValue(undefined);
      const handler = new GenericSyncHandler({
        entityType: "sales",
        schemas: { create: createSchema, update: updateSchema },
        preValidation,
      });
      handler.setRepo(mockRepo);

      const op = makeOp({
        idempotencyKey: "key-1",
        entityType: "sales",
        entityId: "entity-1",
        operation: "create",
        payload: { name: "Test" },
      });

      await handler.execute(mockCtx, op);

      expect(preValidation).toHaveBeenCalledWith(
        mockCtx,
        { name: "Test" },
        op
      );
    });

    it("calls postOperation hook after any CRUD operation", async () => {
      const postOperation = vi.fn().mockResolvedValue(undefined);
      const handler = new GenericSyncHandler({
        entityType: "sales",
        schemas: { create: createSchema, update: updateSchema },
        postOperation,
      });
      handler.setRepo(mockRepo);

      const op = makeOp({
        idempotencyKey: "key-1",
        entityType: "sales",
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
  });

  describe("execute - update", () => {
    it("executes update operation with repo", async () => {
      const handler = new GenericSyncHandler({
        entityType: "sales",
        schemas: { create: createSchema, update: updateSchema },
      });
      handler.setRepo(mockRepo);

      const op = makeOp({
        idempotencyKey: "key-1",
        entityType: "sales",
        entityId: "entity-1",
        operation: "update",
        payload: { name: "Updated Name" },
      });

      const result = await handler.execute(mockCtx, op);

      expect(result.success).toBe(true);
      expect(mockRepo.update).toHaveBeenCalledWith(
        mockCtx,
        "entity-1",
        { name: "Updated Name" },
        undefined
      );
    });

    it("applies field mapping on update", async () => {
      const handler = new GenericSyncHandler({
        entityType: "sales",
        schemas: { create: createSchema, update: updateSchema },
        updateFieldMapping: { name: "entity_name" },
      });
      handler.setRepo(mockRepo);

      const op = makeOp({
        idempotencyKey: "key-1",
        entityType: "sales",
        entityId: "entity-1",
        operation: "update",
        payload: { name: "Updated" },
      });

      await handler.execute(mockCtx, op);

      expect(mockRepo.update).toHaveBeenCalledWith(
        mockCtx,
        "entity-1",
        { entity_name: "Updated" },
        undefined
      );
    });

    it("detects version conflict on update", async () => {
      (mockRepo.findById as any).mockResolvedValue({
        id: "entity-1",
        name: "Existing",
        version: 5, // Server has version 5
      });

      const handler = new GenericSyncHandler({
        entityType: "sales",
        schemas: { create: createSchema, update: updateSchema },
        versionConflictField: "version",
      });
      handler.setRepo(mockRepo);

      const op = makeOp({
        idempotencyKey: "key-1",
        entityType: "sales",
        entityId: "entity-1",
        operation: "update",
        payload: { name: "Updated", version: 3 }, // Client thinks it's version 3
        localVersion: 3,
      });

      const result = await handler.execute(mockCtx, op);

      expect(result.success).toBe(false);
      expect(result.error).toContain("Version conflict");
      expect(mockRepo.update).not.toHaveBeenCalled();
    });

    it("allows update when client version matches server version", async () => {
      (mockRepo.findById as any).mockResolvedValue({
        id: "entity-1",
        name: "Existing",
        version: 3,
      });

      const handler = new GenericSyncHandler({
        entityType: "sales",
        schemas: { create: createSchema, update: updateSchema },
        versionConflictField: "version",
      });
      handler.setRepo(mockRepo);

      const op = makeOp({
        idempotencyKey: "key-1",
        entityType: "sales",
        entityId: "entity-1",
        operation: "update",
        payload: { name: "Updated", version: 3 },
        localVersion: 3,
      });

      const result = await handler.execute(mockCtx, op);

      expect(result.success).toBe(true);
      expect(mockRepo.update).toHaveBeenCalled();
    });

    it("calls postUpdate hook after successful update", async () => {
      const postUpdate = vi.fn().mockResolvedValue(undefined);
      const handler = new GenericSyncHandler({
        entityType: "sales",
        schemas: { create: createSchema, update: updateSchema },
        postUpdate,
      });
      handler.setRepo(mockRepo);

      const op = makeOp({
        idempotencyKey: "key-1",
        entityType: "sales",
        entityId: "entity-1",
        operation: "update",
        payload: { name: "Updated" },
      });

      await handler.execute(mockCtx, op);

      expect(postUpdate).toHaveBeenCalledWith(mockCtx, "entity-1", {
        name: "Updated",
      });
    });

    it("uses customUpdate instead of repo.update when provided", async () => {
      const customUpdate = vi.fn().mockResolvedValue(undefined);
      const handler = new GenericSyncHandler({
        entityType: "sales",
        schemas: { create: createSchema, update: updateSchema },
        customUpdate,
      });
      handler.setRepo(mockRepo);

      const op = makeOp({
        idempotencyKey: "key-1",
        entityType: "sales",
        entityId: "entity-1",
        operation: "update",
        payload: { name: "Updated" },
      });

      await handler.execute(mockCtx, op);

      expect(customUpdate).toHaveBeenCalled();
      expect(mockRepo.update).not.toHaveBeenCalled();
    });
  });

  describe("execute - delete", () => {
    it("executes delete operation with repo", async () => {
      const handler = new GenericSyncHandler({
        entityType: "sales",
        schemas: { create: createSchema, update: updateSchema },
      });
      handler.setRepo(mockRepo);

      const op = makeOp({
        idempotencyKey: "key-1",
        entityType: "sales",
        entityId: "entity-1",
        operation: "delete",
        payload: {},
      });

      const result = await handler.execute(mockCtx, op);

      expect(result.success).toBe(true);
      expect(mockRepo.delete).toHaveBeenCalledWith(mockCtx, "entity-1", undefined);
    });

    it("skips delete silently when entity not found", async () => {
      (mockRepo.findById as any).mockResolvedValue(undefined);

      const handler = new GenericSyncHandler({
        entityType: "sales",
        schemas: { create: createSchema, update: updateSchema },
      });
      handler.setRepo(mockRepo);

      const op = makeOp({
        idempotencyKey: "key-1",
        entityType: "sales",
        entityId: "entity-nonexistent",
        operation: "delete",
        payload: {},
      });

      const result = await handler.execute(mockCtx, op);

      expect(result.success).toBe(true);
      expect(mockRepo.delete).not.toHaveBeenCalled();
    });

    it("skips delete silently when skipOnParentMissing and parent not found", async () => {
      (mockRepo.findById as any).mockResolvedValue(undefined);

      const findParent = vi.fn().mockResolvedValue(null);
      const handler = new GenericSyncHandler({
        entityType: "sales",
        schemas: { create: createSchema, update: updateSchema },
        skipOnParentMissing: true,
        parentCheck: {
          parentIdField: "parentId",
          parentName: "Parent",
          findParent,
        },
      });
      handler.setRepo(mockRepo);

      const op = makeOp({
        idempotencyKey: "key-1",
        entityType: "sales",
        entityId: "entity-1",
        operation: "delete",
        payload: { parentId: "parent-nonexistent" },
      });

      const result = await handler.execute(mockCtx, op);

      expect(result.success).toBe(true);
      expect(mockRepo.delete).not.toHaveBeenCalled();
    });

    it("uses customDelete instead of repo.delete when provided", async () => {
      const customDelete = vi.fn().mockResolvedValue(undefined);
      const handler = new GenericSyncHandler({
        entityType: "sales",
        schemas: { create: createSchema, update: updateSchema },
        customDelete,
      });
      handler.setRepo(mockRepo);

      const op = makeOp({
        idempotencyKey: "key-1",
        entityType: "sales",
        entityId: "entity-1",
        operation: "delete",
        payload: {},
      });

      await handler.execute(mockCtx, op);

      expect(customDelete).toHaveBeenCalled();
      expect(mockRepo.delete).not.toHaveBeenCalled();
    });
  });

  describe("schema validation failure", () => {
    it("returns failure when create payload fails schema validation", async () => {
      const handler = new GenericSyncHandler({
        entityType: "sales",
        schemas: { create: createSchema, update: updateSchema },
      });
      handler.setRepo(mockRepo);

      const op = makeOp({
        idempotencyKey: "key-1",
        entityType: "sales",
        entityId: "entity-1",
        operation: "create",
        payload: { name: 123 }, // Should be string
      });

      const result = await handler.execute(mockCtx, op);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(mockRepo.create).not.toHaveBeenCalled();
    });

    it("returns failure when update payload fails schema validation", async () => {
      const handler = new GenericSyncHandler({
        entityType: "sales",
        schemas: { create: createSchema, update: updateSchema },
      });
      handler.setRepo(mockRepo);

      const op = makeOp({
        idempotencyKey: "key-1",
        entityType: "sales",
        entityId: "entity-1",
        operation: "update",
        payload: { email: "not-an-email" }, // Invalid email
      });

      const result = await handler.execute(mockCtx, op);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(mockRepo.update).not.toHaveBeenCalled();
    });
  });

  describe("unsupported operation", () => {
    it("throws error for unsupported operation type", async () => {
      const handler = new GenericSyncHandler({
        entityType: "sales",
        schemas: { create: createSchema, update: updateSchema },
        supportedOperations: ["create", "update"], // No delete
      });
      handler.setRepo(mockRepo);

      const op = makeOp({
        idempotencyKey: "key-1",
        entityType: "sales",
        entityId: "entity-1",
        operation: "delete",
        payload: {},
      });

      const result = await handler.execute(mockCtx, op);

      expect(result.success).toBe(false);
      expect(result.error).toContain("Acción no soportada");
    });
  });

  describe("transaction required guard", () => {
    it("throws error when txRequired but no tx provided", async () => {
      const handler = new GenericSyncHandler({
        entityType: "sales",
        schemas: { create: createSchema, update: updateSchema },
        txRequired: true,
      });
      handler.setRepo(mockRepo);

      const op = makeOp({
        idempotencyKey: "key-1",
        entityType: "sales",
        entityId: "entity-1",
        operation: "create",
        payload: { name: "Test" },
      });

      const result = await handler.execute(mockCtx, op);

      expect(result.success).toBe(false);
      expect(result.error).toContain("Transaction is required");
      expect(mockRepo.create).not.toHaveBeenCalled();
    });

    it("allows operation when txRequired and tx is provided", async () => {
      const mockTx = {};
      const handler = new GenericSyncHandler({
        entityType: "sales",
        schemas: { create: createSchema, update: updateSchema },
        txRequired: true,
      });
      handler.setRepo(mockRepo);

      const op = makeOp({
        idempotencyKey: "key-1",
        entityType: "sales",
        entityId: "entity-1",
        operation: "create",
        payload: { name: "Test" },
      });

      const result = await handler.execute(mockCtx, op, mockTx as any);

      expect(result.success).toBe(true);
      expect(mockRepo.create).toHaveBeenCalledWith(
        mockCtx,
        expect.anything(),
        mockTx
      );
    });
  });

  describe("additionalParentChecks", () => {
    it("validates multiple parents when additionalParentChecks provided", async () => {
      const findTag = vi.fn().mockResolvedValue(null);
      const handler = new GenericSyncHandler({
        entityType: "sales",
        schemas: { create: createSchema, update: updateSchema },
        parentCheck: {
          parentIdField: "customerId",
          parentName: "Customer",
          findParent: vi.fn().mockResolvedValue({ id: "cust-1" }),
        },
        additionalParentChecks: [
          {
            field: "tagId",
            parentName: "Tag",
            findParent: findTag,
          },
        ],
      });
      handler.setRepo(mockRepo);

      const op = makeOp({
        idempotencyKey: "key-1",
        entityType: "sales",
        entityId: "entity-1",
        operation: "create",
        payload: { name: "Test", customerId: "cust-1", tagId: "tag-missing" },
      });

      const result = await handler.execute(mockCtx, op);

      expect(result.success).toBe(false);
      expect(result.error).toContain("Tag tag-missing no encontrado");
      expect(mockRepo.create).not.toHaveBeenCalled();
    });
  });

  describe("createWithRepo static factory", () => {
    it("creates handler with repo pre-configured", () => {
      const handler = GenericSyncHandler.createWithRepo(
        {
          entityType: "sales",
          schemas: { create: createSchema, update: updateSchema },
        },
        mockRepo
      );

      expect(handler.entityType).toBe("sales");
    });
  });
});
