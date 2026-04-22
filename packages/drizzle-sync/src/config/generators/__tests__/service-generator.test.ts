import { describe, it, expect } from "vitest";
import { generateService, generateServicesFile, type ServiceOutput } from "../service-generator";
import type { EntitySyncConfig } from "../../types";
import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  boolean,
  timestamp,
  date,
  jsonb,
  decimal,
} from "drizzle-orm/pg-core";

// Mock Drizzle table for testing - similar to tags
const testTagTable = pgTable("tags", {
  id: uuid("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  color: varchar("color", { length: 20 }),
  syncStatus: text("sync_status").notNull().default("pending"),
  syncAttempts: integer("sync_attempts").notNull().default(0),
  tenantId: uuid("tenant_id").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

const tagConfig: EntitySyncConfig = {
  table: testTagTable,
  syncable: true,
  autoFields: true,
  priority: 1,
};

// Table with all optional fields
const testCustomerTable = pgTable("customers", {
  id: uuid("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 20 }),
  email: varchar("email", { length: 255 }),
  address: text("address"),
  notes: text("notes"),
  isActive: boolean("is_active").notNull().default(true),
  syncStatus: text("sync_status").notNull().default("pending"),
  syncAttempts: integer("sync_attempts").notNull().default(0),
  tenantId: uuid("tenant_id").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

const customerConfig: EntitySyncConfig = {
  table: testCustomerTable,
  syncable: true,
  autoFields: true,
  priority: 1,
};

// Table with required fields only
const testProductTable = pgTable("products", {
  id: uuid("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  sku: varchar("sku", { length: 50 }).notNull(),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  syncStatus: text("sync_status").notNull().default("pending"),
  syncAttempts: integer("sync_attempts").notNull().default(0),
  tenantId: uuid("tenant_id").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

const productConfig: EntitySyncConfig = {
  table: testProductTable,
  syncable: true,
  autoFields: true,
  priority: 2,
};

// Junction table without 'id' column (like customer_tags with composite PK on customerId+tagId)
// Note: Junction tables should NOT have tenantId column - that's the bug we're fixing
const testJunctionTable = pgTable("customer_tags", {
  customerId: uuid("customer_id").notNull(),
  tagId: uuid("tag_id").notNull(),
  assignedAt: timestamp("assigned_at").notNull().defaultNow(),
  assignedBy: uuid("assigned_by"),
  syncStatus: text("sync_status").notNull().default("pending"),
  syncAttempts: integer("sync_attempts").notNull().default(0),
  // NO tenantId column - junction tables don't have tenantId
}, (table) => ({
  // Composite primary key on customerId + tagId (not using 'id' column)
}));

const junctionConfig: EntitySyncConfig = {
  table: testJunctionTable,
  syncable: true,
  autoFields: true,
  priority: 2,
};

// Table with a date column (similar to distribuciones.fecha which uses date type)
const testDistribucionTable = pgTable("distribuciones", {
  id: uuid("id").primaryKey(),
  fecha: date("fecha").notNull(),
  estado: text("estado").notNull().default("activo"),
  syncStatus: text("sync_status").notNull().default("pending"),
  syncAttempts: integer("sync_attempts").notNull().default(0),
  tenantId: uuid("tenant_id").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

const distribucionConfig: EntitySyncConfig = {
  table: testDistribucionTable,
  syncable: true,
  autoFields: true,
  priority: 3,
};

describe("Service Generator", () => {
  describe("generateService", () => {
    it("generates service with proper class structure", () => {
      const result = generateService("tags", tagConfig);

      expect(result.name).toBe("tags");
      expect(result.serviceCode).toContain("export class TagsService extends BaseService");
      expect(result.serviceCode).toContain("getEntityType(): EntityType");
      expect(result.serviceCode).toContain("return TagsService.ENTITY_TYPE");
      expect(result.serviceCode).toContain("getEntityPrefix()");
      expect(result.serviceCode).toContain("return TagsService.ID_PREFIX");
    });

    it("generates static ENTITY_TYPE constant", () => {
      const result = generateService("tags", tagConfig);

      expect(result.serviceCode).toContain("private static readonly ENTITY_TYPE: EntityType = \"tags\";");
    });

    it("generates static ID_PREFIX constant", () => {
      const result = generateService("tags", tagConfig);

      expect(result.serviceCode).toContain('private static readonly ID_PREFIX = "tag";');
    });

    it("generates findById method with proper Drizzle query", () => {
      const result = generateService("tags", tagConfig);

      // Should use this.db.select().from(table).where(eq(table.id, id)).limit(1)
      expect(result.serviceCode).toContain("this.db");
      expect(result.serviceCode).toContain("select()");
      expect(result.serviceCode).toContain("from(tags)");
      expect(result.serviceCode).toContain("where(eq(tags.id, id))");
      expect(result.serviceCode).toContain("limit(1)");
      expect(result.serviceCode).toContain("async findById(id: string)");
    });

    it("generates findMany method filtering by tenantId", () => {
      const result = generateService("tags", tagConfig);

      expect(result.serviceCode).toContain("list(options");
      expect(result.serviceCode).toContain("this.businessId");
      expect(result.serviceCode).toContain("eq(tags.tenantId, this.businessId)");
      expect(result.serviceCode).toContain("orderBy(desc(tags.createdAt))");
    });

    it("generates create method with sync queueing", () => {
      const result = generateService("tags", tagConfig);

      // Should use queueSync("create", ...)
      expect(result.serviceCode).toContain("async create(");
      expect(result.serviceCode).toContain('queueSync("create"');
      expect(result.serviceCode).toContain("this.generateId()");
      expect(result.serviceCode).toContain("this.now()");
    });

    it("generates create method that inserts with PENDING sync status", () => {
      const result = generateService("tags", tagConfig);

      expect(result.serviceCode).toContain("syncStatus: SyncStatus.PENDING");
      expect(result.serviceCode).toContain("syncAttempts: 0");
    });

    it("generates create method that sets tenantId", () => {
      const result = generateService("tags", tagConfig);

      expect(result.serviceCode).toContain("tenantId: this.businessId");
    });

    it("generates update method with sync queueing", () => {
      const result = generateService("tags", tagConfig);

      expect(result.serviceCode).toContain("async update(id: string,");
      expect(result.serviceCode).toContain('queueSync("update"');
      expect(result.serviceCode).toContain("SyncStatus.PENDING");
    });

    it("generates delete method with sync queueing", () => {
      const result = generateService("tags", tagConfig);

      expect(result.serviceCode).toContain("async delete(id: string)");
      expect(result.serviceCode).toContain('queueSync("delete"');
    });

    it("generates CreateInput interface with required fields for notNull columns", () => {
      const result = generateService("tags", tagConfig);

      // name is notNull, so required
      expect(result.serviceCode).toContain("export interface CreateTagsInput");
      expect(result.serviceCode).toContain("name: string");
      // color is nullable, so optional
      expect(result.serviceCode).toContain("color?: string");
    });

    it("generates UpdateInput interface with all fields optional", () => {
      const result = generateService("tags", tagConfig);

      expect(result.serviceCode).toContain("export interface UpdateTagsInput");
      expect(result.serviceCode).toContain("name?: string");
      expect(result.serviceCode).toContain("color?: string");
    });

    it("handles table with all optional user fields", () => {
      const result = generateService("customers", customerConfig);

      expect(result.serviceCode).toContain("export interface CreateCustomersInput");
      // name is required
      expect(result.serviceCode).toContain("name: string");
      // phone, email, address, notes are optional
      expect(result.serviceCode).toContain("phone?: string");
      expect(result.serviceCode).toContain("email?: string");
      expect(result.serviceCode).toContain("address?: string");
      expect(result.serviceCode).toContain("notes?: string");
    });

    it("handles table with required non-id fields", () => {
      const result = generateService("products", productConfig);

      expect(result.serviceCode).toContain("export interface CreateProductsInput");
      // All user fields are required
      expect(result.serviceCode).toContain("name: string");
      expect(result.serviceCode).toContain("sku: string");
      expect(result.serviceCode).toContain("price: string");
    });

    it("does not duplicate sync columns in input interfaces", () => {
      const result = generateService("tags", tagConfig);

      // syncStatus, syncAttempts, tenantId, id, createdAt, updatedAt should not be in input
      expect(result.serviceCode).not.toContain("id?:");
      expect(result.serviceCode).not.toContain("syncStatus?:");
      expect(result.serviceCode).not.toContain("syncAttempts?:");
      expect(result.serviceCode).not.toContain("tenantId?:");
      expect(result.serviceCode).not.toContain("createdAt?:");
      expect(result.serviceCode).not.toContain("updatedAt?:");
    });

    it("generates update method that finds existing entity", () => {
      const result = generateService("tags", tagConfig);

      expect(result.serviceCode).toContain("const existing = await this.findById(id)");
      expect(result.serviceCode).toContain("throw new Error(`Tags not found");
    });

    it("generates delete method that finds existing entity", () => {
      const result = generateService("tags", tagConfig);

      expect(result.serviceCode).toContain("const existing = await this.findById(id)");
      expect(result.serviceCode).toContain("throw new Error(`Tags not found");
    });

    it("uses proper table name in queries", () => {
      const result = generateService("customer_groups", customerConfig);

      expect(result.serviceCode).toContain("from(customerGroups)");
      expect(result.serviceCode).toContain("where(eq(customerGroups.id, id))");
      expect(result.serviceCode).toContain("where(eq(customerGroups.tenantId, this.businessId))");
    });

    it("generates update with partial update logic", () => {
      const result = generateService("tags", tagConfig);

      // Should build partial update - only include fields that are defined
      expect(result.serviceCode).toContain("if (input.name !== undefined)");
      expect(result.serviceCode).toContain("updateData.name = input.name");
    });

    it("handles singular entity names correctly", () => {
      const result = generateService("visita", tagConfig);

      // Should convert to camelCase for table reference
      expect(result.serviceCode).toContain("from(visita)");
      // But keep original for class name
      expect(result.serviceCode).toContain("export class VisitaService");
      // And for entity type - returns via static property access
      expect(result.serviceCode).toContain("return VisitaService.ENTITY_TYPE");
      // And for prefix - returns via static property access
      expect(result.serviceCode).toContain("return VisitaService.ID_PREFIX");
    });

    it("handles underscored entity names", () => {
      const result = generateService("customer_groups", customerConfig);

      expect(result.serviceCode).toContain("export class CustomerGroupsService");
      expect(result.serviceCode).toContain("return CustomerGroupsService.ENTITY_TYPE");
      expect(result.serviceCode).toContain("return CustomerGroupsService.ID_PREFIX");
    });
  });

  describe("generateServicesFile", () => {
    it("generates complete services file with header", () => {
      const outputs: ServiceOutput[] = [
        { name: "tags", serviceCode: "// Tags service code" },
        { name: "customers", serviceCode: "// Customers service code" },
      ];

      const fileContent = generateServicesFile(outputs);

      expect(fileContent).toContain("// AUTO-GENERATED FILE - DO NOT EDIT");
      expect(fileContent).toContain("// Generated by drizzle-sync from backend schema");
    });

    it("aggregates all service codes", () => {
      const outputs: ServiceOutput[] = [
        { name: "tags", serviceCode: "// Tags service" },
        { name: "customers", serviceCode: "// Customers service" },
      ];

      const fileContent = generateServicesFile(outputs);

      expect(fileContent).toContain("// Tags service");
      expect(fileContent).toContain("// Customers service");
    });

    it("includes proper imports for BaseService", () => {
      const outputs: ServiceOutput[] = [
        { name: "tags", serviceCode: "// Tags service" },
      ];

      const fileContent = generateServicesFile(outputs);

      expect(fileContent).toContain('import type { PGlite } from "@electric-sql/pglite"');
      expect(fileContent).toContain('import type { drizzle } from "drizzle-orm/pglite"');
      expect(fileContent).toContain('import { BaseService, type EntityType } from "~/lib/services/base-service"');
      expect(fileContent).toContain('import { SyncService } from "~/lib/sync/sync-service"');
      expect(fileContent).toContain('import { SyncStatus');
      expect(fileContent).toContain('import { eq, and, desc } from "drizzle-orm"');
    });

    it("imports table schemas from generated schema module when using real service code", () => {
      const tagService = generateService("tags", tagConfig);

      const outputs: ServiceOutput[] = [tagService];
      const fileContent = generateServicesFile(outputs);

      // Should contain the generated schema import with table name
      expect(fileContent).toContain('from "~/lib/sync/drizzle-schema"');
      // The table name should be in the import
      expect(fileContent).toContain("tags");
    });

    it("handles empty outputs", () => {
      const outputs: ServiceOutput[] = [];

      const fileContent = generateServicesFile(outputs);

      expect(fileContent).toContain("// AUTO-GENERATED FILE");
      expect(fileContent).not.toContain("export class");
    });

    it("handles single service", () => {
      const outputs: ServiceOutput[] = [
        { name: "tags", serviceCode: "// Tags service\n\nexport class TagsService extends BaseService {}" },
      ];

      const fileContent = generateServicesFile(outputs);

      expect(fileContent).toContain("// Tags service");
      expect(fileContent).toContain("export class TagsService");
    });

    it("does not have duplicate imports when aggregating multiple services", () => {
      // Generate real service code for multiple entities
      const tagService = generateService("tags", tagConfig);
      const customerService = generateService("customers", customerConfig);

      const outputs: ServiceOutput[] = [tagService, customerService];
      const fileContent = generateServicesFile(outputs);

      // Count lines that start with "import " - should be minimal and deduplicated
      const importLines = fileContent.split("\n").filter((line) => line.trim().startsWith("import "));

      // Each unique module should only appear once in imports
      const seenModules = new Set<string>();
      for (const line of importLines) {
        // Extract module path from import statement
        const match = line.match(/from\s+['"]([^'"]+)['"]/);
        if (match) {
          const module = match[1];
          expect(seenModules).not.toContain(module);
          seenModules.add(module);
        }
      }

      // Should have imports for: @electric-sql/pglite, drizzle-orm, base-service, sync-service, generated schema
      expect(seenModules.size).toBeGreaterThanOrEqual(4);
    });

    it("deduplicates table imports when multiple services are aggregated", () => {
      // Generate real service code for multiple entities
      const tagService = generateService("tags", tagConfig);
      const customerService = generateService("customers", customerConfig);

      const outputs: ServiceOutput[] = [tagService, customerService];
      const fileContent = generateServicesFile(outputs);

      // The generated schema import should include all table names from all services
      // Count how many times it appears - should be minimal (ideally 1)
      const schemaImportLines = fileContent
        .split("\n")
        .filter((line) => line.includes('~/lib/sync/drizzle-schema'));
      
      // There should be only ONE line that imports from generated schema module (deduplicated)
      expect(schemaImportLines.length).toBe(1);
    });

    it("does not duplicate 'and' imports from drizzle-orm", () => {
      const outputs: ServiceOutput[] = [
        { name: "tags", serviceCode: generateService("tags", tagConfig).serviceCode },
        { name: "customers", serviceCode: generateService("customers", customerConfig).serviceCode },
        { name: "products", serviceCode: generateService("products", productConfig).serviceCode },
      ];

      const fileContent = generateServicesFile(outputs);

      // Should only have one line importing from drizzle-orm
      const drizzleLines = fileContent.split("\n").filter((line) => line.includes("from \"drizzle-orm\""));
      expect(drizzleLines.length).toBe(1);

      // And it should contain eq, and, desc all in one import
      expect(drizzleLines[0]).toContain("eq");
      expect(drizzleLines[0]).toContain("and");
      expect(drizzleLines[0]).toContain("desc");
    });

    it("removes duplicate import statements from individual service codes when aggregating", () => {
      // Create service codes that have imports (as real generateService does)
      const tagService = generateService("tags", tagConfig);
      const customerService = generateService("customers", customerConfig);

      // Verify each service code has its own imports
      expect(tagService.serviceCode).toContain("from \"@electric-sql/pglite\"");
      expect(customerService.serviceCode).toContain("from \"@electric-sql/pglite\"");

      const outputs: ServiceOutput[] = [tagService, customerService];
      const fileContent = generateServicesFile(outputs);

      // After aggregation, there should be no duplicate import statements
      // Check that each import line is unique
      const importLines = fileContent.split("\n").filter((line) => line.trim().startsWith("import "));

      // Create a set of exact import lines - duplicates should be filtered out
      const uniqueImportLines = new Set(importLines);

      // The number of unique lines should equal the total (no duplicates)
      expect(uniqueImportLines.size).toBe(importLines.length);
    });

    it("includes table names in generated schema import when services are aggregated", () => {
      // Generate real service code for tags and customers
      const tagService = generateService("tags", tagConfig);
      const customerService = generateService("customers", customerConfig);

      const outputs: ServiceOutput[] = [tagService, customerService];
      const fileContent = generateServicesFile(outputs);

      // The generated schema import should include tags and customers table names
      const schemaImportLine = fileContent
        .split("\n")
        .find((line) => line.includes('~/lib/sync/drizzle-schema'));
      expect(schemaImportLine).toBeDefined();
      // Should include both table names
      expect(schemaImportLine).toContain("tags");
      expect(schemaImportLine).toContain("customers");
    });
  });

  describe("VAL-SVC validation assertions", () => {
    it("VAL-SVC-002: Generated service extends BaseService", () => {
      const result = generateService("tags", tagConfig);

      expect(result.serviceCode).toContain("extends BaseService");
      expect(result.serviceCode).toContain("getEntityType()");
      expect(result.serviceCode).toContain("getEntityPrefix()");
    });

    it("VAL-SVC-003: Generated service has CRUD methods", () => {
      const result = generateService("tags", tagConfig);

      expect(result.serviceCode).toContain("findById(");
      expect(result.serviceCode).toContain("list(");
      expect(result.serviceCode).toContain("create(");
      expect(result.serviceCode).toContain("update(");
      expect(result.serviceCode).toContain("delete(");
    });

    it("VAL-SVC-004: Generated create queues sync", () => {
      const result = generateService("tags", tagConfig);

      expect(result.serviceCode).toContain('queueSync("create"');
    });

    it("VAL-SVC-005: Generated update queues sync", () => {
      const result = generateService("tags", tagConfig);

      expect(result.serviceCode).toContain('queueSync("update"');
    });

    it("VAL-SVC-006: Generated delete queues sync", () => {
      const result = generateService("tags", tagConfig);

      expect(result.serviceCode).toContain('queueSync("delete"');
    });

    it("VAL-SVC-007: Generator handles entity with optional fields", () => {
      const result = generateService("tags", tagConfig);

      // color is nullable, should be optional in CreateInput
      expect(result.serviceCode).toContain("color?: string");
    });

    it("VAL-SVC-010: Generated service uses Drizzle ORM queries", () => {
      const result = generateService("tags", tagConfig);

      expect(result.serviceCode).toContain("this.db\n      .select()");
      expect(result.serviceCode).toContain("this.db.insert(tags)");
      expect(result.serviceCode).toContain("this.db\n      .update(tags)");
      expect(result.serviceCode).toContain("this.db\n      .delete(tags)");
    });
  });

  describe("date column type handling", () => {
    it("uses string type for date columns (not Date)", () => {
      const result = generateService("distribuciones", distribucionConfig);

      // fecha is a date column - it should use string type, not Date
      // This matches the frontend Zod schema which uses z.string() for fecha
      expect(result.serviceCode).toContain("fecha: string");
      expect(result.serviceCode).not.toContain("fecha: Date");
    });

    it("generates CreateInput with string type for date columns", () => {
      const result = generateService("distribuciones", distribucionConfig);

      // The CreateInput interface should have fecha as string
      expect(result.serviceCode).toContain("export interface CreateDistribucionesInput");
      expect(result.serviceCode).toMatch(/fecha:\s*string/);
    });

    it("generates UpdateInput with optional string type for date columns", () => {
      const result = generateService("distribuciones", distribucionConfig);

      // The UpdateInput interface should have fecha as optional string
      expect(result.serviceCode).toContain("export interface UpdateDistribucionesInput");
      expect(result.serviceCode).toMatch(/fecha\?:\s*string/);
    });
  });

  describe("junction table handling", () => {
    it("does not generate findById for junction tables without 'id' column", () => {
      const result = generateService("customer_tags", junctionConfig);

      // Junction tables don't have 'id' column, so no findById should be generated
      expect(result.serviceCode).not.toContain("findById(");
      expect(result.serviceCode).not.toContain("where(eq(customerTags.id");
    });

    it("generates findMany for junction tables (no tenantId filter)", () => {
      const result = generateService("customer_tags", junctionConfig);

      expect(result.serviceCode).toContain("list(options");
      // Junction tables don't have tenantId, so no filter by tenantId
      expect(result.serviceCode).not.toContain("eq(customerTags.tenantId");
    });

    it("does not generate update method for junction tables", () => {
      const result = generateService("customer_tags", junctionConfig);

      // Junction tables should not have standard update method
      expect(result.serviceCode).not.toContain("async update(");
    });

    it("does not generate delete method for junction tables", () => {
      const result = generateService("customer_tags", junctionConfig);

      // Junction tables should not have standard delete method
      expect(result.serviceCode).not.toContain("async delete(");
    });

    it("generates create method without 'id' field for junction tables", () => {
      const result = generateService("customer_tags", junctionConfig);

      expect(result.serviceCode).toContain("async create(");
      // Should not have 'id' field in create (use more specific patterns)
      expect(result.serviceCode).not.toContain("id: this.generateId()");
      // Make sure it's not the primary key id field being set (not customerId/tagId)
      // The id is generated but not assigned to the entity
      expect(result.serviceCode).not.toMatch(/\n\s+id,\n/);
      // But should have customerId and tagId
      expect(result.serviceCode).toContain("customerId: input.customerId");
      expect(result.serviceCode).toContain("tagId: input.tagId");
    });

    it("generates CreateInput interface for junction table", () => {
      const result = generateService("customer_tags", junctionConfig);

      expect(result.serviceCode).toContain("export interface CreateCustomerTagsInput");
      // Both customerId and tagId should be required (notNull without default)
      expect(result.serviceCode).toContain("customerId: string");
      expect(result.serviceCode).toContain("tagId: string");
    });

    it("creates service code that uses proper junction table structure", () => {
      const result = generateService("customer_tags", junctionConfig);

      // The entity should be built without id field
      expect(result.serviceCode).toContain("const entity: typeof customerTags.$inferInsert = {");
      // Should have syncStatus, syncAttempts, but NO tenantId (junction tables don't have it)
      expect(result.serviceCode).toContain("syncStatus: SyncStatus.PENDING");
      expect(result.serviceCode).toContain("syncAttempts: 0");
      expect(result.serviceCode).not.toContain("tenantId: this.tenantId");
    });

    it("junction table has no update or delete methods but still has findMany and create", () => {
      const result = generateService("customer_tags", junctionConfig);

      // Should have these
      expect(result.serviceCode).toContain("list(options");
      expect(result.serviceCode).toContain("create(");
      expect(result.serviceCode).toContain("queueSync(\"create\"");

      // Should NOT have these (no standard CRUD for junction tables)
      expect(result.serviceCode).not.toContain("update(");
      expect(result.serviceCode).not.toContain("delete(");
      expect(result.serviceCode).not.toContain("findById(");
    });
  });
});
