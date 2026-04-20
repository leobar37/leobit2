import type { PgTable, PgColumn } from "drizzle-orm/pg-core";
import { getTableColumns } from "drizzle-orm";
import type { ColumnMetadata, RelationGraph, RelationNode } from "./types";

/**
 * Introspect a Drizzle table and extract column metadata
 */
export function introspectTable(table: PgTable): ColumnMetadata[] {
  const columns = Object.values(getTableColumns(table)) as PgColumn[];

  return columns.map((col) => {
    const drizzleType = getDrizzleTypeName(col);
    const sqlType = col.getSQLType?.() || "";

    const metadata: ColumnMetadata = {
      name: col.name,
      dataType: mapDrizzleToDataType(col),
      drizzleType,
      notNull: col.notNull,
      hasDefault: col.default !== undefined,
      default: col.default,
      primary: col.primary,
      isEnum: isEnumColumn(col),
      enumValues: getEnumValues(col),
    };

    // Extract precision and scale for decimal/numeric columns
    if (drizzleType === "PgNumeric" || sqlType.includes("numeric") || sqlType.includes("decimal")) {
      const match = sqlType.match(/(\d+),\s*(\d+)/);
      if (match) {
        metadata.precision = parseInt(match[1], 10);
        metadata.scale = parseInt(match[2], 10);
      }
    }

    // Extract length for varchar columns
    if (drizzleType === "PgVarchar" || sqlType.includes("varchar")) {
      const match = sqlType.match(/varchar\((\d+)\)/);
      if (match) {
        metadata.length = parseInt(match[1], 10);
      }
    }

    return metadata;
  });
}

function getDrizzleTypeName(column: PgColumn): string {
  const constructor = column.constructor;
  return constructor.name || "Unknown";
}

function mapDrizzleToDataType(column: PgColumn): ColumnMetadata["dataType"] {
  const columnType = column.getSQLType?.() || "";

  if (columnType.includes("varchar") || columnType.includes("text")) {
    return "string";
  }
  if (columnType.includes("uuid")) {
    return "string";
  }
  if (columnType.includes("integer") || columnType.includes("serial") || columnType.includes("bigint")) {
    return "number";
  }
  if (columnType.includes("boolean")) {
    return "boolean";
  }
  if (columnType.includes("timestamp") || columnType.includes("date")) {
    return "date";
  }
  if (columnType.includes("json") || columnType.includes("jsonb")) {
    return "json";
  }
  // Decimal/numeric columns store as strings to preserve precision
  if (columnType.includes("decimal") || columnType.includes("numeric")) {
    return "string";
  }

  if (isEnumColumn(column)) {
    return "enum";
  }

  return "unknown";
}

function isEnumColumn(column: PgColumn): boolean {
  const col = column as PgColumn & { enumValues?: string[] };
  return col.enumValues !== undefined || column.constructor?.name?.includes("Enum");
}

function getEnumValues(column: PgColumn): string[] | undefined {
  const col = column as PgColumn & { enumValues?: string[] };
  if (col.enumValues) {
    return col.enumValues;
  }
  return undefined;
}

/**
 * Detect relations from a single table
 */
export function detectRelations(table: PgTable) {
  const columns = Object.values(getTableColumns(table)) as PgColumn[];

  const foreignKeys = columns
    .filter((col) => col.name.endsWith("_id") && !col.primary)
    .map((col) => ({
      column: col.name,
      references: inferReferencedTable(col.name),
      isRequired: col.notNull,
    }));

  return {
    foreignKeys,
    children: [] as string[],
  };
}

function inferReferencedTable(columnName: string): string {
  const baseName = columnName.replace("_id", "");

  const pluralMap: Record<string, string> = {
    sale: "sales",
    customer: "customers",
    product: "products",
    user: "users",
    business: "businesses",
    purchase: "purchases",
    supplier: "suppliers",
    order: "orders",
    item: "items",
    variant: "product_variants",
    tag: "tags",
    group: "customer_groups",
  };

  return pluralMap[baseName] || `${baseName}s`;
}

/**
 * Build relation graph across all entities
 */
export function buildRelationGraph(entities: Record<string, { table: PgTable }>): RelationGraph {
  const graph: Record<string, RelationNode> = {};

  for (const [name, config] of Object.entries(entities)) {
    const relations = detectRelations(config.table);
    graph[name] = {
      parents: relations.foreignKeys.map((fk) => fk.references),
      children: [],
      priority: 1,
    };
  }

  for (const [name, node] of Object.entries(graph)) {
    for (const parent of node.parents) {
      if (graph[parent]) {
        graph[parent].children.push(name);
      }
    }
  }

  const priorities = calculatePriorities(graph);
  for (const [name, priority] of Object.entries(priorities)) {
    graph[name].priority = priority;
  }

  return graph;
}

function calculatePriorities(graph: Record<string, RelationNode>): Record<string, number> {
  const priorities: Record<string, number> = {};
  const visited = new Set<string>();
  const visiting = new Set<string>();
  const circularRefs = new Set<string>();

  function visit(name: string, depth: number = 0): number {
    if (visiting.has(name)) {
      circularRefs.add(name);
      return 1;
    }

    if (visited.has(name)) {
      return priorities[name];
    }

    visiting.add(name);

    const node = graph[name];
    let maxParentPriority = 0;

    for (const parent of node.parents) {
      if (graph[parent]) {
        const parentPriority = visit(parent, depth + 1);
        maxParentPriority = Math.max(maxParentPriority, parentPriority);
      }
    }

    priorities[name] = maxParentPriority + 1;

    visiting.delete(name);
    visited.add(name);

    return priorities[name];
  }

  for (const name of Object.keys(graph)) {
    if (!visited.has(name)) {
      visit(name);
    }
  }

  return priorities;
}

/**
 * Resolve which columns to include based on hybrid field config
 */
export function resolveColumns(
  allColumns: ColumnMetadata[],
  config: {
    fields?: string[];
    autoFields?: boolean;
    excludeFields?: string[];
  }
): ColumnMetadata[] {
  if (config.fields) {
    return allColumns.filter((col) => config.fields!.includes(col.name));
  }

  if (config.autoFields && config.excludeFields) {
    return allColumns.filter((col) => !config.excludeFields!.includes(col.name));
  }

  return allColumns;
}
