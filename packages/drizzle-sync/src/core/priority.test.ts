import { describe, it, expect, beforeEach } from "vitest";
import {
  getEntityPriorityFromConfig,
  sortEntitiesByPriorityFromConfig,
  groupEntitiesByPriorityFromConfig,
  isParentEntityFromConfig,
  isChildEntityFromConfig,
  getChildEntities,
  getParentEntity,
  buildEntityProcessingOrder,
  DEFAULT_ENTITY_PRIORITIES,
  configureDefaultEntityPriorities,
} from "./priority";

const BASE_PRIORITIES = {
  sales: 1,
  sale_items: 2,
  customers: 1,
  products: 1,
  purchase_items: 2,
  product_variants: 2,
  customer_tags: 2,
} as const;

beforeEach(() => {
  configureDefaultEntityPriorities(BASE_PRIORITIES);
});

function buildEntities() {
  return Object.fromEntries(
    Object.entries(DEFAULT_ENTITY_PRIORITIES).map(([name, priority]) => [
      name,
      { name, priority, parent: null, tableName: name },
    ])
  ) as any;
}

const entities = () => buildEntities();

describe("priority (config-based)", () => {
  describe("getEntityPriorityFromConfig", () => {
    it("returns 1 for sales (parent entity)", () => {
      expect(getEntityPriorityFromConfig("sales", entities())).toBe(1);
    });

    it("returns 2 for sale_items (child entity)", () => {
      expect(getEntityPriorityFromConfig("sale_items", entities())).toBe(2);
    });

    it("returns 99 for unknown entity types", () => {
      expect(getEntityPriorityFromConfig("unknown_entity", entities())).toBe(99);
    });
  });

  describe("sortEntitiesByPriorityFromConfig", () => {
    it("sorts entities by priority ascending", () => {
      const list = ["sale_items", "sales", "products", "product_variants"];
      const sorted = sortEntitiesByPriorityFromConfig(list, entities());
      expect(sorted).toEqual(["sales", "products", "sale_items", "product_variants"]);
    });

    it("returns empty array for empty input", () => {
      expect(sortEntitiesByPriorityFromConfig([], entities())).toEqual([]);
    });

    it("does not mutate original array", () => {
      const list = ["sale_items", "sales"];
      sortEntitiesByPriorityFromConfig(list, entities());
      expect(list).toEqual(["sale_items", "sales"]);
    });
  });

  describe("groupEntitiesByPriorityFromConfig", () => {
    it("groups entities by priority number", () => {
      const list = ["sales", "sale_items", "customers", "customer_tags"];
      const groups = groupEntitiesByPriorityFromConfig(list, entities());
      expect(groups.get(1)).toEqual(["sales", "customers"]);
      expect(groups.get(2)).toEqual(["sale_items", "customer_tags"]);
    });

    it("returns empty map for empty input", () => {
      const groups = groupEntitiesByPriorityFromConfig([], entities());
      expect(groups.size).toBe(0);
    });
  });

  describe("isParentEntityFromConfig", () => {
    it("returns true for priority 1 entities", () => {
      expect(isParentEntityFromConfig("sales", entities())).toBe(true);
      expect(isParentEntityFromConfig("customers", entities())).toBe(true);
      expect(isParentEntityFromConfig("products", entities())).toBe(true);
    });

    it("returns false for child entities", () => {
      expect(isParentEntityFromConfig("sale_items", entities())).toBe(false);
      expect(isParentEntityFromConfig("customer_tags", entities())).toBe(false);
    });
  });

  describe("isChildEntityFromConfig", () => {
    it("returns true for priority > 1 and < 99", () => {
      expect(isChildEntityFromConfig("sale_items", entities())).toBe(true);
      expect(isChildEntityFromConfig("customer_tags", entities())).toBe(true);
      expect(isChildEntityFromConfig("product_variants", entities())).toBe(true);
    });

    it("returns false for parent entities", () => {
      expect(isChildEntityFromConfig("sales", entities())).toBe(false);
      expect(isChildEntityFromConfig("customers", entities())).toBe(false);
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
