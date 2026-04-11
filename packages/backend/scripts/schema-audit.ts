/**
 * Schema Audit Script
 * Compara el esquema Drizzle ORM con la base de datos PostgreSQL real
 * y genera un reporte de diferencias.
 *
 * Usage: bun run scripts/schema-audit.ts [--format=json|table] [--output=path]
 */

import postgres from "postgres";
import { config } from "dotenv";
import * as schema from "../src/db/schema/index";
import { getTableColumns, type PgTable } from "drizzle-orm";

config();

// Types
interface DbColumn {
  column_name: string;
  data_type: string;
  is_nullable: string;
  column_default: string | null;
  character_maximum_length: number | null;
  numeric_precision: number | null;
  numeric_scale: number | null;
}

interface SchemaColumn {
  name: string;
  type: string;
  isNullable: boolean;
  default: unknown;
  hasDefault: boolean;
}

interface TableDiff {
  tableName: string;
  existsInDb: boolean;
  existsInSchema: boolean;
  missingInDb: SchemaColumn[];
  missingInSchema: DbColumn[];
  typeMismatches: Array<{
    columnName: string;
    schemaType: string;
    dbType: string;
    schemaNullable: boolean;
    dbNullable: boolean;
  }>;
}

interface AuditReport {
  timestamp: string;
  databaseUrl: string;
  summary: {
    totalSchemaTables: number;
    totalDbTables: number;
    tablesWithIssues: number;
    totalMissingColumns: number;
  };
  tables: TableDiff[];
  sqlFixes: string[];
}

// Colors for terminal output
const colors = {
  reset: "\x1b[0m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  gray: "\x1b[90m",
};

function c(color: keyof typeof colors, text: string): string {
  return `${colors[color]}${text}${colors.reset}`;
}

// Get database columns for a table
async function getDbColumns(
  sql: postgres.Sql,
  tableName: string
): Promise<DbColumn[]> {
  const result = await sql`
    SELECT
      column_name,
      data_type,
      is_nullable,
      column_default,
      character_maximum_length,
      numeric_precision,
      numeric_scale
    FROM information_schema.columns
    WHERE table_name = ${tableName}
      AND table_schema = 'public'
    ORDER BY ordinal_position
  `;
  return result as DbColumn[];
}

// Get all tables from database
async function getDbTables(sql: postgres.Sql): Promise<string[]> {
  const result = await sql`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
    ORDER BY table_name
  `;
  return result.map((r) => r.table_name as string);
}

// Map Drizzle column type to PostgreSQL type
function mapDrizzleTypeToPg(columnType: string, dataType?: string): string {
  const typeStr = columnType.toLowerCase();

  // Handle varchar/text with length
  if (typeStr.startsWith("varchar")) {
    const match = typeStr.match(/varchar\((\d+)\)/);
    if (match) {
      return `character varying(${match[1]})`;
    }
    return "character varying";
  }

  // Map common types
  const typeMap: Record<string, string> = {
    text: "text",
    uuid: "uuid",
    integer: "integer",
    boolean: "boolean",
    timestamp: "timestamp with time zone",
    "timestamp with time zone": "timestamp with time zone",
    date: "date",
    jsonb: "jsonb",
    json: "jsonb",
    decimal: "numeric",
    numeric: "numeric",
    pgvarchar: "character varying",
    pgtext: "text",
    pginteger: "integer",
    pgboolean: "boolean",
    pgtimestamp: "timestamp with time zone",
    pgdate: "date",
    pgjsonb: "jsonb",
    pgjson: "jsonb",
    pgdecimal: "numeric",
    pgnumeric: "numeric",
  };

  for (const [key, value] of Object.entries(typeMap)) {
    if (typeStr.includes(key)) {
      // For decimal/numeric with precision/scale
      if (key === "decimal" || key === "numeric" || key === "pgdecimal" || key === "pgnumeric") {
        const match = typeStr.match(/\((\d+),\s*(\d+)\)/);
        if (match) {
          return `numeric(${match[1]},${match[2]})`;
        }
        return "numeric";
      }
      return value;
    }
  }

  return typeStr;
}

// Normalize types for comparison
function normalizeType(type: string): string {
  return type
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/character varying/g, "varchar")
    .replace(/timestamp with time zone/g, "timestamptz")
    .replace(/timestamp without time zone/g, "timestamp")
    .replace(/numeric/g, "decimal")
    .trim();
}

// Check if types are compatible
function areTypesCompatible(schemaType: string, dbType: string): boolean {
  const normalizedSchema = normalizeType(schemaType);
  const normalizedDb = normalizeType(dbType);

  // Exact match
  if (normalizedSchema === normalizedDb) return true;

  // Handle varchar variations
  if (normalizedSchema.startsWith("varchar") && normalizedDb.startsWith("varchar")) {
    return true;
  }

  // Handle timestamp variations
  if (normalizedSchema.includes("timestamp") && normalizedDb.includes("timestamp")) {
    return true;
  }

  // Handle decimal/numeric equivalence
  if (
    (normalizedSchema.includes("decimal") || normalizedSchema.includes("numeric")) &&
    (normalizedDb.includes("decimal") || normalizedDb.includes("numeric"))
  ) {
    return true;
  }

  // Handle user-defined types (enums)
  if (normalizedDb === "user-defined") {
    return true; // We can't easily compare enum definitions
  }

  return false;
}

// Check if value is a Drizzle column
function isPgColumn(value: unknown): value is { name: string; columnType: string; notNull: boolean; default: unknown; hasDefault: boolean } {
  return value !== null &&
    typeof value === "object" &&
    "name" in value &&
    "columnType" in value;
}

// Extract columns from Drizzle table using getTableColumns
function getSchemaColumns(table: PgTable): SchemaColumn[] {
  const columns: SchemaColumn[] = [];
  const tableColumns = getTableColumns(table);

  for (const column of Object.values(tableColumns)) {
    if (isPgColumn(column)) {
      columns.push({
        name: column.name,
        type: mapDrizzleTypeToPg(column.columnType, (column as any).config?.dataType),
        isNullable: !column.notNull,
        default: column.default,
        hasDefault: column.hasDefault,
      });
    }
  }

  return columns;
}

// Compare schema table with database table
async function compareTable(
  sql: postgres.Sql,
  tableName: string,
  schemaTable?: PgTable
): Promise<TableDiff> {
  const dbColumns = await getDbColumns(sql, tableName);
  const schemaColumns = schemaTable ? getSchemaColumns(schemaTable) : [];

  const missingInDb: SchemaColumn[] = [];
  const missingInSchema: DbColumn[] = [];
  const typeMismatches: TableDiff["typeMismatches"] = [];

  // Find columns missing in DB
  for (const schemaCol of schemaColumns) {
    const dbCol = dbColumns.find((c) => c.column_name === schemaCol.name);
    if (!dbCol) {
      missingInDb.push(schemaCol);
    } else {
      // Check for type mismatches
      const typesMatch = areTypesCompatible(schemaCol.type, dbCol.data_type);
      const nullableMatch =
        schemaCol.isNullable === (dbCol.is_nullable === "YES");

      if (!typesMatch || !nullableMatch) {
        typeMismatches.push({
          columnName: schemaCol.name,
          schemaType: schemaCol.type,
          dbType: dbCol.data_type,
          schemaNullable: schemaCol.isNullable,
          dbNullable: dbCol.is_nullable === "YES",
        });
      }
    }
  }

  // Find columns missing in schema (extra columns in DB)
  for (const dbCol of dbColumns) {
    const schemaCol = schemaColumns.find((c) => c.name === dbCol.column_name);
    if (!schemaCol) {
      missingInSchema.push(dbCol);
    }
  }

  return {
    tableName,
    existsInDb: dbColumns.length > 0,
    existsInSchema: schemaColumns.length > 0,
    missingInDb,
    missingInSchema,
    typeMismatches,
  };
}

// Generate SQL to add missing column
function generateAddColumnSql(tableName: string, column: SchemaColumn): string {
  const typeMapping: Record<string, string> = {
    varchar: "VARCHAR",
    text: "TEXT",
    uuid: "UUID",
    integer: "INTEGER",
    boolean: "BOOLEAN",
    timestamp: "TIMESTAMP WITH TIME ZONE",
    timestamptz: "TIMESTAMP WITH TIME ZONE",
    date: "DATE",
    jsonb: "JSONB",
    decimal: "DECIMAL",
    numeric: "NUMERIC",
  };

  let pgType = column.type;

  // Try to normalize the type
  for (const [key, value] of Object.entries(typeMapping)) {
    if (normalizeType(column.type).includes(key)) {
      pgType = value;
      break;
    }
  }

  // Handle varchar with length
  if (column.type.toLowerCase().includes("varchar")) {
    const match = column.type.match(/\((\d+)\)/);
    if (match) {
      pgType = `VARCHAR(${match[1]})`;
    }
  }

  // Handle decimal/numeric with precision
  if (column.type.toLowerCase().includes("decimal") || column.type.toLowerCase().includes("numeric")) {
    const match = column.type.match(/\((\d+),\s*(\d+)\)/);
    if (match) {
      pgType = `NUMERIC(${match[1]}, ${match[2]})`;
    }
  }

  const nullable = column.isNullable ? "" : " NOT NULL";
  const defaultValue = column.hasDefault && column.default !== undefined
    ? ` DEFAULT ${typeof column.default === "string" ? `'${column.default}'` : column.default}`
    : "";

  return `ALTER TABLE "${tableName}" ADD COLUMN IF NOT EXISTS "${column.name}" ${pgType}${nullable}${defaultValue};`;
}

// Main audit function
async function runAudit(): Promise<AuditReport> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL environment variable is not set");
  }

  console.log(c("cyan", "🔍 Schema Audit Starting...\n"));
  console.log(c("gray", `Database: ${databaseUrl.replace(/:[^:@]+@/, ":****@")}\n`));

  const sql = postgres(databaseUrl, {
    ssl: true,
    prepare: false,
  });

  try {
    // Get all schema tables
    const schemaTables = new Map<string, PgTable>();
    for (const [name, table] of Object.entries(schema)) {
      if (!table || typeof table !== "object") continue;

      // Skip types, relations, and enums
      if (name.startsWith("type") || name.startsWith("New") || name.endsWith("Relations")) continue;

      // Check for columns - look for objects with 'columnType' property
      const entries = Object.entries(table as Record<string, unknown>);
      const hasColumns = entries.some(([_, v]) =>
        v && typeof v === "object" && "columnType" in v
      );

      if (hasColumns) {
        // Get table name from Symbol(drizzle:Name)
        const symbols = Object.getOwnPropertySymbols(table);
        let tableName = name;
        for (const sym of symbols) {
          if (sym.toString() === "Symbol(drizzle:Name)") {
            tableName = (table as Record<symbol, string>)[sym];
            break;
          }
        }
        schemaTables.set(tableName, table as PgTable);
      }
    }

    // Get all database tables
    const dbTables = await getDbTables(sql);

    console.log(c("blue", `📦 Schema tables: ${schemaTables.size}`));
    console.log(c("blue", `🗄️  Database tables: ${dbTables.length}\n`));

    // Compare all tables
    const tableDiffs: TableDiff[] = [];
    const allTableNames = new Set([...schemaTables.keys(), ...dbTables]);

    for (const tableName of allTableNames) {
      const schemaTable = schemaTables.get(tableName);
      const diff = await compareTable(sql, tableName, schemaTable);
      tableDiffs.push(diff);
    }

    // Generate SQL fixes
    const sqlFixes: string[] = [];
    for (const diff of tableDiffs) {
      for (const missingCol of diff.missingInDb) {
        sqlFixes.push(generateAddColumnSql(diff.tableName, missingCol));
      }
    }

    // Build report
    const report: AuditReport = {
      timestamp: new Date().toISOString(),
      databaseUrl: databaseUrl.replace(/:[^:@]+@/, ":****@"),
      summary: {
        totalSchemaTables: schemaTables.size,
        totalDbTables: dbTables.length,
        tablesWithIssues: tableDiffs.filter(
          (d) => d.missingInDb.length > 0 || d.missingInSchema.length > 0 || d.typeMismatches.length > 0
        ).length,
        totalMissingColumns: tableDiffs.reduce((sum, d) => sum + d.missingInDb.length, 0),
      },
      tables: tableDiffs,
      sqlFixes,
    };

    return report;
  } finally {
    await sql.end();
  }
}

// Print table report
function printTableReport(report: AuditReport): void {
  console.log(c("cyan", "\n" + "=".repeat(80)));
  console.log(c("cyan", "SCHEMA AUDIT REPORT"));
  console.log(c("cyan", "=".repeat(80) + "\n"));

  console.log(c("blue", "📊 Summary:"));
  console.log(`  • Schema tables: ${report.summary.totalSchemaTables}`);
  console.log(`  • Database tables: ${report.summary.totalDbTables}`);
  console.log(`  • Tables with issues: ${report.summary.tablesWithIssues}`);
  console.log(`  • Missing columns: ${report.summary.totalMissingColumns}\n`);

  // Show critical issues (missing columns in DB)
  const criticalTables = report.tables.filter((t) => t.missingInDb.length > 0);
  if (criticalTables.length > 0) {
    console.log(c("red", "🚨 CRITICAL: Columns missing in database (will break queries):\n"));
    for (const diff of criticalTables) {
      console.log(c("yellow", `  Table: ${diff.tableName}`));
      for (const col of diff.missingInDb) {
        console.log(c("red", `    ❌ ${col.name}: ${col.type}${col.isNullable ? "" : " NOT NULL"}`));
      }
      console.log();
    }
  }

  // Show type mismatches
  const mismatchTables = report.tables.filter((t) => t.typeMismatches.length > 0);
  if (mismatchTables.length > 0) {
    console.log(c("yellow", "⚠️  TYPE MISMATCHES:\n"));
    for (const diff of mismatchTables) {
      console.log(c("yellow", `  Table: ${diff.tableName}`));
      for (const mismatch of diff.typeMismatches) {
        console.log(
          c("yellow", `    ⚠️  ${mismatch.columnName}:`) +
            ` schema=${mismatch.schemaType}, db=${mismatch.dbType}`
        );
      }
      console.log();
    }
  }

  // Show extra columns in DB
  const extraTables = report.tables.filter((t) => t.missingInSchema.length > 0);
  if (extraTables.length > 0) {
    console.log(c("gray", "ℹ️  Extra columns in database (not in schema):\n"));
    for (const diff of extraTables) {
      console.log(c("gray", `  Table: ${diff.tableName}`));
      for (const col of diff.missingInSchema) {
        console.log(c("gray", `    ℹ️  ${col.column_name}: ${col.data_type}`));
      }
      console.log();
    }
  }

  // Show SQL fixes
  if (report.sqlFixes.length > 0) {
    console.log(c("green", "🔧 SQL FIXES (ready to apply):\n"));
    for (const sql of report.sqlFixes) {
      console.log(c("cyan", sql));
    }
  }

  // Show tables that don't exist in DB at all
  const missingTables = report.tables.filter((t) => !t.existsInDb && t.existsInSchema);
  if (missingTables.length > 0) {
    console.log(c("red", "\n📋 TABLES MISSING IN DATABASE:\n"));
    for (const diff of missingTables) {
      console.log(c("red", `  ❌ ${diff.tableName}`));
    }
  }

  console.log(c("cyan", "\n" + "=".repeat(80)));
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  const format = args.find((a) => a.startsWith("--format="))?.split("=")[1] || "table";
  const outputPath = args.find((a) => a.startsWith("--output="))?.split("=")[1];

  try {
    const report = await runAudit();

    if (format === "json") {
      const jsonOutput = JSON.stringify(report, null, 2);
      if (outputPath) {
        await Bun.write(outputPath, jsonOutput);
        console.log(c("green", `✅ Report saved to: ${outputPath}`));
      } else {
        console.log(jsonOutput);
      }
    } else {
      printTableReport(report);

      if (outputPath) {
        await Bun.write(outputPath, JSON.stringify(report, null, 2));
        console.log(c("green", `\n✅ Full JSON report saved to: ${outputPath}`));
      }
    }

    // Exit with error code if there are critical issues
    if (report.summary.totalMissingColumns > 0) {
      process.exit(1);
    }
  } catch (error) {
    console.error(c("red", "\n❌ Audit failed:"), error);
    process.exit(1);
  }
}

main();
