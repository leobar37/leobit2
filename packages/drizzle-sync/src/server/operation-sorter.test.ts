import { describe, it, expect, beforeEach } from "vitest";
import { OperationSorter } from "./operation-sorter";
import type { SyncOperationInput } from "./types";

const mockEntityConfigs: Record<string, { relations?: { parents?: { entity: string; foreignKey: string; required?: boolean }[] } }> = {
  sales: {
    relations: {
      parents: [{ entity: "customers", foreignKey: "customer_id", required: false }],
    },
  },
  sale_items: {
    relations: {
      parents: [
        { entity: "sales", foreignKey: "sale_id", required: true },
        { entity: "products", foreignKey: "product_id", required: true },
        { entity: "product_variants", foreignKey: "variant_id", required: true },
      ],
    },
  },
  abonos: {
    relations: {
      parents: [
        { entity: "customers", foreignKey: "customer_id", required: true },
        { entity: "sales", foreignKey: "related_sale_id", required: false },
      ],
    },
  },
  customers: {
    relations: {},
  },
  products: {
    relations: {},
  },
  product_variants: {
    relations: {
      parents: [{ entity: "products", foreignKey: "product_id", required: true }],
    },
  },
  visitas: {
    relations: {
      parents: [
        { entity: "distribuciones", foreignKey: "distribucion_id", required: true },
        { entity: "customers", foreignKey: "customer_id", required: true },
      ],
    },
  },
  distribuciones: {
    relations: {},
  },
};

describe("operation-sorter", () => {
  let sorter: OperationSorter;

  beforeEach(() => {
    sorter = new OperationSorter(mockEntityConfigs);
  });

  const makeOp = (
    partial: {
      idempotencyKey: string;
      entityType?: string;
      entityId?: string;
      operation?: "create" | "update" | "delete";
    } & Partial<Omit<SyncOperationInput, "idempotencyKey" | "entityType" | "entityId" | "operation">>
  ): SyncOperationInput => {
    const defaults: SyncOperationInput = {
      idempotencyKey: "",
      entityType: "sales",
      entityId: "",
      operation: "create",
      payload: {},
      localVersion: 1,
      localTimestamp: new Date().toISOString(),
    };
    return { ...defaults, ...partial } as SyncOperationInput;
  };

  // ============================================
  // FK-based Topological Sort Tests (VAL-1-001)
  // ============================================

  describe("FK-based topological sort", () => {
    it("places sale before sale_items when sale_items references sale via FK", () => {
      // VAL-1-001: Given a sale (entityId: 'sale_123') and sale_items (payload.sale_id: 'sale_123'),
      // sale comes before item
      const ops: SyncOperationInput[] = [
        makeOp({
          idempotencyKey: "item-1",
          entityType: "sale_items",
          entityId: "item_001",
          payload: { sale_id: "sale_123" },
          localTimestamp: "2024-01-01T00:00:02.000Z",
        }),
        makeOp({
          idempotencyKey: "sale-1",
          entityType: "sales",
          entityId: "sale_123",
          payload: { customer_id: "cust_001" },
          localTimestamp: "2024-01-01T00:00:01.000Z",
        }),
      ];

      const result = sorter.sort(ops);

      // sale should come before item
      expect(result.operations[0].entityType).toBe("sales");
      expect(result.operations[0].entityId).toBe("sale_123");
      expect(result.operations[1].entityType).toBe("sale_items");
      expect(result.operations[1].entityId).toBe("item_001");
    });

    it("handles multiple items referencing the same parent sale", () => {
      const ops: SyncOperationInput[] = [
        makeOp({
          idempotencyKey: "item-2",
          entityType: "sale_items",
          entityId: "item_002",
          payload: { sale_id: "sale_123" },
          localTimestamp: "2024-01-01T00:00:03.000Z",
        }),
        makeOp({
          idempotencyKey: "item-1",
          entityType: "sale_items",
          entityId: "item_001",
          payload: { sale_id: "sale_123" },
          localTimestamp: "2024-01-01T00:00:02.000Z",
        }),
        makeOp({
          idempotencyKey: "sale-1",
          entityType: "sales",
          entityId: "sale_123",
          payload: { customer_id: "cust_001" },
          localTimestamp: "2024-01-01T00:00:01.000Z",
        }),
      ];

      const result = sorter.sort(ops);

      // sale is first, then items in timestamp order
      expect(result.operations[0].entityType).toBe("sales");
      expect(result.operations[1].entityType).toBe("sale_items");
      expect(result.operations[1].idempotencyKey).toBe("item-1");
      expect(result.operations[2].entityType).toBe("sale_items");
      expect(result.operations[2].idempotencyKey).toBe("item-2");
    });

    it("respects FK references even when timestamps suggest otherwise", () => {
      // Item created BEFORE sale in localTimestamp, but sale should still come first
      // because item references sale via FK
      const ops: SyncOperationInput[] = [
        makeOp({
          idempotencyKey: "item-1",
          entityType: "sale_items",
          entityId: "item_001",
          payload: { sale_id: "sale_123" },
          localTimestamp: "2024-01-01T00:00:00.100Z", // Earlier timestamp
        }),
        makeOp({
          idempotencyKey: "sale-1",
          entityType: "sales",
          entityId: "sale_123",
          payload: { customer_id: "cust_001" },
          localTimestamp: "2024-01-01T00:00:00.200Z", // Later timestamp
        }),
      ];

      const result = sorter.sort(ops);

      // sale comes first due to FK dependency, not timestamp
      expect(result.operations[0].entityType).toBe("sales");
      expect(result.operations[0].idempotencyKey).toBe("sale-1");
      expect(result.operations[1].entityType).toBe("sale_items");
      expect(result.operations[1].idempotencyKey).toBe("item-1");
    });
  });

  // ============================================
  // Multi-Parent Dependencies Tests (VAL-1-002)
  // ============================================

  describe("multi-parent dependencies", () => {
    it("places sale_items after all three parents (sales, products, product_variants)", () => {
      // VAL-1-002: A sale_items operation referencing both sales and products must come after both parents
      const ops: SyncOperationInput[] = [
        makeOp({
          idempotencyKey: "item-1",
          entityType: "sale_items",
          entityId: "item_001",
          payload: {
            sale_id: "sale_123",
            product_id: "prod_001",
            variant_id: "var_001",
          },
          localTimestamp: "2024-01-01T00:00:04.000Z",
        }),
        makeOp({
          idempotencyKey: "sale-1",
          entityType: "sales",
          entityId: "sale_123",
          payload: { customer_id: "cust_001" },
          localTimestamp: "2024-01-01T00:00:01.000Z",
        }),
        makeOp({
          idempotencyKey: "product-1",
          entityType: "products",
          entityId: "prod_001",
          payload: { name: "Chicken Feed" },
          localTimestamp: "2024-01-01T00:00:02.000Z",
        }),
        makeOp({
          idempotencyKey: "variant-1",
          entityType: "product_variants",
          entityId: "var_001",
          payload: { product_id: "prod_001" },
          localTimestamp: "2024-01-01T00:00:03.000Z",
        }),
      ];

      const result = sorter.sort(ops);

      // All three parents must come before item
      expect(result.operations[0].entityType).toBe("sales");
      expect(result.operations[1].entityType).toBe("products");
      expect(result.operations[2].entityType).toBe("product_variants");
      expect(result.operations[3].entityType).toBe("sale_items");
    });

    it("handles abonos with two parents (customers, sales)", () => {
      const ops: SyncOperationInput[] = [
        makeOp({
          idempotencyKey: "abono-1",
          entityType: "abonos",
          entityId: "abono_001",
          payload: {
            customer_id: "cust_001",
            related_sale_id: "sale_123",
          },
          localTimestamp: "2024-01-01T00:00:03.000Z",
        }),
        makeOp({
          idempotencyKey: "sale-1",
          entityType: "sales",
          entityId: "sale_123",
          payload: { customer_id: "cust_001" },
          localTimestamp: "2024-01-01T00:00:01.000Z",
        }),
        makeOp({
          idempotencyKey: "customer-1",
          entityType: "customers",
          entityId: "cust_001",
          payload: { name: "Juan" },
          localTimestamp: "2024-01-01T00:00:02.000Z",
        }),
      ];

      const result = sorter.sort(ops);

      // customer and sale come before abono
      expect(result.operations[0].entityType).toBe("customers");
      expect(result.operations[1].entityType).toBe("sales");
      expect(result.operations[2].entityType).toBe("abonos");
    });

    it("handles visitas with two parents (distribuciones, customers)", () => {
      const ops: SyncOperationInput[] = [
        makeOp({
          idempotencyKey: "visita-1",
          entityType: "visitas",
          entityId: "visita_001",
          payload: {
            distribucion_id: "dist_001",
            customer_id: "cust_001",
          },
          localTimestamp: "2024-01-01T00:00:03.000Z",
        }),
        makeOp({
          idempotencyKey: "dist-1",
          entityType: "distribuciones",
          entityId: "dist_001",
          payload: { status: "pending" },
          localTimestamp: "2024-01-01T00:00:01.000Z",
        }),
        makeOp({
          idempotencyKey: "customer-1",
          entityType: "customers",
          entityId: "cust_001",
          payload: { name: "Maria" },
          localTimestamp: "2024-01-01T00:00:02.000Z",
        }),
      ];

      const result = sorter.sort(ops);

      // Both parents come before visita
      expect(result.operations[0].entityType).toBe("distribuciones");
      expect(result.operations[1].entityType).toBe("customers");
      expect(result.operations[2].entityType).toBe("visitas");
    });

    it("handles customer_tags with two parents (customers, tags)", () => {
      const ops: SyncOperationInput[] = [
        makeOp({
          idempotencyKey: "ctag-1",
          entityType: "customer_tags",
          entityId: "ctag_001",
          payload: {
            customer_id: "cust_001",
            tag_id: "tag_001",
          },
          localTimestamp: "2024-01-01T00:00:03.000Z",
        }),
        makeOp({
          idempotencyKey: "tag-1",
          entityType: "tags",
          entityId: "tag_001",
          payload: { name: "VIP" },
          localTimestamp: "2024-01-01T00:00:01.000Z",
        }),
        makeOp({
          idempotencyKey: "customer-1",
          entityType: "customers",
          entityId: "cust_001",
          payload: { name: "Pedro" },
          localTimestamp: "2024-01-01T00:00:02.000Z",
        }),
      ];

      const result = sorter.sort(ops);

      // Both parents come before customer_tags
      expect(result.operations[0].entityType).toBe("tags");
      expect(result.operations[1].entityType).toBe("customers");
      expect(result.operations[2].entityType).toBe("customer_tags");
    });
  });

  // ============================================
  // Backward Compatibility with syncGroupId Tests (VAL-1-004)
  // ============================================

  describe("backward compatibility with syncGroupId", () => {
    it("sorts operations WITH syncGroupId correctly (legacy support)", () => {
      // VAL-1-004: Operations WITH syncGroupId must still be sorted correctly
      const ops: SyncOperationInput[] = [
        makeOp({
          idempotencyKey: "item-1",
          entityType: "sale_items",
          entityId: "item_001",
          payload: { sale_id: "sale_123" },
          syncGroupId: "group-1",
          localTimestamp: "2024-01-01T00:00:02.000Z",
        }),
        makeOp({
          idempotencyKey: "sale-1",
          entityType: "sales",
          entityId: "sale_123",
          payload: { customer_id: "cust_001" },
          syncGroupId: "group-1",
          localTimestamp: "2024-01-01T00:00:01.000Z",
        }),
      ];

      const result = sorter.sort(ops);

      // sale should still come before item due to FK, even with syncGroupId
      expect(result.operations[0].entityType).toBe("sales");
      expect(result.operations[0].idempotencyKey).toBe("sale-1");
      expect(result.operations[1].entityType).toBe("sale_items");
      expect(result.operations[1].idempotencyKey).toBe("item-1");
    });

    it("handles mixed batch with some having syncGroupId and some without", () => {
      const ops: SyncOperationInput[] = [
        // Without syncGroupId - relies on FK sorting
        makeOp({
          idempotencyKey: "item-1",
          entityType: "sale_items",
          entityId: "item_001",
          payload: { sale_id: "sale_123" },
          syncGroupId: undefined,
          localTimestamp: "2024-01-01T00:00:02.000Z",
        }),
        makeOp({
          idempotencyKey: "sale-1",
          entityType: "sales",
          entityId: "sale_123",
          payload: { customer_id: "cust_001" },
          syncGroupId: undefined,
          localTimestamp: "2024-01-01T00:00:01.000Z",
        }),
        // With syncGroupId - grouped together
        makeOp({
          idempotencyKey: "prod-2",
          entityType: "products",
          entityId: "prod_002",
          payload: { name: "Feed" },
          syncGroupId: "group-A",
          localTimestamp: "2024-01-01T00:00:04.000Z",
        }),
        makeOp({
          idempotencyKey: "prod-1",
          entityType: "products",
          entityId: "prod_001",
          payload: { name: "Chicken" },
          syncGroupId: "group-A",
          localTimestamp: "2024-01-01T00:00:03.000Z",
        }),
      ];

      const result = sorter.sort(ops);

      // FK-based: sale before item
      expect(result.operations[0].entityType).toBe("sales");
      expect(result.operations[1].entityType).toBe("sale_items");
      // syncGroupId-based: group-A together, timestamp ordered
      expect(result.operations[2].entityType).toBe("products");
      expect(result.operations[2].idempotencyKey).toBe("prod-1");
      expect(result.operations[3].entityType).toBe("products");
      expect(result.operations[3].idempotencyKey).toBe("prod-2");
    });

    it("falls back to syncGroupId sorting when no FK dependencies exist", () => {
      const ops: SyncOperationInput[] = [
        // No FK references, should sort by syncGroupId then priority
        makeOp({
          idempotencyKey: "prod-1",
          entityType: "products",
          entityId: "prod_001",
          payload: { name: "Product" },
          syncGroupId: "group-B",
          localTimestamp: "2024-01-01T00:00:01.000Z",
        }),
        makeOp({
          idempotencyKey: "cust-1",
          entityType: "customers",
          entityId: "cust_001",
          payload: { name: "Customer" },
          syncGroupId: "group-A",
          localTimestamp: "2024-01-01T00:00:02.000Z",
        }),
      ];

      const result = sorter.sort(ops);

      // Falls back to syncGroupId alphabetical sorting
      expect(result.operations[0].idempotencyKey).toBe("cust-1");
      expect(result.operations[1].idempotencyKey).toBe("prod-1");
    });
  });

  // ============================================
  // Circular Dependency Handling Tests
  // ============================================

  describe("circular dependency handling", () => {
    it("breaks ties with timestamp when circular dependencies exist", () => {
      // If two operations somehow reference each other (shouldn't happen in practice,
      // but we handle it gracefully), timestamp acts as tiebreaker
      const ops: SyncOperationInput[] = [
        makeOp({
          idempotencyKey: "later",
          entityType: "sales",
          entityId: "sale_001",
          payload: { customer_id: "cust_001" },
          localTimestamp: "2024-01-01T00:00:02.000Z",
        }),
        makeOp({
          idempotencyKey: "earlier",
          entityType: "customers",
          entityId: "cust_001",
          payload: { name: "John" },
          localTimestamp: "2024-01-01T00:00:01.000Z",
        }),
      ];

      const result = sorter.sort(ops);

      // No circular dependency since customer doesn't reference sale
      // But if somehow a circular ref existed, earlier timestamp wins
      expect(result.operations[0].idempotencyKey).toBe("earlier");
      expect(result.operations[1].idempotencyKey).toBe("later");
    });
  });

  describe("sort", () => {
    it("sorts by syncGroupId first", () => {
      const ops = [
        makeOp({ idempotencyKey: "b", syncGroupId: "group-2", localTimestamp: "2024-01-01T00:00:00.000Z" }),
        makeOp({ idempotencyKey: "a", syncGroupId: "group-1", localTimestamp: "2024-01-01T00:00:00.000Z" }),
        makeOp({ idempotencyKey: "c", syncGroupId: "group-1", localTimestamp: "2024-01-01T00:00:00.000Z" }),
      ];

      const result = sorter.sort(ops);
      expect(result.operations[0].idempotencyKey).toBe("a");
      expect(result.operations[1].idempotencyKey).toBe("c");
      expect(result.operations[2].idempotencyKey).toBe("b");
    });

    it("sorts by entity priority within same syncGroupId", () => {
      const ops = [
        makeOp({ idempotencyKey: "a", syncGroupId: "group-1", entityType: "sale_items", localTimestamp: "2024-01-01T00:00:01.000Z" }),
        makeOp({ idempotencyKey: "b", syncGroupId: "group-1", entityType: "sales", localTimestamp: "2024-01-01T00:00:00.000Z" }),
      ];

      const result = sorter.sort(ops);
      // sales (priority 1) should come before sale_items (priority 2)
      expect(result.operations[0].idempotencyKey).toBe("b");
      expect(result.operations[1].idempotencyKey).toBe("a");
    });

    it("sorts by localTimestamp as tiebreaker within same priority", () => {
      const ops = [
        makeOp({ idempotencyKey: "later", syncGroupId: "group-1", entityType: "sales", localTimestamp: "2024-01-02T00:00:00.000Z" }),
        makeOp({ idempotencyKey: "earlier", syncGroupId: "group-1", entityType: "sales", localTimestamp: "2024-01-01T00:00:00.000Z" }),
      ];

      const result = sorter.sort(ops);
      expect(result.operations[0].idempotencyKey).toBe("earlier");
      expect(result.operations[1].idempotencyKey).toBe("later");
    });

    it("handles operations without syncGroupId", () => {
      const ops = [
        makeOp({ idempotencyKey: "a", syncGroupId: undefined, entityType: "sale_items" }),
        makeOp({ idempotencyKey: "b", syncGroupId: undefined, entityType: "sales" }),
      ];

      const result = sorter.sort(ops);
      // sales (priority 1) should come first
      expect(result.operations[0].idempotencyKey).toBe("b");
      expect(result.operations[1].idempotencyKey).toBe("a");
    });

    it("does not mutate original array", () => {
      const ops = [
        makeOp({ idempotencyKey: "b", syncGroupId: "group-2" }),
        makeOp({ idempotencyKey: "a", syncGroupId: "group-1" }),
      ];
      const original = [...ops];
      sorter.sort(ops);
      expect(ops[0].idempotencyKey).toBe("b");
      expect(ops[1].idempotencyKey).toBe("a");
    });

    it("returns correct groupCount", () => {
      const ops = [
        makeOp({ idempotencyKey: "a", syncGroupId: "group-1" }),
        makeOp({ idempotencyKey: "b", syncGroupId: "group-1" }),
        makeOp({ idempotencyKey: "c", syncGroupId: "group-2" }),
      ];

      const result = sorter.sort(ops);
      expect(result.groupCount).toBe(2);
    });

    it("handles empty array", () => {
      const result = sorter.sort([]);
      expect(result.operations).toEqual([]);
      expect(result.groupCount).toBe(0);
    });

    it("handles single operation", () => {
      const ops = [makeOp({ idempotencyKey: "a", syncGroupId: "group-1" })];
      const result = sorter.sort(ops);
      expect(result.operations).toHaveLength(1);
      expect(result.groupCount).toBe(1);
    });

    it("sorts mixed syncGroupId and priority correctly", () => {
      const ops = [
        makeOp({ idempotencyKey: "1", syncGroupId: "B", entityType: "sale_items" }),
        makeOp({ idempotencyKey: "2", syncGroupId: "A", entityType: "sales" }),
        makeOp({ idempotencyKey: "3", syncGroupId: "A", entityType: "sale_items" }),
        makeOp({ idempotencyKey: "4", syncGroupId: "B", entityType: "sales" }),
      ];

      const result = sorter.sort(ops);
      // Group A comes first, then Group B (group-1)
      // Within Group A: sales (priority 1) before sale_items (priority 2)
      // Within Group B: sales (priority 1) before sale_items (priority 2)
      expect(result.operations[0].idempotencyKey).toBe("2"); // Group A, sales
      expect(result.operations[1].idempotencyKey).toBe("3"); // Group A, sale_items
      expect(result.operations[2].idempotencyKey).toBe("4"); // Group B, sales
      expect(result.operations[3].idempotencyKey).toBe("1"); // Group B, sale_items
    });
  });

  describe("getPriorityMap", () => {
    it("returns ENTITY_PRIORITIES copy", () => {
      const map = sorter.getPriorityMap();
      expect(map["sales"]).toBe(1);
      expect(map["sale_items"]).toBe(2);
    });

    it("returns a copy (mutation does not affect original)", () => {
      const map1 = sorter.getPriorityMap();
      const map2 = sorter.getPriorityMap();
      expect(map1).not.toBe(map2);
    });
  });
});
