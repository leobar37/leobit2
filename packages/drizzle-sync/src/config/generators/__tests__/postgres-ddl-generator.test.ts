import { describe, it, expect } from "vitest";
import { generatePostgreSQLDDL, generatePostgreSQLDDLFile } from "../postgres-ddl-generator";
import type { EntitySyncConfig } from "../../types";
import { pgTable, uuid, varchar, text, integer, boolean, timestamp, jsonb, decimal, index } from "drizzle-orm/pg-core";

// Mock Drizzle table for testing
const testTable = pgTable(
  "test_entity",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: varchar("name", { length: 255 }).notNull(),
    email: varchar("email", { length: 100 }),
    description: text("description"),
    age: integer("age"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    price: decimal("price", { precision: 10, scale: 2 }),
    status: text("status").notNull().default("draft"),
    tenantId: uuid("tenant_id").notNull(),
  },
  (table) => [
    index("idx_test_entity_name").on(table.name),
    index("idx_test_entity_tenant_id").on(table.tenantId),
  ]
);

const testConfig: EntitySyncConfig = {
  table: testTable,
  syncable: true,
  autoFields: true,
  priority: 1,
};

describe("PostgreSQL DDL Generator", () => {
  describe("generatePostgreSQLDDL", () => {
    it("generates CREATE TABLE with proper PostgreSQL syntax", () => {
      const result = generatePostgreSQLDDL("test_entity", testConfig);

      expect(result.tableName).toBe("test_entity");
      expect(result.createTable).toContain('CREATE TABLE IF NOT EXISTS "test_entity"');
      expect(result.createTable).toContain("(");
      expect(result.createTable).toContain(");");
    });

    it("maps uuid primary key to UUID type", () => {
      const result = generatePostgreSQLDDL("test_entity", testConfig);

      expect(result.createTable).toContain('"id" UUID');
      expect(result.createTable).toContain("PRIMARY KEY");
    });

    it("maps varchar to VARCHAR with length", () => {
      const result = generatePostgreSQLDDL("test_entity", testConfig);

      expect(result.createTable).toContain('"name" VARCHAR(255)');
      expect(result.createTable).toContain('"email" VARCHAR(100)');
    });

    it("maps text to TEXT", () => {
      const result = generatePostgreSQLDDL("test_entity", testConfig);

      expect(result.createTable).toContain('"description" TEXT');
      expect(result.createTable).toContain('"status" TEXT');
    });

    it("maps integer to INTEGER", () => {
      const result = generatePostgreSQLDDL("test_entity", testConfig);

      expect(result.createTable).toContain('"age" INTEGER');
    });

    it("maps boolean to BOOLEAN", () => {
      const result = generatePostgreSQLDDL("test_entity", testConfig);

      expect(result.createTable).toContain('"is_active" BOOLEAN');
    });

    it("maps timestamp to TIMESTAMP", () => {
      const result = generatePostgreSQLDDL("test_entity", testConfig);

      expect(result.createTable).toContain('"created_at" TIMESTAMP');
    });

    it("maps jsonb to JSONB", () => {
      const result = generatePostgreSQLDDL("test_entity", testConfig);

      expect(result.createTable).toContain('"metadata" JSONB');
    });

    it("maps decimal to DECIMAL with precision and scale", () => {
      const result = generatePostgreSQLDDL("test_entity", testConfig);

      expect(result.createTable).toContain('"price" DECIMAL(10, 2)');
    });

    it("includes NOT NULL constraints", () => {
      const result = generatePostgreSQLDDL("test_entity", testConfig);

      expect(result.createTable).toContain('"name" VARCHAR(255) NOT NULL');
      expect(result.createTable).toContain('"is_active" BOOLEAN NOT NULL');
      expect(result.createTable).toContain('"created_at" TIMESTAMP NOT NULL');
      expect(result.createTable).toContain('"status" TEXT NOT NULL');
      expect(result.createTable).toContain('"tenant_id" UUID NOT NULL');
    });

    it("auto-injects sync_status column if not present", () => {
      const result = generatePostgreSQLDDL("test_entity", testConfig);

      expect(result.createTable).toContain("sync_status TEXT NOT NULL DEFAULT 'pending'");
    });

    it("auto-injects sync_attempts column if not present", () => {
      const result = generatePostgreSQLDDL("test_entity", testConfig);

      expect(result.createTable).toContain("sync_attempts INTEGER NOT NULL DEFAULT 0");
    });

    it("does not duplicate sync_status if already in table", () => {
      const tableWithSync = pgTable(
        "test_with_sync",
        {
          id: uuid("id").primaryKey(),
          name: varchar("name", { length: 255 }).notNull(),
          syncStatus: text("sync_status").notNull().default("synced"),
          syncAttempts: integer("sync_attempts").notNull().default(0),
        }
      );

      const configWithSync: EntitySyncConfig = {
        table: tableWithSync,
        syncable: true,
        autoFields: true,
        priority: 1,
      };

      const result = generatePostgreSQLDDL("test_with_sync", configWithSync);

      // Count occurrences of sync_status - should be exactly 1 (from the original column)
      const matches = result.createTable.match(/sync_status/g);
      expect(matches).toHaveLength(1);
    });

    it("generates indexes for sync_status", () => {
      const result = generatePostgreSQLDDL("test_entity", testConfig);

      expect(result.indexes).toContain('CREATE INDEX IF NOT EXISTS "idx_test_entity_sync_status" ON "test_entity"(sync_status);');
    });

    it("generates indexes for tenant_id", () => {
      const result = generatePostgreSQLDDL("test_entity", testConfig);

      expect(result.indexes).toContain('CREATE INDEX IF NOT EXISTS "idx_test_entity_tenant_id" ON "test_entity"(tenant_id);');
    });

    it("generates indexes for FK columns", () => {
      const tableWithFK = pgTable(
        "test_fk",
        {
          id: uuid("id").primaryKey(),
          customerId: uuid("customer_id").notNull(),
          productId: uuid("product_id").notNull(),
          tenantId: uuid("tenant_id").notNull(),
        }
      );

      const configWithFK: EntitySyncConfig = {
        table: tableWithFK,
        syncable: true,
        autoFields: true,
        priority: 1,
      };

      const result = generatePostgreSQLDDL("test_fk", configWithFK);

      expect(result.indexes).toContain('CREATE INDEX IF NOT EXISTS "idx_test_fk_customer_id" ON "test_fk"("customer_id");');
      expect(result.indexes).toContain('CREATE INDEX IF NOT EXISTS "idx_test_fk_product_id" ON "test_fk"("product_id");');
      expect(result.indexes).toContain('CREATE INDEX IF NOT EXISTS "idx_test_fk_tenant_id" ON "test_fk"(tenant_id);');
      expect(result.indexes).toContain('CREATE INDEX IF NOT EXISTS "idx_test_fk_sync_status" ON "test_fk"(sync_status);');
    });

    it("uses proper double-quote quoting for identifiers", () => {
      const result = generatePostgreSQLDDL("test_entity", testConfig);

      expect(result.createTable).toContain('"id"');
      expect(result.createTable).toContain('"name"');
      expect(result.createTable).toContain('"tenant_id"');
      expect(result.indexes[0]).toContain('"test_entity"');
    });

    it("handles table with only sync columns", () => {
      const minimalTable = pgTable("minimal_table", {
        id: uuid("id").primaryKey(),
        syncStatus: text("sync_status").notNull().default("pending"),
        syncAttempts: integer("sync_attempts").notNull().default(0),
      });

      const minimalConfig: EntitySyncConfig = {
        table: minimalTable,
        syncable: true,
        autoFields: true,
        priority: 1,
      };

      const result = generatePostgreSQLDDL("minimal_table", minimalConfig);

      expect(result.createTable).toContain('CREATE TABLE IF NOT EXISTS "minimal_table"');
      expect(result.createTable).toContain('"id" UUID');
      expect(result.createTable).toContain("PRIMARY KEY");
    });
  });

  describe("generatePostgreSQLDDLFile", () => {
    it("generates complete SQL file with header", () => {
      const outputs = [
        generatePostgreSQLDDL("test_entity", testConfig),
      ];

      const fileContent = generatePostgreSQLDDLFile(outputs);

      expect(fileContent).toContain("-- AUTO-GENERATED FILE - DO NOT EDIT");
      expect(fileContent).toContain("-- Generated by drizzle-sync from backend schema");
      expect(fileContent).toContain("-- PostgreSQL-compatible DDL for PGlite");
    });

    it("includes all tables and indexes in output", () => {
      const outputs = [
        generatePostgreSQLDDL("entity1", testConfig),
        generatePostgreSQLDDL("entity2", testConfig),
      ];

      const fileContent = generatePostgreSQLDDLFile(outputs);

      expect(fileContent).toContain('CREATE TABLE IF NOT EXISTS "entity1"');
      expect(fileContent).toContain('CREATE TABLE IF NOT EXISTS "entity2"');
      expect(fileContent).toContain("idx_entity1_sync_status");
      expect(fileContent).toContain("idx_entity2_sync_status");
    });
  });

  describe("type mapping", () => {
    it("maps various Drizzle column types correctly", () => {
      const mixedTable = pgTable("mixed_types", {
        id: uuid("id").primaryKey(),
        shortText: varchar("short_text", { length: 50 }),
        longText: text("long_text"),
        smallInt: integer("small_int"),
        flag: boolean("flag").notNull(),
        createdAt: timestamp("created_at"),
        updatedAt: timestamp("updated_at"),
        data: jsonb("data"),
        amount: decimal("amount", { precision: 12, scale: 3 }),
        category: text("category"),
      });

      const mixedConfig: EntitySyncConfig = {
        table: mixedTable,
        syncable: true,
        autoFields: true,
        priority: 1,
      };

      const result = generatePostgreSQLDDL("mixed_types", mixedConfig);

      expect(result.createTable).toContain('"short_text" VARCHAR(50)');
      expect(result.createTable).toContain('"long_text" TEXT');
      expect(result.createTable).toContain('"small_int" INTEGER');
      expect(result.createTable).toContain('"flag" BOOLEAN NOT NULL');
      expect(result.createTable).toContain('"created_at" TIMESTAMP');
      expect(result.createTable).toContain('"updated_at" TIMESTAMP');
      expect(result.createTable).toContain('"data" JSONB');
      expect(result.createTable).toContain('"amount" DECIMAL(12, 3)');
      expect(result.createTable).toContain('"category" TEXT');
    });
  });
});
