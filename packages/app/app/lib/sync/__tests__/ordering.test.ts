import { describe, expect, it } from "vitest";
import { ENTITY_PRIORITIES, getEntityPriority } from "@avileo/shared";

describe("sync ordering", () => {
  it("should use shared entity priorities", () => {
    expect(ENTITY_PRIORITIES.sales).toBe(1);
    expect(ENTITY_PRIORITIES.sale_items).toBe(2);

    expect(ENTITY_PRIORITIES.purchases).toBe(1);
    expect(ENTITY_PRIORITIES.purchase_items).toBe(2);

    expect(ENTITY_PRIORITIES.distribuciones).toBe(1);
    expect(ENTITY_PRIORITIES.distribucion_items).toBe(2);

    expect(ENTITY_PRIORITIES.customer_groups).toBe(1);
    expect(ENTITY_PRIORITIES.customer_group_members).toBe(2);
  });

  it("should enforce parent-before-child semantics", () => {
    const parentChildPairs = [
      ["sales", "sale_items"],
      ["purchases", "purchase_items"],
      ["distribuciones", "distribucion_items"],
      ["customer_groups", "customer_group_members"],
      ["products", "product_variants"],
      ["tags", "customer_tags"],
    ] as const;

    for (const [parent, child] of parentChildPairs) {
      expect(getEntityPriority(parent)).toBeLessThan(getEntityPriority(child));
    }
  });

  it("should default unknown entities to low priority", () => {
    const unknownEntity = "unknown_entity" as never;
    expect(getEntityPriority(unknownEntity)).toBe(99);
  });
});
