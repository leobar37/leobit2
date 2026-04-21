import { existsSync } from "fs";
import { mkdtemp, readFile, rm } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { describe, expect, it } from "vitest";
import { pgTable, text, uuid } from "drizzle-orm/pg-core";
import { SchemaManager } from "./schema-manager";
import { buildRelationGraph } from "./introspect";
import type { EntitySyncConfig } from "./types";

const customersTable = pgTable("customers_test_schema_manager", {
  id: uuid("id").primaryKey(),
  businessId: uuid("business_id").notNull(),
  name: text("name").notNull(),
});

const customerConfig: EntitySyncConfig = {
  table: customersTable,
  syncable: true,
  autoFields: true,
};

describe("SchemaManager", () => {
  it("builds and saves sync schema", async () => {
    const tempDir = await mkdtemp(join(tmpdir(), "schema-manager-"));
    const outputPath = join(tempDir, "sync.schema.json");

    try {
      const manager = new SchemaManager({
        output: outputPath,
        autoBuild: true,
      });

      const entities = { customers: customerConfig };
      const graph = buildRelationGraph({
        customers: { table: customersTable },
      });

      const schema = await manager.build(entities, graph);

      expect(schema.version).toBe("1.0.0");
      expect(schema.entities.customers.name).toBe("customers");
      expect(schema.entities.customers.tableName).toBe("customers_test_schema_manager");
      expect(schema.entities.customers.columns.length).toBeGreaterThan(0);
      expect(existsSync(outputPath)).toBe(true);
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it("loads existing schema from disk", async () => {
    const tempDir = await mkdtemp(join(tmpdir(), "schema-manager-load-"));
    const outputPath = join(tempDir, "sync.schema.json");

    try {
      const manager = new SchemaManager({
        output: outputPath,
        autoBuild: true,
      });

      const entities = { customers: customerConfig };
      const graph = buildRelationGraph({
        customers: { table: customersTable },
      });

      await manager.build(entities, graph);
      const loaded = await manager.load();
      const file = JSON.parse(await readFile(outputPath, "utf-8")) as {
        version: string;
      };

      expect(loaded.version).toBe("1.0.0");
      expect(file.version).toBe("1.0.0");
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });
});
