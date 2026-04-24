import type { SerializedEntity } from "../../config/schema-types";
import { CodeBuilder } from "./code-builder";

export interface SchemaExportEntry {
  name: string;
  camelCaseName: string;
}

export function generateDrizzleSchemaFile(
  entityNames: string[],
  entities: Record<string, SerializedEntity>
): string {
  const b = new CodeBuilder();
  
  b.line("/**");
  b.line(" * Drizzle Schema - Centralized table exports for frontend services");
  b.line(" * Re-exports all Drizzle table objects from @avileo/shared");
  b.line(" * This file is the single source of truth for schema access in the frontend");
  b.line(" * AUTO-GENERATED FILE - DO NOT EDIT");
  b.line(" */");
  b.blank();

  // Collect table names
  const tableExports: string[] = [];

  for (const name of entityNames) {
    const entity = entities[name];
    if (!entity) continue;

    // Table export (camelCase name)
    const camelCaseName = toCamelCase(entity.tableName);
    tableExports.push(camelCaseName);
  }

  // Export tables
  if (tableExports.length > 0) {
    b.line("export {");
    b.indent((ib) => {
      ib.line("// Tables");
      for (const tableName of tableExports) {
        ib.line(`${tableName},`);
      }
    });
    b.line("} from \"@avileo/shared\";");
    b.blank();
  }

  return b.toString();
}

function toCamelCase(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}
