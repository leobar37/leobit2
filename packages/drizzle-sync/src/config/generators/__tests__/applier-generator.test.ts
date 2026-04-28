import { describe, expect, it } from "vitest";
import { decimal, pgTable, uuid, varchar } from "drizzle-orm/pg-core";
import { generateApplierConfig } from "../applier-generator";
import type { SerializedEntity } from "../../schema-types";

describe("applier generator", () => {
  it("validates physical table columns even when sync config excludes a field", () => {
    const products = pgTable("products", {
      id: uuid("id").primaryKey(),
      name: varchar("name", { length: 255 }).notNull(),
      basePrice: decimal("base_price", { precision: 10, scale: 2 }).notNull(),
      costPrice: decimal("cost_price", { precision: 10, scale: 2 }).notNull().default("0"),
    });

    const config = generateApplierConfig("products", {
      table: products,
      syncable: true,
      autoFields: true,
      excludeFields: ["cost_price"],
    });

    expect(config.tableColumns.products.has("cost_price")).toBe(true);
    expect(config.requiredDefaults?.products?.base_price).toBe("");
  });

  it("infers required defaults from serialized columns without defaults", () => {
    const serializedEntity: SerializedEntity = {
      name: "products",
      entityType: "products",
      tableName: "products",
      columns: [
        {
          name: "base_price",
          dataType: "string",
          drizzleType: "PgNumeric",
          notNull: true,
          hasDefault: false,
          default: null,
          primary: false,
          isEnum: false,
          precision: 10,
          scale: 2,
        },
        {
          name: "created_at",
          dataType: "date",
          drizzleType: "PgTimestamp",
          notNull: true,
          hasDefault: true,
          default: { __type: "sql", value: "now()" },
          primary: false,
          isEnum: false,
        },
      ],
      config: {
        syncable: true,
        autoFields: true,
      },
      graph: {
        parents: [],
        children: [],
        priority: 1,
      },
    };

    const config = generateApplierConfig("products", serializedEntity);

    expect(config.requiredDefaults?.products?.base_price).toBe("");
    expect(config.requiredDefaults?.products?.created_at).toBeUndefined();
  });
});
