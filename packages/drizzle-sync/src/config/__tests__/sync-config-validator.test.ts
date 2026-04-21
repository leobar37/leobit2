import { describe, it, expect } from "vitest";
import { pgTable, uuid, text, integer } from "drizzle-orm/pg-core";
import { validateSyncConfig } from "../validator";
import { currency, weight } from "../../codecs";

const salesTable = pgTable("sales", {
  id: uuid("id").primaryKey(),
  totalAmount: text("total_amount").notNull(),
  netWeight: text("net_weight"),
  version: integer("version").notNull().default(1),
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
                entity: "saleItems",
                foreignKey: "sale_id",
                payloadKey: "sale_id",
              },
            ],
          },
        },
      },
    });

    expect(result.valid).toBe(true);
    expect(result.warnings.some((w) => w.path.includes("payloadKey"))).toBe(true);
  });
});
