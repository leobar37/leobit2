import { describe, it, expect } from "vitest";
import { pgTable, uuid, text, integer } from "drizzle-orm/pg-core";
import { validateSyncConfig } from "../validator";
import { currency, weight } from "../../codecs";

const salesTable = pgTable("sales", {
  id: uuid("id").primaryKey(),
  totalAmount: text("total_amount").notNull(),
  netWeight: text("net_weight"),
  version: integer("version").notNull().default(1),
  customerId: uuid("customer_id"),
});

const saleItemsTable = pgTable("sale_items", {
  id: uuid("id").primaryKey(),
  saleId: uuid("sale_id").notNull(),
  productId: uuid("product_id"),
});

const customersTable = pgTable("customers", {
  id: uuid("id").primaryKey(),
  name: text("name").notNull(),
});

const suppliersTable = pgTable("suppliers", {
  id: uuid("id").primaryKey(),
  name: text("name").notNull(),
});

describe("validateSyncConfig with fieldCodecs", () => {
  it("accepts valid fieldCodecs", () => {
    const result = validateSyncConfig({
      entities: {
        sales: {
          table: salesTable,
          syncable: true,
          fieldCodecs: {
            total_amount: currency(),
            net_weight: weight({ nullable: true }),
          },
        },
      },
    });

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("rejects codec fields that do not exist", () => {
    const result = validateSyncConfig({
      entities: {
        sales: {
          table: salesTable,
          syncable: true,
          fieldCodecs: {
            amount_total: currency(),
          },
        },
      },
    });

    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.path.endsWith(".fieldCodecs"))).toBe(true);
  });

  it("warns when payloadKey uses snake_case", () => {
    const result = validateSyncConfig({
      entities: {
        sales: {
          table: salesTable,
          syncable: true,
          relations: {
            children: [
              {
                entity: "sale_items",
                foreignKey: "sale_id",
                payloadKey: "sale_id",
              },
            ],
          },
        },
        sale_items: {
          table: saleItemsTable,
          syncable: true,
        },
      },
    });

    expect(result.valid).toBe(true);
    expect(result.warnings.some((w) => w.path.includes("payloadKey"))).toBe(true);
  });

  it("fails when explicit relations reference undeclared entities", () => {
    const result = validateSyncConfig({
      entities: {
        sales: {
          table: salesTable,
          syncable: true,
          relations: {
            children: [
              {
                entity: "sale_items",
                foreignKey: "sale_id",
              },
            ],
          },
        },
      },
    });

    expect(result.valid).toBe(false);
    expect(
      result.errors.some((e) => e.message.includes("undeclared entity"))
    ).toBe(true);
  });

  it("does not infer plural heuristics outside declared entities", () => {
    const result = validateSyncConfig({
      entities: {
        sales: {
          table: salesTable,
          syncable: true,
        },
        customers: {
          table: customersTable,
          syncable: true,
        },
      },
    });

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("accepts explicit canonical relations", () => {
    const result = validateSyncConfig({
      entities: {
        sales: {
          table: salesTable,
          syncable: true,
          relations: {
            parents: [{ entity: "customers", foreignKey: "customer_id" }],
            children: [{ entity: "sale_items", foreignKey: "sale_id" }],
          },
        },
        sale_items: {
          table: saleItemsTable,
          syncable: true,
        },
        customers: {
          table: customersTable,
          syncable: true,
        },
      },
    });

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("ignores undeclared FK-derived references during graph build", () => {
    const result = validateSyncConfig({
      entities: {
        sale_items: {
          table: saleItemsTable,
          syncable: true,
        },
        sales: {
          table: salesTable,
          syncable: true,
        },
      },
    });

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("supports explicit parent relations without FK heuristics", () => {
    const result = validateSyncConfig({
      entities: {
        sales: {
          table: salesTable,
          syncable: true,
          relations: {
            parents: [{ entity: "suppliers", foreignKey: "supplier_id" }],
          },
        },
        suppliers: {
          table: suppliersTable,
          syncable: true,
        },
      },
    });

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });
});
