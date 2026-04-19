import { camelCase, pascalCase } from "../../utils/string-utils";
import type { ColumnMetadata, EntitySyncConfig } from "../../config/types";
import { introspectTable, resolveColumns } from "../../config/introspect";

export interface ServiceOutput {
  name: string;
  serviceCode: string;
}

// Columns that are auto-managed and should not appear in user input interfaces
const AUTO_MANAGED_COLUMNS = new Set([
  "id",
  "sync_status",
  "sync_status",
  "sync_attempts",
  "business_id",
  "businessid",
  "created_at",
  "createdat",
  "updated_at",
  "updatedat",
  "version",
]);

// System columns that are auto-injected by the sync system
const SYSTEM_COLUMNS = new Set([
  "sync_status",
  "sync_attempts",
  "business_id",
  "businessid",
  "created_at",
  "createdat",
  "updated_at",
  "updatedat",
]);

/**
 * Generate a PGlite local-first BaseService subclass for an entity
 */
export function generateService(
  entityName: string,
  config: EntitySyncConfig
): ServiceOutput {
  const columns = introspectTable(config.table);
  const columnsToInclude = resolveColumns(columns, config);

  // Filter out auto-managed columns for input interfaces
  const userColumns = columnsToInclude.filter(
    (col) => !AUTO_MANAGED_COLUMNS.has(col.name.toLowerCase())
  );

  // Get required vs optional fields for CreateInput
  const requiredFields = userColumns.filter(
    (col) => col.notNull && col.default === undefined
  );
  const optionalFields = userColumns.filter(
    (col) => !col.notNull || col.default !== undefined
  );

  // Get table reference name (camelCase of entityName, handling underscores)
  const tableRef = camelCase(entityName);

  // Get entity type (use entityName as-is for the sync entity type)
  const entityType = entityName;

  // Get ID prefix (first letters of each word, max 3 chars)
  const idPrefix = getIdPrefix(entityName);

  // Generate CreateInput interface
  const createInputFields = userColumns.map((col) => {
    const tsType = getTypeScriptType(col);
    const isRequired = col.notNull && col.default === undefined;
    return `  ${camelCase(col.name)}${isRequired ? "" : "?"}: ${tsType};`;
  });
  const createInputInterface = `export interface Create${pascalCase(entityName)}Input {\n${createInputFields.join("\n")}\n}`;

  // Generate UpdateInput interface (all fields optional)
  const updateInputFields = userColumns.map((col) => {
    const tsType = getTypeScriptType(col);
    return `  ${camelCase(col.name)}?: ${tsType};`;
  });
  const updateInputInterface = `export interface Update${pascalCase(entityName)}Input {\n${updateInputFields.join("\n")}\n}`;

  // Generate the service class
  const serviceCode = `
import type { PGlite } from "@electric-sql/pglite";
import type { drizzle } from "drizzle-orm/pglite";
import { eq, and, desc } from "drizzle-orm";
import { BaseService, type EntityType } from "~/lib/services/base-service";
import { SyncService } from "~/lib/sync/sync-service";
import { SyncStatus, ${tableRef} } from "@avileo/shared";

${createInputInterface}
${updateInputInterface}

export class ${pascalCase(entityName)}Service extends BaseService {
  private static readonly TABLE_NAME = "${entityName}";
  private static readonly ENTITY_TYPE: EntityType = "${entityType}";
  private static readonly ID_PREFIX = "${idPrefix}";

  constructor(
    pg: PGlite,
    db: ReturnType<typeof drizzle>,
    syncService: SyncService,
    businessId: string,
    businessUserId: string
  ) {
    super(pg, db, syncService, businessId, businessUserId);
  }

  getEntityType(): EntityType {
    return ${pascalCase(entityName)}Service.ENTITY_TYPE;
  }

  getEntityPrefix(): string {
    return ${pascalCase(entityName)}Service.ID_PREFIX;
  }

  /**
   * Find a ${entityName} by ID
   */
  async findById(id: string): Promise<typeof ${tableRef}.$inferSelect | null> {
    const result = await this.db
      .select()
      .from(${tableRef})
      .where(eq(${tableRef}.id, id))
      .limit(1);

    return result[0] || null;
  }

  /**
   * Find all ${entityName} for the current business
   */
  async findByBusiness(): Promise<typeof ${tableRef}.$inferSelect[]> {
    return this.db
      .select()
      .from(${tableRef})
      .where(eq(${tableRef}.businessId, this.businessId))
      .orderBy(desc(${tableRef}.createdAt));
  }

  /**
   * Create a new ${entityName}
   * Stores locally and queues for server sync
   */
  async create(input: Create${pascalCase(entityName)}Input): Promise<typeof ${tableRef}.$inferSelect> {
    const id = this.generateId();
    const now = this.now();

    const entity: typeof ${tableRef}.$inferInsert = {
      id,
${generateInsertFields(userColumns, tableRef)}
      syncStatus: SyncStatus.PENDING,
      syncAttempts: 0,
      businessId: this.businessId,
      createdAt: new Date(now),
      updatedAt: new Date(now),
    };

    await this.db.insert(${tableRef}).values(entity);

    await this.queueSync("create", id, {
${generatePayloadFields(userColumns, tableRef)}
    });

    return { ...entity } as typeof ${tableRef}.$inferSelect;
  }

  /**
   * Update an existing ${entityName}
   * Updates locally and queues for server sync
   */
  async update(id: string, input: Update${pascalCase(entityName)}Input): Promise<void> {
    const existing = await this.findById(id);
    if (!existing) {
      throw new Error(\`${pascalCase(entityName)} not found: \${id}\`);
    }

    const now = this.now();
    const updateData: Partial<typeof ${tableRef}.$inferInsert> = {
      updatedAt: new Date(now),
      syncStatus: SyncStatus.PENDING,
    };

${generateUpdateFields(userColumns, tableRef)}
    await this.db
      .update(${tableRef})
      .set(updateData)
      .where(eq(${tableRef}.id, id));

    await this.queueSync("update", id, input as Record<string, unknown>);
  }

  /**
   * Delete a ${entityName}
   * Removes locally and queues deletion for server sync
   */
  async delete(id: string): Promise<void> {
    const existing = await this.findById(id);
    if (!existing) {
      throw new Error(\`${pascalCase(entityName)} not found: \${id}\`);
    }

    await this.db
      .delete(${tableRef})
      .where(eq(${tableRef}.id, id));

    await this.queueSync("delete", id, {});
  }
}
`;

  return {
    name: entityName,
    serviceCode: serviceCode.trim(),
  };
}

/**
 * Generate the field assignments for the insert operation
 */
function generateInsertFields(columns: ColumnMetadata[], tableRef: string): string {
  const lines: string[] = [];

  for (const col of columns) {
    const fieldName = camelCase(col.name);
    if (col.default !== undefined) {
      // Has default - use input value or default
      lines.push(`      ${fieldName}: input.${fieldName} ?? ${formatDefaultValue(col.default)},`);
    } else if (!col.notNull) {
      // Nullable - use input value (which is optional)
      lines.push(`      ${fieldName}: input.${fieldName},`);
    } else {
      // Required - use input value directly
      lines.push(`      ${fieldName}: input.${fieldName},`);
    }
  }

  return lines.join("\n");
}

/**
 * Generate the payload fields for queueSync
 */
function generatePayloadFields(columns: ColumnMetadata[], _tableRef: string): string {
  const lines: string[] = [];

  for (const col of columns) {
    const fieldName = camelCase(col.name);
    lines.push(`      ${fieldName}: input.${fieldName},`);
  }

  return lines.join("\n");
}

/**
 * Generate the update field assignments
 */
function generateUpdateFields(columns: ColumnMetadata[], _tableRef: string): string {
  const lines: string[] = [];

  for (const col of columns) {
    const fieldName = camelCase(col.name);
    lines.push(`    if (input.${fieldName} !== undefined) {`);
    lines.push(`      updateData.${fieldName} = input.${fieldName};`);
    lines.push(`    }`);
    lines.push("");
  }

  return lines.join("\n");
}

/**
 * Get TypeScript type for a column
 */
function getTypeScriptType(col: ColumnMetadata): string {
  switch (col.dataType) {
    case "string":
      return "string";
    case "number":
      return "number";
    case "boolean":
      return "boolean";
    case "date":
      return "Date";
    case "enum":
      return col.enumValues?.map((v) => `"${v}"`).join(" | ") || "string";
    case "json":
      return "Record<string, unknown>";
    default:
      return "string";
  }
}

/**
 * Format a default value for use in generated code
 */
function formatDefaultValue(value: unknown): string {
  if (value === null) return "null";
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number") return String(value);
  if (typeof value === "string") return `"${value}"`;

  // Handle Drizzle SQL functions like gen_random_uuid() and now()
  if (value && typeof value === "object" && "queryChunks" in value) {
    // This is a Drizzle SQL function - for frontend, we don't use these
    // so we return a sensible default
    return "null";
  }

  return "null";
}

/**
 * Get ID prefix from entity name
 * e.g., "customer_groups" -> "cg", "tags" -> "tag", "visita" -> "vis"
 */
function getIdPrefix(entityName: string): string {
  // Handle underscored names
  const words = entityName.split("_");

  if (words.length > 1) {
    // Multi-word: take first letter of each word, max 3 chars
    return words.map((w) => w.charAt(0)).join("").substring(0, 3);
  }

  // Single word: take first 3-4 chars
  if (entityName.length <= 3) {
    return entityName;
  }

  // For common singular/plural pairs, return singular form prefix
  if (entityName.endsWith("s")) {
    return entityName.substring(0, 3);
  }

  return entityName.substring(0, 3);
}

/**
 * Generate a services file that aggregates all service classes
 */
export function generateServicesFile(outputs: ServiceOutput[]): string {
  const warning = `// AUTO-GENERATED FILE - DO NOT EDIT
// Generated by drizzle-sync from backend schema
// PGlite local-first BaseService subclasses
// Auto-generated at ${new Date().toISOString()}

`;

  const imports = `import type { PGlite } from "@electric-sql/pglite";
import type { drizzle } from "drizzle-orm/pglite";
import { eq, and, desc } from "drizzle-orm";
import { BaseService, type EntityType } from "~/lib/services/base-service";
import { SyncService } from "~/lib/sync/sync-service";
import { SyncStatus } from "@avileo/shared";
${outputs.map((o) => `import { ${camelCase(o.name)} } from "@avileo/shared";`).join("\n")}

`;

  const services = outputs.map((o) => o.serviceCode).join("\n\n");

  return warning + imports + services;
}
