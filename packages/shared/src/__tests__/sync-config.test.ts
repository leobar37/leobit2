import {
  ENTITY_PRIORITIES,
  SYNC_ENTITIES,
  getEntityPriority,
  isSyncEntity,
} from "../sync-config";

declare const describe: (name: string, fn: () => void) => void;
declare const it: (name: string, fn: () => void) => void;
declare const expect: (value: unknown) => {
  toBe: (expected: unknown) => void;
  toContain: (expected: unknown) => void;
  toBeLessThan: (expected: number) => void;
};

describe("sync-config", () => {
  it("should have priorities for all parent-child pairs", () => {
    expect(ENTITY_PRIORITIES.sales).toBe(1);
    expect(ENTITY_PRIORITIES.sale_items).toBe(2);

    expect(ENTITY_PRIORITIES.purchases).toBe(1);
    expect(ENTITY_PRIORITIES.purchase_items).toBe(2);

    expect(ENTITY_PRIORITIES.distribuciones).toBe(1);

    expect(ENTITY_PRIORITIES.customer_groups).toBe(1);
    expect(ENTITY_PRIORITIES.customer_group_members).toBe(2);

    expect(ENTITY_PRIORITIES.products).toBe(1);
    expect(ENTITY_PRIORITIES.product_variants).toBe(2);

    expect(ENTITY_PRIORITIES.tags).toBe(1);
    expect(ENTITY_PRIORITIES.customer_tags).toBe(2);

    expect(ENTITY_PRIORITIES.files).toBe(1);
    expect(ENTITY_PRIORITIES.visitas).toBe(2);
    expect(ENTITY_PRIORITIES.abonos).toBe(2);
  });

  it("should not have drift between entity lists", () => {
    const priorityEntities = Object.keys(ENTITY_PRIORITIES);

    for (const entity of priorityEntities) {
      expect(SYNC_ENTITIES as readonly string[]).toContain(entity);
      expect(isSyncEntity(entity)).toBe(true);
    }
  });

  it("should process parent entities before child entities", () => {
    const parentChildPairs = [
      ["sales", "sale_items"],
      ["purchases", "purchase_items"],
      ["customer_groups", "customer_group_members"],
      ["products", "product_variants"],
      ["tags", "customer_tags"],
      ["customers", "visitas"],
      ["distribuciones", "visitas"],
      ["customers", "abonos"],
    ] as const;

    for (const [parent, child] of parentChildPairs) {
      expect(getEntityPriority(parent)).toBeLessThan(getEntityPriority(child));
    }
  });
});
