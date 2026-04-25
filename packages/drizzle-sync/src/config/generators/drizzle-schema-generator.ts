import { CodeBuilder } from "./code-builder";
import type { SerializedEntity, SerializedColumn } from "../../config/schema-types";
import type { ColumnMetadata } from "../../config/types";
import { getColumnsToInclude, isSerializedEntity, type GeneratorEntity } from "./schema-adapter";
import { pascalCase, camelCase } from "../../utils/string-utils";

interface GeneratedEnum {
  name: string;
  values: string[];
}

function snakeToUpperSnake(value: string): string {
  return value.toUpperCase().replace(/-/g, "_");
}

function extractEnums(entity: GeneratorEntity): GeneratedEnum[] {
  const columns = getColumnsToInclude(entity);
  const enums: GeneratedEnum[] = [];
  const seen = new Set<string>();

  for (const col of columns) {
    if (col.isEnum && col.enumValues && col.enumValues.length > 0) {
      const enumName = pascalCase(col.name);
      if (!seen.has(enumName)) {
        seen.add(enumName);
        enums.push({
          name: enumName,
          values: col.enumValues,
        });
      }
    }
  }

  return enums;
}

function mapDrizzleType(col: SerializedColumn): string {
  const { drizzleType } = col;

  switch (drizzleType) {
    case "PgUUID":
      return "uuid";
    case "PgVarchar":
      return col.length ? `varchar({ length: ${col.length} })` : "varchar";
    case "PgText":
      return "text";
    case "PgInteger":
    case "PgSerial":
    case "PgBigInt":
      return "integer";
    case "PgBoolean":
      return "boolean";
    case "PgTimestamp":
    case "PgTimestampTz":
      return "timestamp";
    case "PgDate":
      return "date";
    case "PgJsonb":
      return "jsonb";
    case "PgNumeric":
      if (col.precision !== undefined && col.scale !== undefined) {
        return `decimal({ precision: ${col.precision}, scale: ${col.scale} })`;
      }
      return "decimal";
    case "PgEnumColumn":
      return "text";
    default:
      if (col.dataType === "enum") return "text";
      if (col.dataType === "string") return "text";
      if (col.dataType === "number") return "integer";
      if (col.dataType === "boolean") return "boolean";
      if (col.dataType === "date") return "timestamp";
      if (col.dataType === "json") return "jsonb";
      return "text";
  }
}

function formatDefaultValue(
  col: SerializedColumn,
  enumName?: string
): string | null {
  if (!col.hasDefault || col.default === undefined || col.default === null) {
    return null;
  }

  // Handle serialized SQL defaults
  if (
    typeof col.default === "object" &&
    col.default !== null &&
    "__type" in col.default &&
    (col.default as any).__type === "sql"
  ) {
    const sqlValue = (col.default as any).value as string;
    if (sqlValue.includes("gen_random_uuid") || sqlValue.includes("uuid_generate")) {
      return ".defaultRandom()";
    }
    if (sqlValue.includes("now") || sqlValue.includes("current_timestamp")) {
      return ".defaultNow()";
    }
    return null;
  }

  // Handle Drizzle SQL functions (raw objects)
  if (typeof col.default === "object" && col.default !== null) {
    if ("queryChunks" in col.default) {
      const sqlObj = col.default as { queryChunks: Array<{ value: string[] }> };
      if (sqlObj.queryChunks?.[0]?.value?.[0]) {
        const sqlText = sqlObj.queryChunks[0].value[0];
        if (sqlText.includes("gen_random_uuid") || sqlText.includes("uuid_generate")) {
          return ".defaultRandom()";
        }
        if (sqlText.includes("now") || sqlText.includes("current_timestamp")) {
          return ".defaultNow()";
        }
      }
    }
    return null;
  }

  // Handle enum defaults
  if (col.isEnum && col.enumValues && col.default) {
    const defaultValue = String(col.default);
    const enumKey = snakeToUpperSnake(defaultValue);
    if (enumName && col.enumValues.includes(defaultValue)) {
      return `.default(${enumName}.${enumKey})`;
    }
    return `.default("${defaultValue}")`;
  }

  // Handle string defaults
  if (typeof col.default === "string") {
    return `.default("${col.default}")`;
  }

  // Handle numeric defaults
  if (typeof col.default === "number") {
    return `.default(${col.default})`;
  }

  // Handle boolean defaults
  if (typeof col.default === "boolean") {
    return `.default(${col.default})`;
  }

  return null;
}

function generateColumnDefinition(col: SerializedColumn): string {
  const typeFn = mapDrizzleType(col);
  const enumName = col.isEnum ? pascalCase(col.name) : undefined;
  
  let chain = `${typeFn}("${col.name}")`;

  // Add primary key
  if (col.primary) {
    chain += ".primaryKey()";
  }

  // Add notNull
  if (col.notNull) {
    chain += ".notNull()";
  }

  // Add default
  const defaultValue = formatDefaultValue(col, enumName);
  if (defaultValue) {
    chain += defaultValue;
  }

  return chain;
}

function generateTableDefinition(entity: SerializedEntity): string {
  const b = new CodeBuilder();
  const tableName = entity.tableName;
  const camelName = camelCase(tableName);

  b.line(`export const ${camelName} = pgTable(`);
  b.indent((ib) => {
    ib.line(`"${tableName}",`);
    ib.line("{");
    ib.indent((iib) => {
      for (const col of entity.columns) {
        const colDef = generateColumnDefinition(col);
        iib.line(`${camelCase(col.name)}: ${colDef},`);
      }
    });
    ib.line("},");
    ib.line("(table) => [");
    ib.indent((iib) => {
      // Generate indexes for sync_status, business_id, and FK columns
      const indexedColumns = new Set<string>();
      
      // Index on sync_status
      if (entity.columns.find((c) => c.name === "sync_status")) {
        iib.line(`index("idx_${tableName}_sync_status").on(table.syncStatus),`);
        indexedColumns.add("sync_status");
      }
      
      // Index on tenant/business_id
      if (entity.columns.find((c) => c.name === "business_id")) {
        iib.line(`index("idx_${tableName}_business_id").on(table.businessId),`);
        indexedColumns.add("business_id");
      }
      
      // Index on other _id columns (FKs)
      for (const col of entity.columns) {
        if (col.name.endsWith("_id") && !col.primary && !indexedColumns.has(col.name)) {
          iib.line(`index("idx_${tableName}_${col.name}").on(table.${camelCase(col.name)}),`);
          indexedColumns.add(col.name);
        }
      }
    });
    ib.line("]");
  });
  b.line(");");

  return b.toString();
}

export function generateDrizzleSchema(
  entityName: string,
  entity: GeneratorEntity
): { enums: GeneratedEnum[]; tableCode: string; typesCode: string } {
  if (!isSerializedEntity(entity)) {
    throw new Error("generateDrizzleSchema requires a SerializedEntity");
  }

  const enums = extractEnums(entity);
  const tableCode = generateTableDefinition(entity);
  
  // Generate types
  const camelName = camelCase(entity.tableName);
  const pascalName = pascalCase(entityName);
  const typesCode = `export type ${pascalName} = typeof ${camelName}.$inferSelect;\nexport type New${pascalName} = typeof ${camelName}.$inferInsert;`;

  return { enums, tableCode, typesCode };
}

export function generateDrizzleSchemaFile(
  entityNames: string[],
  entities: Record<string, SerializedEntity>
): string {
  const b = new CodeBuilder();

  // Header
  b.line("// AUTO-GENERATED FILE - DO NOT EDIT");
  b.line("// Generated by drizzle-sync from backend schema");
  b.line("// Drizzle ORM schema for PGlite (frontend)");
  b.blank();

  // Imports
  b.line('import {');
  b.indent((ib) => {
    ib.line("pgTable,");
    ib.line("text,");
    ib.line("varchar,");
    ib.line("uuid,");
    ib.line("integer,");
    ib.line("timestamp,");
    ib.line("decimal,");
    ib.line("boolean,");
    ib.line("date,");
    ib.line("jsonb,");
    ib.line("index,");
  });
  b.line('} from "drizzle-orm/pg-core";');
  b.blank();

  // Collect all enums first to avoid duplicates
  const allEnums = new Map<string, GeneratedEnum>();
  for (const name of entityNames) {
    const entity = entities[name];
    if (!entity) continue;
    const { enums } = generateDrizzleSchema(name, entity);
    for (const enumDef of enums) {
      if (!allEnums.has(enumDef.name)) {
        allEnums.set(enumDef.name, enumDef);
      }
    }
  }

  // Generate enums
  if (allEnums.size > 0) {
    b.line("// Enums");
    for (const [enumName, enumDef] of allEnums) {
      b.line(`export const ${enumName} = {`);
      b.indent((ib) => {
        for (const value of enumDef.values) {
          const key = snakeToUpperSnake(value);
          ib.line(`${key}: "${value}",`);
        }
      });
      b.line("} as const;");
      b.blank();
    }
  }

  // Generate tables
  b.line("// Tables");
  b.blank();

  for (const name of entityNames) {
    const entity = entities[name];
    if (!entity) continue;
    const { tableCode } = generateDrizzleSchema(name, entity);
    b.linesFrom(tableCode.split("\n"));
    b.blank();
  }

  // Generate types
  b.line("// Types");
  b.blank();

  for (const name of entityNames) {
    const entity = entities[name];
    if (!entity) continue;
    const camelName = camelCase(entity.tableName);
    const pascalName = pascalCase(name);
    b.line(`export type ${pascalName} = typeof ${camelName}.$inferSelect;`);
    b.line(`export type New${pascalName} = typeof ${camelName}.$inferInsert;`);
  }

  return b.toString();
}
