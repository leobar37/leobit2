import { describe, it, expect } from "vitest";
import { pgTable, uuid, text } from "drizzle-orm/pg-core";
import type { EntitySyncConfig } from "../../types";
import { generateHooks, generateHooksFile } from "../hooks-generator";

const salesTable = pgTable("sales", {
  id: uuid("id").primaryKey(),
  businessId: uuid("business_id").notNull(),
  totalAmount: text("total_amount").notNull(),
});

const saleItemsTable = pgTable("sale_items", {
  id: uuid("id").primaryKey(),
  saleId: uuid("sale_id").notNull(),
  subtotal: text("subtotal").notNull(),
});

const salesConfig: EntitySyncConfig = {
  table: salesTable,
  syncable: true,
  relations: {
    children: [
      {
        entity: "saleItems",
        foreignKey: "sale_id",
        payloadKey: "saleId",
      },
    ],
  },
};

const saleItemsConfig: EntitySyncConfig = {
  table: saleItemsTable,
  syncable: true,
};

describe("hooks-generator", () => {
  it("generates snake_case entityType and camelCase payload FK", () => {
    const entities = {
      sales: salesConfig,
      saleItems: saleItemsConfig,
    };

    const hooks = generateHooks("sales", salesConfig, entities);

    expect(hooks.createHook).toContain('entityType: "sales"');
    expect(hooks.createHook).toContain('entityType: "sale_items"');
    expect(hooks.createHook).toContain("saleId: parentId");
    expect(hooks.createHook).not.toContain("sale_id: parentId");
    expect(hooks.createHook).not.toContain('entityType: "saleItems"');
  });

  it("falls back to camelCase fk payload key when payloadKey is omitted", () => {
    const entities = {
      sales: {
        ...salesConfig,
        relations: {
          children: [
            {
              entity: "saleItems",
              foreignKey: "sale_id",
            },
          ],
        },
      },
      saleItems: saleItemsConfig,
    };

    const hooks = generateHooks("sales", entities.sales, entities);
    expect(hooks.createHook).toContain("saleId: parentId");
  });

  it("includes generated hooks in aggregate file", () => {
    const entities = {
      sales: salesConfig,
      saleItems: saleItemsConfig,
    };

    const hooksMap = new Map([
      ["sales", generateHooks("sales", salesConfig, entities)],
      ["saleItems", generateHooks("saleItems", saleItemsConfig, entities)],
    ]);

    const file = generateHooksFile(hooksMap, entities);
    expect(file).toContain("useCreateSales");
  });
});
