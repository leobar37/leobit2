import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  BaseVersionConflictResolver,
  NoOpConflictResolver,
  GenericConflictResolverRegistry,
} from "./conflict-resolver";
import type { SyncOperationInput } from "./types";

describe("conflict-resolver", () => {
  describe("NoOpConflictResolver", () => {
    it("always returns no conflict", async () => {
      const resolver = new NoOpConflictResolver();
      const op = {
        idempotencyKey: "key-1",
        entityType: "sales" as const,
        entityId: "entity-1",
        operation: "update" as const,
        payload: {},
        localVersion: 1,
        localTimestamp: new Date().toISOString(),
      };

      const result = await resolver.checkConflict({}, op, {});
      expect(result).toEqual({ hasConflict: false });
    });

    it("works without context", async () => {
      const resolver = new NoOpConflictResolver();
      const op = {
        idempotencyKey: "key-1",
        entityType: "sales" as const,
        entityId: "entity-1",
        operation: "create" as const,
        payload: {},
        localVersion: 1,
        localTimestamp: new Date().toISOString(),
      };

      const result = await resolver.checkConflict(undefined, op, undefined);
      expect(result).toEqual({ hasConflict: false });
    });
  });

  describe("GenericConflictResolverRegistry", () => {
    it("returns default NoOpConflictResolver for unregistered entity", () => {
      const registry = new GenericConflictResolverRegistry();
      const resolver = registry.getResolver("sales");
      expect(resolver).toBeInstanceOf(NoOpConflictResolver);
    });

    it("register and getResolver work", () => {
      const registry = new GenericConflictResolverRegistry();
      const customResolver = new NoOpConflictResolver();
      registry.register("sales", customResolver);
      const retrieved = registry.getResolver("sales");
      expect(retrieved).toBe(customResolver);
    });

    it("overwrites existing resolver for same entity", () => {
      const registry = new GenericConflictResolverRegistry();
      const resolver1 = new NoOpConflictResolver();
      const resolver2 = new NoOpConflictResolver();
      registry.register("sales", resolver1);
      registry.register("sales", resolver2);
      expect(registry.getResolver("sales")).toBe(resolver2);
    });

    it("hasResolver returns correct status", () => {
      const registry = new GenericConflictResolverRegistry();
      expect(registry.hasResolver("sales")).toBe(false);
      registry.register("sales", new NoOpConflictResolver());
      expect(registry.hasResolver("sales")).toBe(true);
    });
  });

  describe("BaseVersionConflictResolver", () => {
    // Concrete implementation for testing
    class TestResolver extends BaseVersionConflictResolver<{ businessId: string }, unknown, Record<string, unknown>> {
      protected getEntityName(): string {
        return "TestEntity";
      }

      protected getTable(): Record<string, unknown> {
        return {} as Record<string, unknown>;
      }

      protected getIdField(): string {
        return "id";
      }

      protected getBusinessIdField(): string {
        return "businessId";
      }

      protected getVersionField(): string {
        return "version";
      }

      protected getServerDataFields(record: unknown): Record<string, unknown> {
        return record as Record<string, unknown>;
      }

      protected getBusinessIdFromContext(ctx: { businessId: string }): string {
        return ctx.businessId;
      }

      protected executeQuery(): Promise<unknown | undefined> {
        return Promise.resolve(undefined);
      }
    }

    let resolver: TestResolver;

    beforeEach(() => {
      resolver = new TestResolver();
    });

    const makeOp = (
      operation: "create" | "update" | "delete",
      localVersion = 1
    ): SyncOperationInput =>
      ({
        idempotencyKey: "key-1",
        entityType: "sales",
        entityId: "entity-1",
        operation,
        payload: {},
        localVersion,
        localTimestamp: new Date().toISOString(),
      }) as unknown as SyncOperationInput;

    it("returns no conflict for create operations", async () => {
      const result = await resolver.checkConflict({ businessId: "biz-1" }, makeOp("create"), {});
      expect(result).toEqual({ hasConflict: false });
    });

    it("returns no conflict for delete operations", async () => {
      const result = await resolver.checkConflict({ businessId: "biz-1" }, makeOp("delete"), {});
      expect(result).toEqual({ hasConflict: false });
    });

    it("returns no conflict when no record exists", async () => {
      const result = await resolver.checkConflict({ businessId: "biz-1" }, makeOp("update"), {});
      expect(result).toEqual({ hasConflict: false });
    });
  });
});
