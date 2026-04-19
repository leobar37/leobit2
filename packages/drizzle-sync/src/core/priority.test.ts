import { describe, it, expect } from "vitest";
import {
  getEntityPriority,
  sortEntitiesByPriority,
  groupEntitiesByPriority,
  isParentEntity,
  isChildEntity,
  DEFAULT_ENTITY_PRIORITIES,
} from "./priority";

describe("priority", () => {
  describe("getEntityPriority", () => {
    it("returns 1 for sales (parent entity)", () => {
      expect(getEntityPriority("sales")).toBe(1);
    });

    it("returns 2 for sale_items (child entity)", () => {
      expect(getEntityPriority("sale_items")).toBe(2);
    });

    it("returns 1 for customers (parent entity)", () => {
      expect(getEntityPriority("customers")).toBe(1);
    });

    it("returns 2 for customer_tags (child entity)", () => {
      expect(getEntityPriority("customer_tags")).toBe(2);
    });

    it("returns 99 for unknown entity types", () => {
      expect(getEntityPriority("unknown_entity")).toBe(99);
    });

    it("respects custom config", () => {
      const customConfig = { custom_entity: 5 };
      expect(getEntityPriority("custom_entity", customConfig)).toBe(5);
    });

    it("falls back to 99 for unknown entity in custom config", () => {
      const customConfig: Record<string, number> = {};
      expect(getEntityPriority("unknown_entity", customConfig)).toBe(99);
    });
  });

  describe("sortEntitiesByPriority", () => {
    it("sorts entities by priority ascending", () => {
      const entities = ["sale_items", "sales", "products", "product_variants"];
      const sorted = sortEntitiesByPriority(entities);
      expect(sorted).toEqual(["sales", "products", "sale_items", "product_variants"]);
    });

    it("returns empty array for empty input", () => {
      expect(sortEntitiesByPriority([])).toEqual([]);
    });

    it("returns copy of single element array", () => {
      const entities = ["customers"];
      const sorted = sortEntitiesByPriority(entities);
      expect(sorted).toEqual(["customers"]);
      expect(sorted).not.toBe(entities);
    });

    it("does not mutate original array", () => {
      const entities = ["sale_items", "sales"];
      sortEntitiesByPriority(entities);
      expect(entities).toEqual(["sale_items", "sales"]);
    });
  });

  describe("groupEntitiesByPriority", () => {
    it("groups entities by priority number", () => {
      const entities = ["sales", "sale_items", "customers", "customer_tags"];
      const groups = groupEntitiesByPriority(entities);
      expect(groups.get(1)).toEqual(["sales", "customers"]);
      expect(groups.get(2)).toEqual(["sale_items", "customer_tags"]);
    });

    it("returns empty map for empty input", () => {
      const groups = groupEntitiesByPriority([]);
      expect(groups.size).toBe(0);
    });

    it("assigns priority 99 to unknown entities", () => {
      const entities = ["sales", "unknown_entity"];
      const groups = groupEntitiesByPriority(entities);
      expect(groups.get(1)).toEqual(["sales"]);
      expect(groups.get(99)).toEqual(["unknown_entity"]);
    });
  });

  describe("isParentEntity", () => {
    it("returns true for priority 1 entities", () => {
      expect(isParentEntity("sales")).toBe(true);
      expect(isParentEntity("customers")).toBe(true);
      expect(isParentEntity("products")).toBe(true);
    });

    it("returns false for child entities", () => {
      expect(isParentEntity("sale_items")).toBe(false);
      expect(isParentEntity("customer_tags")).toBe(false);
    });

    it("returns false for unknown entities (priority 99)", () => {
      expect(isParentEntity("unknown_entity")).toBe(false);
    });
  });

  describe("isChildEntity", () => {
    it("returns true for priority > 1 and < 99", () => {
      expect(isChildEntity("sale_items")).toBe(true);
      expect(isChildEntity("customer_tags")).toBe(true);
      expect(isChildEntity("product_variants")).toBe(true);
    });

    it("returns false for parent entities (priority 1)", () => {
      expect(isChildEntity("sales")).toBe(false);
      expect(isChildEntity("customers")).toBe(false);
    });

    it("returns false for unknown entities (priority 99)", () => {
      expect(isChildEntity("unknown_entity")).toBe(false);
    });
  });

  describe("DEFAULT_ENTITY_PRIORITIES", () => {
    it("is a non-empty object", () => {
      expect(Object.keys(DEFAULT_ENTITY_PRIORITIES).length).toBeGreaterThan(0);
    });

    it("has sales at priority 1", () => {
      expect(DEFAULT_ENTITY_PRIORITIES["sales"]).toBe(1);
    });

    it("has sale_items at priority 2", () => {
      expect(DEFAULT_ENTITY_PRIORITIES["sale_items"]).toBe(2);
    });

    it("has parent entities at priority 1", () => {
      expect(DEFAULT_ENTITY_PRIORITIES["customers"]).toBe(1);
      expect(DEFAULT_ENTITY_PRIORITIES["products"]).toBe(1);
    });

    it("has child entities at priority 2", () => {
      expect(DEFAULT_ENTITY_PRIORITIES["purchase_items"]).toBe(2);
      expect(DEFAULT_ENTITY_PRIORITIES["product_variants"]).toBe(2);
    });
  });
});
