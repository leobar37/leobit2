import { mkdtemp, rm } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { describe, expect, it } from "vitest";
import { pgTable, text, uuid } from "drizzle-orm/pg-core";
import { SyncConfigBuilder } from "./builder";
import type { EntitySyncConfig } from "./types";

const customersTable = pgTable("customers_test_builder", {
  id: uuid("id").primaryKey(),
  businessId: uuid("business_id").notNull(),
  name: text("name").notNull(),
});

const customerConfig: EntitySyncConfig = {
  table: customersTable,
  syncable: true,
  autoFields: true,
};

describe("SyncConfigBuilder", () => {
  it("exposes runtime config and entities", () => {
    const builder = new SyncConfigBuilder({
      entities: {
        customers: customerConfig,
      },
      options: {
        batchSize: 10,
      },
    });

    expect(builder.entities.customers.syncable).toBe(true);
    expect(builder.options?.batchSize).toBe(10);

    const runtimeConfig = builder.getRuntimeConfig();
    expect(runtimeConfig.entities.customers.syncable).toBe(true);
    expect(runtimeConfig.options?.batchSize).toBe(10);
  });

  it("builds schema when schema config is provided", async () => {
    const tempDir = await mkdtemp(join(tmpdir(), "sync-builder-"));

    try {
      const builder = new SyncConfigBuilder({
        entities: {
          customers: customerConfig,
        },
        schema: {
          output: join(tempDir, "sync.schema.json"),
          autoBuild: false,
        },
      });

      const schema = await builder.buildSchema();
      expect(schema.version).toBe("1.0.0");
      expect(schema.entities.customers.tableName).toBe("customers_test_builder");
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });
});
