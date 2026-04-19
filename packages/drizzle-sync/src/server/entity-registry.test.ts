import { describe, it, expect, beforeEach } from "vitest";
import { EntityRegistry } from "./entity-registry";

describe("entity-registry", () => {
  let registry: EntityRegistry;

  beforeEach(() => {
    registry = new EntityRegistry();
  });

  describe("register", () => {
    it("registers create operations", () => {
      registry.register("create", "entity-1");
      expect(registry.wasCreated("entity-1")).toBe(true);
    });

    it("registers update operations", () => {
      registry.register("update", "entity-1");
      expect(registry.wasModified("entity-1")).toBe(true);
    });

    it("registers delete operations", () => {
      registry.register("delete", "entity-1");
      expect(registry.wasDeleted("entity-1")).toBe(true);
    });
  });

  describe("wasCreated", () => {
    it("returns true for created entities", () => {
      registry.register("create", "entity-1");
      expect(registry.wasCreated("entity-1")).toBe(true);
    });

    it("returns false for updated entities", () => {
      registry.register("update", "entity-1");
      expect(registry.wasCreated("entity-1")).toBe(false);
    });

    it("returns false for deleted entities", () => {
      registry.register("delete", "entity-1");
      expect(registry.wasCreated("entity-1")).toBe(false);
    });

    it("returns false for unregistered entities", () => {
      expect(registry.wasCreated("unknown")).toBe(false);
    });
  });

  describe("wasModified", () => {
    it("returns true for created entities", () => {
      registry.register("create", "entity-1");
      expect(registry.wasModified("entity-1")).toBe(true);
    });

    it("returns true for updated entities", () => {
      registry.register("update", "entity-1");
      expect(registry.wasModified("entity-1")).toBe(true);
    });

    it("returns false for deleted entities", () => {
      registry.register("delete", "entity-1");
      expect(registry.wasModified("entity-1")).toBe(false);
    });

    it("returns false for unregistered entities", () => {
      expect(registry.wasModified("unknown")).toBe(false);
    });
  });

  describe("wasDeleted", () => {
    it("returns true for deleted entities", () => {
      registry.register("delete", "entity-1");
      expect(registry.wasDeleted("entity-1")).toBe(true);
    });

    it("returns false for created entities", () => {
      registry.register("create", "entity-1");
      expect(registry.wasDeleted("entity-1")).toBe(false);
    });

    it("returns false for updated entities", () => {
      registry.register("update", "entity-1");
      expect(registry.wasDeleted("entity-1")).toBe(false);
    });

    it("returns false for unregistered entities", () => {
      expect(registry.wasDeleted("unknown")).toBe(false);
    });
  });

  describe("clear", () => {
    it("clears all registered entities", () => {
      registry.register("create", "entity-1");
      registry.register("update", "entity-2");
      registry.register("delete", "entity-3");

      registry.clear();

      expect(registry.wasCreated("entity-1")).toBe(false);
      expect(registry.wasModified("entity-2")).toBe(false);
      expect(registry.wasDeleted("entity-3")).toBe(false);
    });
  });

  describe("getStats", () => {
    it("returns correct counts", () => {
      registry.register("create", "entity-1");
      registry.register("create", "entity-2");
      registry.register("update", "entity-3");
      registry.register("delete", "entity-4");

      const stats = registry.getStats();
      expect(stats).toEqual({ created: 2, updated: 1, deleted: 1 });
    });

    it("returns zeros for empty registry", () => {
      const stats = registry.getStats();
      expect(stats).toEqual({ created: 0, updated: 0, deleted: 0 });
    });

    it("updates counts after clear", () => {
      registry.register("create", "entity-1");
      registry.clear();
      expect(registry.getStats()).toEqual({ created: 0, updated: 0, deleted: 0 });
    });
  });

  describe("multiple registrations", () => {
    it("handles same entity registered multiple times", () => {
      registry.register("create", "entity-1");
      registry.register("update", "entity-1");
      registry.register("delete", "entity-1");

      // wasCreated and wasModified should both be true since we registered create first
      expect(registry.wasCreated("entity-1")).toBe(true);
      expect(registry.wasModified("entity-1")).toBe(true);
      expect(registry.wasDeleted("entity-1")).toBe(true);
    });
  });
});
