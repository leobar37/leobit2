import type { ColumnMetadata, EntitySyncConfig } from "../../config/types";
import { introspectTable, resolveColumns } from "../../config/introspect";

export interface PostgreSQLDDLOutput {
  tableName: string;
  createTable: string;
  indexes: string[];
}

/**
 * Generate PostgreSQL-compatible DDL for PGlite
 * 
 * Maps Drizzle types to PostgreSQL types:
 * - uuid -> UUID
 * - varchar -> VARCHAR(length)
 * - text -> TEXT
 * - integer/serial/bigint -> INTEGER
 * - boolean -> BOOLEAN
 * - timestamp/date -> TIMESTAMP
 * - json/jsonb -> JSONB
 * - decimal -> DECIMAL(precision, scale)
 * - enum -> TEXT (PGlite uses text for enums)
 */
export function generatePostgreSQLDDL(
  entityName: string,
  config: EntitySyncConfig
): PostgreSQLDDLOutput {
  const tableName = entityName;
  const columns = introspectTable(config.table);
  const columnsToInclude = resolveColumns(columns, config);

  const columnDefs: string[] = [];

  for (const col of columnsToInclude) {
    const def = columnToPostgresDef(col);
    columnDefs.push(`  ${def}`);
  }

  // Auto-inject sync_status if not present in source table
  if (!columnsToInclude.find((c) => c.name === "sync_status")) {
    columnDefs.push(`  sync_status TEXT NOT NULL DEFAULT 'pending'`);
  }

  // Auto-inject sync_attempts if not present in source table
  if (!columnsToInclude.find((c) => c.name === "sync_attempts")) {
    columnDefs.push(`  sync_attempts INTEGER NOT NULL DEFAULT 0`);
  }

  const primaryKeys = columnsToInclude.filter((c) => c.primary).map((c) => c.name);

  if (primaryKeys.length > 0) {
    columnDefs.push(`  PRIMARY KEY (${primaryKeys.map((pk) => `"${pk}"`).join(", ")})`);
  }

  const createTable = `CREATE TABLE IF NOT EXISTS "${tableName}" (\n${columnDefs.join(",\n")}\n);`;

  const indexes = generatePostgresIndexes(tableName, columnsToInclude);

  return {
    tableName,
    createTable,
    indexes,
  };
}

function columnToPostgresDef(col: ColumnMetadata): string {
  const pgType = mapToPostgresType(col);
  const nullable = col.notNull ? "NOT NULL" : "";
  const defaultVal = col.default !== undefined ? `DEFAULT ${formatPostgresDefault(col.default, col.dataType)}` : "";

  const parts = [`"${col.name}"`, pgType, nullable, defaultVal].filter(Boolean).join(" ");

  return parts;
}

function mapToPostgresType(col: ColumnMetadata): string {
  // Use drizzleType to determine the exact PostgreSQL type
  // drizzleType is like "PgUUID", "PgVarchar", "PgText", etc.
  const drizzleType = col.drizzleType;

  // Handle different Drizzle column types (case-sensitive since drizzleType is like "PgUUID")
  if (drizzleType === "PgUUID") {
    return "UUID";
  }

  if (drizzleType === "PgVarchar") {
    // Use length from column metadata if available
    if (col.length !== undefined) {
      return `VARCHAR(${col.length})`;
    }
    return "VARCHAR(255)";
  }

  if (drizzleType === "PgText") {
    return "TEXT";
  }

  if (drizzleType === "PgInteger" || drizzleType === "PgSerial" || drizzleType === "PgBigInt") {
    return "INTEGER";
  }

  if (drizzleType === "PgBoolean") {
    return "BOOLEAN";
  }

  if (drizzleType === "PgTimestamp" || drizzleType === "PgTimestampTz") {
    return "TIMESTAMP";
  }

  if (drizzleType === "PgDate") {
    return "DATE";
  }

  if (drizzleType === "PgJsonb") {
    return "JSONB";
  }

  if (drizzleType === "PgNumeric") {
    // Numeric is used for DECIMAL - use precision/scale from column metadata if available
    if (col.precision !== undefined && col.scale !== undefined) {
      return `DECIMAL(${col.precision}, ${col.scale})`;
    }
    return "DECIMAL(12, 2)";
  }

  // Fallback based on dataType
  switch (col.dataType) {
    case "string":
      return "TEXT";
    case "number":
      return "INTEGER";
    case "boolean":
      return "BOOLEAN";
    case "date":
      return "TIMESTAMP";
    case "json":
      return "JSONB";
    case "enum":
      return "TEXT";
    default:
      return "TEXT";
  }
}

function formatPostgresDefault(value: unknown, dataType: ColumnMetadata["dataType"]): string {
  if (value === null) return "NULL";
  if (typeof value === "boolean") return value ? "TRUE" : "FALSE";
  if (typeof value === "number") return String(value);
  if (typeof value === "string") return `'${value.replace(/'/g, "''")}'`;

  // Handle Drizzle SQL functions like gen_random_uuid() and now()
  if (value && typeof value === "object" && "queryChunks" in value) {
    // This is a Drizzle SQL function - extract the SQL text
    const sqlObj = value as { queryChunks: Array<{ value: string[] }> };
    if (sqlObj.queryChunks && sqlObj.queryChunks.length > 0) {
      const chunk = sqlObj.queryChunks[0];
      if (chunk.value && chunk.value.length > 0) {
        return chunk.value[0];
      }
    }
  }

  return "NULL";
}

function generatePostgresIndexes(tableName: string, columns: ColumnMetadata[]): string[] {
  const indexes: string[] = [];
  const indexedColumns = new Set<string>();

  // Index on sync_status
  indexes.push(`CREATE INDEX IF NOT EXISTS "idx_${tableName}_sync_status" ON "${tableName}"(sync_status);`);
  indexedColumns.add("sync_status");

  // Index on business_id
  if (columns.find((c) => c.name === "business_id")) {
    indexes.push(`CREATE INDEX IF NOT EXISTS "idx_${tableName}_business_id" ON "${tableName}"(business_id);`);
    indexedColumns.add("business_id");
  }

  // Indexes on FK columns (columns ending with _id that are not primary keys and not already indexed)
  const fkColumns = columns.filter((c) => c.name.endsWith("_id") && !c.primary && !indexedColumns.has(c.name));
  for (const col of fkColumns) {
    indexes.push(`CREATE INDEX IF NOT EXISTS "idx_${tableName}_${col.name}" ON "${tableName}"("${col.name}");`);
  }

  return indexes;
}

export function generatePostgreSQLDDLFile(outputs: PostgreSQLDDLOutput[]): string {
  const lines: string[] = [
    "-- AUTO-GENERATED FILE - DO NOT EDIT",
    "-- Generated by drizzle-sync from backend schema",
    "-- PostgreSQL-compatible DDL for PGlite",
    "",
  ];

  for (const output of outputs) {
    lines.push(output.createTable);
    lines.push("");
    for (const idx of output.indexes) {
      lines.push(idx);
    }
    lines.push("");
  }

  return lines.join("\n");
}
