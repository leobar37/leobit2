import { describe, it, expect } from "vitest";
import { pgTable, uuid, text } from "drizzle-orm/pg-core";
import type { EntitySyncConfig } from "../../types";
import { generateHooks, generateHooksFile } from "../hooks-generator";

const salesTable = pgTable("sales", {
  id: uuid("id").primaryKey(),
  tenantId: uuid("tenant_id").notNull(),
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
  it("generates engine-first create hook using useEngineService", () => {
    const entities = {
      sales: salesConfig,
      saleItems: saleItemsConfig,
    };

    const hooks = generateHooks("sales", salesConfig, entities);

    expect(hooks.createHook).toContain("useEngineService<SalesService>");
    expect(hooks.createHook).toContain('("sales")');
    expect(hooks.createHook).toContain("service.create(input)");
    expect(hooks.createHook).toContain("CreateSalesInput");
  });

  it("generates engine-first list and single hooks", () => {
    const entities = {
      sales: salesConfig,
      saleItems: saleItemsConfig,
    };

    const hooks = generateHooks("sales", salesConfig, entities);

    expect(hooks.listHook).toContain("useEngineService<SalesService>");
    expect(hooks.listHook).toContain("service.list(options)");
    expect(hooks.singleHook).toContain("service.findById(id)");
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
    expect(file).toContain('from "@avileo/drizzle-sync/react"');
  });
});
