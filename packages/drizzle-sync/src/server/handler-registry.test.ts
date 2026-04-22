import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { HandlerRegistry } from "./handler-registry";
import type { ISyncHandler, SyncEngineDeps, SyncEntity } from "./types";

describe("handler-registry", () => {
  afterEach(() => {
    HandlerRegistry.clear();
  });

  describe("register", () => {
    it("registers a handler factory for an entity type", () => {
      const factory = vi.fn();
      HandlerRegistry.register("sales", factory);
      expect(HandlerRegistry.hasHandler("sales")).toBe(true);
    });
  });

  describe("getHandler", () => {
    it("returns handler from factory", () => {
      const mockHandler = {
        entityType: "sales",
        validateBusinessRules: vi.fn(),
        execute: vi.fn(),
      } as unknown as ISyncHandler<unknown, unknown>;

      const factory = vi.fn().mockReturnValue(mockHandler);
      HandlerRegistry.register("sales", factory);

      const deps = {} as SyncEngineDeps;
      const handler = HandlerRegistry.getHandler("sales", deps);

      expect(factory).toHaveBeenCalledWith(deps);
      expect(handler).toBe(mockHandler);
    });

    it("throws when no handler registered for entity", () => {
      expect(() => {
        HandlerRegistry.getHandler("unregistered" as SyncEntity, {});
      }).toThrow("No handler registered for entity: unregistered");
    });
  });

  describe("hasHandler", () => {
    it("returns true for registered entity", () => {
      HandlerRegistry.register("sales", vi.fn());
      expect(HandlerRegistry.hasHandler("sales")).toBe(true);
    });

    it("returns false for unregistered entity", () => {
      expect(HandlerRegistry.hasHandler("unregistered" as SyncEntity)).toBe(false);
    });
  });

  describe("getRegisteredEntities", () => {
    it("returns empty array when no handlers registered", () => {
      expect(HandlerRegistry.getRegisteredEntities()).toEqual([]);
    });

    it("returns all registered entity types", () => {
      HandlerRegistry.register("sales", vi.fn());
      HandlerRegistry.register("customers", vi.fn());
      HandlerRegistry.register("products", vi.fn());

      const entities = HandlerRegistry.getRegisteredEntities();
      expect(entities).toContain("sales");
      expect(entities).toContain("customers");
      expect(entities).toContain("products");
    });
  });

  describe("clear", () => {
    it("removes all registered handlers", () => {
      HandlerRegistry.register("sales", vi.fn());
      HandlerRegistry.register("customers", vi.fn());
      HandlerRegistry.clear();

      expect(HandlerRegistry.getRegisteredEntities()).toEqual([]);
    });
  });

  describe("multiple registrations", () => {
    it("overwrites existing handler for same entity", () => {
      const factory1 = vi.fn();
      const factory2 = vi.fn();

      HandlerRegistry.register("sales", factory1);
      HandlerRegistry.register("sales", factory2);

      const deps = {} as SyncEngineDeps;
      HandlerRegistry.getHandler("sales", deps);

      expect(factory2).toHaveBeenCalled();
      expect(factory1).not.toHaveBeenCalled();
    });
  });
});
