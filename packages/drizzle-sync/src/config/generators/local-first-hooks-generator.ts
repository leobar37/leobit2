/**
 * Local-First Hooks Generator
 *
 * Generates factory functions that create React hooks for local-first data access.
 * These hooks:
 * 1. Write to PGlite immediately (optimistic)
 * 2. Enqueue sync operations for background sync
 * 3. Return immediately without waiting for server confirmation
 *
 * This enables offline-first behavior where the UI updates instantly
 * while sync happens in the background.
 */

import type { PGlite } from "@electric-sql/pglite";
import { camelCase, pascalCase, snakeCase } from "../../utils/string-utils";
import type { EntitySyncConfig, SyncTenancyConfig } from "../../config/types";
import type { ISyncQueue } from "../../core/interfaces";
import type { EnqueueParams } from "../../core/types";
import { introspectTable, resolveColumns, buildRelationGraph } from "../../config/introspect";

// Columns that are auto-managed by the database or sync system
function getAutoColumns(tenantColumn: string): Set<string> {
  return new Set([
    "id",
    "sync_status",
    "sync_attempts",
    tenantColumn,
    tenantColumn.replace(/_/g, ""),
    "created_at",
    "createdat",
    "updated_at",
    "updatedat",
    "version",
  ]);
}

function getUserColumns(columns: ReturnType<typeof introspectTable>, tenantColumn: string = "tenant_id") {
  const autoColumns = getAutoColumns(tenantColumn);
  return columns.filter((col) => !autoColumns.has(col.name.toLowerCase()));
}

export interface LocalFirstHooks {
  create: (input: Record<string, unknown>, tenantId: string) => Promise<{ id: string }>;
  update: (id: string, input: Record<string, unknown>, tenantId: string) => Promise<{ id: string }>;
  delete: (id: string, tenantId: string) => Promise<void>;
}

export interface LocalFirstHooksOutput {
  name: string;
  hooksCode: string;
  factoryCode: string;
}

/**
 * Get the table name from a Drizzle table
 */
function getTableName(table: unknown): string {
  const t = table as { name?: string };
  return t.name || "";
}

/**
 * Generate INSERT SQL with parameterized placeholders
 */
function generateInsertSQL(
  tableName: string,
  columns: ReturnType<typeof getUserColumns>
): { sql: string; paramCount: number } {
  const columnNames = columns.map((col) => snakeCase(col.name));
  const placeholders = columns.map((_, i) => `$${i + 1}`);

  return {
    sql: `INSERT INTO ${tableName} (${columnNames.join(", ")}) VALUES (${placeholders.join(", ")})`,
    paramCount: columns.length,
  };
}

/**
 * Generate a factory function that creates local-first hooks for an entity
 */
export function generateLocalFirstHooksFactory(
  entityName: string,
  config: EntitySyncConfig,
  tenancy?: SyncTenancyConfig
): LocalFirstHooksOutput {
  const columns = introspectTable(config.table);
  const columnsToInclude = resolveColumns(columns, config);
  const tenantColumn = config.tenancy?.tenantColumn ?? tenancy?.tenantColumn ?? "tenant_id";
  const userColumns = getUserColumns(columnsToInclude, tenantColumn);
  const tableName = getTableName(config.table);
  const tenantScoped = config.tenancy?.mode === "none"
    ? false
    : columnsToInclude.some((col) => col.name === tenantColumn);
  const pascalName = pascalCase(entityName);
  const camelName = camelCase(entityName);
  const entityType = snakeCase(entityName);

  // Generate INSERT SQL
  const { sql: insertSQL, paramCount: insertParamCount } = generateInsertSQL(tableName, userColumns);

  // Build column extraction for INSERT values
  const columnParams = userColumns
    .map((col, i) => {
      const camelCol = camelCase(col.name);
      return `      const ${camelCol} = input.${camelCol};`;
    })
    .join("\n");

  const paramList = userColumns.map((_, i) => `$${i + 1}`).join(", ");

  const factoryCode = `/**
 * Factory function that creates local-first hooks for ${pascalName}
 * @param pg PGlite instance for local database access
 * @param syncService SyncQueue instance for enqueueing sync operations
 * @returns Local-first hooks for ${pascalName}
 */
export function create${pascalName}LocalHooks(
  pg: PGlite,
  syncService: ISyncQueue
) {
  return {
    /**
     * Create a new ${pascalName} entity
     * Writes to PGlite immediately and enqueues sync operation
     */
    async create(input: Record<string, unknown>, tenantId: string): Promise<{ id: string }> {
      const id = crypto.randomUUID();

      // 1. Build parameter array from input
      const params = [
        ${userColumns.map((col) => `input.${camelCase(col.name)}`).join(",\n        ")}${tenantScoped ? ",\n        tenantId" : ""}
      ];

      // 2. Insert into PGlite immediately (optimistic write)
      await pg.query(\`\${insertSQL}\`, params);

      // 3. Enqueue sync operation for background sync
      await syncService.enqueue({
        entity_type: "${entityType}",
        entityId: id,
        operation: "create",
        data: { ...input, id },
        fastPath: true,
      });

      return { id };
    },

    /**
     * Update an existing ${pascalName} entity
     * Writes to PGlite immediately and enqueues sync operation
     */
    async update(id: string, input: Record<string, unknown>, tenantId: string): Promise<{ id: string }> {
      // 1. Build SET clause for UPDATE
      const updates = [${userColumns
        .map((col, i) => `${snakeCase(col.name)} = $${i + 2}`)
        .join(", ")}];

      // 2. Update in PGlite immediately (optimistic write)
      await pg.query(
        \`UPDATE ${tableName} SET \${updates.join(", ")}, updated_at = CURRENT_TIMESTAMP WHERE id = $1${tenantScoped ? ` AND ${tenantColumn} = ${"$" + (userColumns.length + 2)}` : ""}\`,
        [id, ...${userColumns.map((col) => `input.${camelCase(col.name)}`)}${tenantScoped ? ", tenantId" : ""}]
      );

      // 3. Enqueue sync operation for background sync
      await syncService.enqueue({
        entity_type: "${entityType}",
        entityId: id,
        operation: "update",
        data: { ...input, id },
        fastPath: true,
      });

      return { id };
    },

    /**
     * Delete a ${pascalName} entity
     * Marks for deletion in PGlite and enqueues sync operation
     */
    async delete(id: string, tenantId: string): Promise<void> {
      // 1. Mark as deleted in PGlite (soft delete via sync_status)
      await pg.query(
        \`UPDATE ${tableName} SET sync_status = 'deleted' WHERE id = $1${tenantScoped ? ` AND ${tenantColumn} = $2` : ""}\`,
        [id${tenantScoped ? ", tenantId" : ""}]
      );

      // 2. Enqueue sync operation for background sync
      await syncService.enqueue({
        entity_type: "${entityType}",
        entityId: id,
        operation: "delete",
        data: { id },
        fastPath: true,
      });
    },
  };
}`;

  // Generate the hooks object initialization code (without imports)
  const hooksCode = `{
  create: async (input, tenantId) => {
    const id = crypto.randomUUID();
    const params = [
      ${userColumns.map((col) => `input.${camelCase(col.name)}`).join(",\n      ")}${tenantScoped ? ",\n      tenantId" : ""}
    ];
    await pg.query(\`\${insertSQL}\`, params);
    await syncService.enqueue({
      entity_type: "${entityType}",
      entityId: id,
      operation: "create",
      data: { ...input, id },
      fastPath: true,
    });
    return { id };
  },
  update: async (id, input, tenantId) => {
    const updates = [${userColumns
      .map((col, i) => `${snakeCase(col.name)} = $${i + 2}`)
      .join(", ")}];
    await pg.query(
      \`UPDATE ${tableName} SET \${updates.join(", ")}, updated_at = CURRENT_TIMESTAMP WHERE id = $1${tenantScoped ? ` AND ${tenantColumn} = ${"$" + (userColumns.length + 2)}` : ""}\`,
      [id, ...${userColumns.map((col) => `input.${camelCase(col.name)}`)}${tenantScoped ? ", tenantId" : ""}]
    );
    await syncService.enqueue({
      entity_type: "${entityType}",
      entityId: id,
      operation: "update",
      data: { ...input, id },
      fastPath: true,
    });
    return { id };
  },
  delete: async (id, tenantId) => {
    await pg.query(
      \`UPDATE ${tableName} SET sync_status = 'deleted' WHERE id = $1${tenantScoped ? ` AND ${tenantColumn} = $2` : ""}\`,
      [id${tenantScoped ? ", tenantId" : ""}]
    );
    await syncService.enqueue({
      entity_type: "${entityType}",
      entityId: id,
      operation: "delete",
      data: { id },
      fastPath: true,
    });
  },
}`;

  return {
    name: pascalName,
    hooksCode,
    factoryCode,
  };
}

/**
 * Generate local-first hooks with child entity handling
 * For entities that have children, also generates nested create operations
 */
export function generateLocalFirstHooksWithChildren(
  entityName: string,
  config: EntitySyncConfig,
  allEntities: Record<string, EntitySyncConfig>,
  tenancy?: SyncTenancyConfig
): LocalFirstHooksOutput {
  const graph = buildRelationGraph(allEntities);
  const children = graph[entityName]?.children || [];
  const pascalName = pascalCase(entityName);

  // If no children, generate simple hooks
  if (children.length === 0) {
    return generateLocalFirstHooksFactory(entityName, config, tenancy);
  }

  const columns = introspectTable(config.table);
  const columnsToInclude = resolveColumns(columns, config);
  const tenantColumn = config.tenancy?.tenantColumn ?? tenancy?.tenantColumn ?? "tenant_id";
  const userColumns = getUserColumns(columnsToInclude, tenantColumn);
  const tableName = getTableName(config.table);
  const tenantScoped = config.tenancy?.mode === "none"
    ? false
    : columnsToInclude.some((col) => col.name === tenantColumn);
  const entityType = snakeCase(entityName);

  // Generate INSERT SQL
  const { sql: insertSQL } = generateInsertSQL(tableName, userColumns);

  // Build child create code
  const childCreateCode = children
    .map((child) => {
      const childConfig = allEntities[child];
      if (!childConfig) return "";

      // Skip junction tables
      if (childConfig.metadata?.isJunctionTable === true) {
        return "";
      }

      const relationConfig = config.relations?.children?.find(
        (c) => c.entity === child
      );
      const fkColumn = relationConfig?.foreignKey || `${entityName.replace(/s$/, "")}_id`;
      const camelFkColumn = camelCase(fkColumn);
      const childEntityType = snakeCase(child);

      return `
      // Create ${child} children
      if (input.${child}) {
        for (const childItem of input.${child}) {
          const childId = crypto.randomUUID();
          await pg.query(
            \`INSERT INTO ${childConfig.table && (childConfig.table as { name?: string }).name} (\${Object.keys(childItem).map((k, i) => snakeCase(k)).join(", ")}, ${fkColumn}) VALUES (\${Object.keys(childItem).map((_, i) => "$" + (i + 1)).join(", ")}, \${"$" + (Object.keys(childItem).length + 1)})\`,
            [...Object.values(childItem), parentId]
          );
          await syncService.enqueue({
            entity_type: "${childEntityType}",
            entityId: childId,
            operation: "create",
            data: { ...childItem, id: childId, ${camelFkColumn}: parentId },
            fastPath: true,
          });
        }
      }`;
    })
    .join("\n");

  const factoryCode = `/**
 * Factory function that creates local-first hooks for ${pascalName} with child support
 * @param pg PGlite instance for local database access
 * @param syncService SyncQueue instance for enqueueing sync operations
 * @returns Local-first hooks for ${pascalName} including child entity creation
 */
export function create${pascalName}LocalHooks(
  pg: PGlite,
  syncService: ISyncQueue
) {
  return {
    /**
     * Create a new ${pascalName} entity with children
     * Writes to PGlite immediately and enqueues sync operation for parent and all children
     */
    async create(input: Record<string, unknown> & { ${children.map((c) => `${c}?: Record<string, unknown>[]`).join("; ")} }, tenantId: string): Promise<{ id: string }> {
      const parentId = crypto.randomUUID();

      // 1. Extract and build parent params
      const parentInput = { ...input ${children.map((c) => `, ${c}: undefined`).join("")} };
      const params = [
        ${userColumns.map((col) => `parentInput.${camelCase(col.name)}`).join(",\n        ")}
      ];

      // 2. Insert parent into PGlite immediately (optimistic write)
      await pg.query(\`\${insertSQL}\`, params);

      // 3. Enqueue parent sync operation
      await syncService.enqueue({
        entity_type: "${entityType}",
        entityId: parentId,
        operation: "create",
        data: { ...parentInput, id: parentId },
        fastPath: true,
      });${childCreateCode}

      return { id: parentId };
    },

    /**
     * Update an existing ${pascalName} entity
     */
    async update(id: string, input: Record<string, unknown>, tenantId: string): Promise<{ id: string }> {
      const updates = [${userColumns
        .map((col, i) => `${snakeCase(col.name)} = $${i + 2}`)
        .join(", ")}];

      await pg.query(
        \`UPDATE ${tableName} SET \${updates.join(", ")}, updated_at = CURRENT_TIMESTAMP WHERE id = $1${tenantScoped ? ` AND ${tenantColumn} = ${"$" + (userColumns.length + 2)}` : ""}\`,
        [id, ...${userColumns.map((col) => `input.${camelCase(col.name)}`)}${tenantScoped ? ", tenantId" : ""}]
      );

      await syncService.enqueue({
        entity_type: "${entityType}",
        entityId: id,
        operation: "update",
        data: { ...input, id },
        fastPath: true,
      });

      return { id };
    },

    /**
     * Delete a ${pascalName} entity
     */
    async delete(id: string, tenantId: string): Promise<void> {
      await pg.query(
        \`UPDATE ${tableName} SET sync_status = 'deleted' WHERE id = $1${tenantScoped ? ` AND ${tenantColumn} = $2` : ""}\`,
        [id${tenantScoped ? ", tenantId" : ""}]
      );

      await syncService.enqueue({
        entity_type: "${entityType}",
        entityId: id,
        operation: "delete",
        data: { id },
        fastPath: true,
      });
    },
  };
}`;

  return {
    name: pascalName,
    hooksCode: "", // Not used for complex hooks
    factoryCode,
  };
}

/**
 * Generate all local-first hooks factories for a sync config
 */
export function generateAllLocalFirstHooks(
  entities: Record<string, EntitySyncConfig>,
  tenancy?: SyncTenancyConfig
): Map<string, LocalFirstHooksOutput> {
  const result = new Map<string, LocalFirstHooksOutput>();
  const graph = buildRelationGraph(entities);

  for (const [entityName, config] of Object.entries(entities)) {
    // Skip junction tables
    if (config.metadata?.isJunctionTable === true) {
      continue;
    }

    const hasChildren = (graph[entityName]?.children?.length ?? 0) > 0;

    const output = hasChildren
      ? generateLocalFirstHooksWithChildren(entityName, config, entities, tenancy)
      : generateLocalFirstHooksFactory(entityName, config, tenancy);

    result.set(entityName, output);
  }

  return result;
}

/**
 * Generate a file with all local-first hook factories
 */
export function generateLocalFirstHooksFile(
  hooks: Map<string, LocalFirstHooksOutput>,
  allEntities: Record<string, EntitySyncConfig>
): string {
  // Filter out entities that shouldn't have standalone hooks
  const entityNames = Array.from(hooks.keys()).filter((name) => {
    const config = allEntities[name];
    if (!config) return false;
    // Skip junction tables
    if (config.metadata?.isJunctionTable === true) {
      return false;
    }
    return true;
  });

  const imports = `import type { PGlite } from "@electric-sql/pglite";
import type { ISyncQueue } from "../core/interfaces";`;

  const factories = entityNames
    .map((name) => {
      const hook = hooks.get(name);
      if (!hook) return "";
      return `\n// Factory for ${pascalCase(name)}\n${hook.factoryCode}`;
    })
    .join("\n");

  return `// AUTO-GENERATED FILE - DO NOT EDIT
// Generated by drizzle-sync for local-first offline support

${imports}
${factories}
`;
}
