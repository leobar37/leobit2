import { writeFileSync, mkdirSync, existsSync } from "fs";
import type { SyncConfig } from "./types";
import { introspectTable, buildRelationGraph } from "./introspect";
import { generateZodSchema, generateZodSchemasFile } from "./generators/zod-generator";
import { generatePostgreSQLDDL, generatePostgreSQLDDLFile } from "./generators/postgres-ddl-generator";
import { generateApplierConfig, mergeApplierConfigs, generateApplierFile } from "./generators/applier-generator";
import { generateHooks, generateHooksFile } from "./generators/hooks-generator";
import { generateService, generateServicesFile } from "./generators/service-generator";
import { generateSchemaSQLFile } from "./generators/schema-sql-generator";
import { generateTableRegistry, generateTableRegistryFile } from "./generators/table-registry-generator";
import { generateQueryKeysFile } from "./generators/query-keys-generator";
import { generateEngineFactoryFile } from "./generators/engine-factory-generator";
import type { SerializedEntity, SyncSchema } from "./schema-types";
import { CodeBuilder, formatGeneratedCode } from "./generators/code-builder";

export interface GenerationResult {
  files: string[];
  changes: string[];
}

export interface GenerationOptions {
  outputDir: string;
}

type GenerationInput = SyncConfig | SyncSchema;

function isSyncSchema(config: GenerationInput): config is SyncSchema {
  return (
    "version" in config &&
    "generatedAt" in config &&
    typeof config.version === "string" &&
    typeof config.generatedAt === "string"
  );
}

function toEntityMap(config: GenerationInput): Record<string, SyncConfig["entities"][string] | SerializedEntity> {
  if (isSyncSchema(config)) {
    return config.entities;
  }

  return config.entities;
}

function getApplyOrder(
  config: GenerationInput,
  entityNames: string[],
  entities: Record<string, SyncConfig["entities"][string] | SerializedEntity>
): string[] {
  if (isSyncSchema(config)) {
    return [...entityNames].sort(
      (a, b) => (entities[a] as SerializedEntity).graph.priority - (entities[b] as SerializedEntity).graph.priority
    );
  }

  const graph = buildRelationGraph(
    Object.fromEntries(
      Object.entries(config.entities).map(([name, entity]) => [name, { table: entity.table }])
    )
  );

  return [...entityNames].sort((a, b) => graph[a].priority - graph[b].priority);
}

export async function generateAll(
  config: GenerationInput,
  options: GenerationOptions
): Promise<GenerationResult> {
  const outputDir = options.outputDir;

  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }

  const files: string[] = [];
  const changes: string[] = [];

  const entities = toEntityMap(config);
  const entityNames = Object.keys(entities);
  const tenancy = isSyncSchema(config) ? config.tenancy : config.tenancy;

  // 1. Generate Zod schemas
  const zodSchemas = entityNames.map((name) =>
    generateZodSchema(name, entities[name])
  );
  const zodPath = `${outputDir}/schemas.ts`;
  const zodFile = generateZodSchemasFile(zodSchemas);
  writeFileSync(zodPath, await formatGeneratedCode(zodFile, zodPath));
  files.push(`${outputDir}/schemas.ts`);

  // 2. Generate DDL (PostgreSQL for PGlite)
  const ddlOutputs = entityNames.map((name) => generatePostgreSQLDDL(name, entities[name], tenancy));
  const infraTenantColumn = tenancy?.tenantColumn ?? "tenant_id";
  const ddlFile = generatePostgreSQLDDLFile(ddlOutputs, infraTenantColumn);
  writeFileSync(`${outputDir}/init.sql`, ddlFile);
  files.push(`${outputDir}/init.sql`);

  // 2b. Generate schema SQL as TypeScript string (replaces init.sql import)
  const schemaSqlPath = `${outputDir}/schema-sql.ts`;
  const schemaSqlFile = generateSchemaSQLFile(ddlFile);
  writeFileSync(schemaSqlPath, await formatGeneratedCode(schemaSqlFile, schemaSqlPath));
  files.push(`${outputDir}/schema-sql.ts`);

  // 3. Generate applier config
  const applierConfigs = entityNames.map((name) =>
    generateApplierConfig(name, entities[name])
  );
  const mergedApplier = mergeApplierConfigs(applierConfigs);

  // Get apply order from graph
  const applyOrder = getApplyOrder(config, entityNames, entities);

  const applierPath = `${outputDir}/applier.ts`;
  const applierFile = generateApplierFile(mergedApplier, applyOrder);
  writeFileSync(applierPath, await formatGeneratedCode(applierFile, applierPath));
  files.push(`${outputDir}/applier.ts`);

  // 4. Generate hooks
  const hooks = new Map<string, ReturnType<typeof generateHooks>>();
  for (const name of entityNames) {
    hooks.set(name, generateHooks(name, entities[name], entities));
  }
  const hooksPath = `${outputDir}/hooks.ts`;
  const hooksFile = generateHooksFile(hooks, entities);
  writeFileSync(hooksPath, await formatGeneratedCode(hooksFile, hooksPath));
  files.push(`${outputDir}/hooks.ts`);

  // 5. Generate services (BaseService subclasses for PGlite)
  const serviceOutputs = entityNames.map((name) =>
    generateService(name, entities[name], tenancy)
  );
  const servicesPath = `${outputDir}/services.ts`;
  const servicesFile = generateServicesFile(serviceOutputs);
  writeFileSync(servicesPath, await formatGeneratedCode(servicesFile, servicesPath));
  files.push(`${outputDir}/services.ts`);

  // 6. Generate types (exports from schemas)
  const typesPath = `${outputDir}/types.ts`;
  const typesFile = generateTypesFile(entityNames);
  writeFileSync(typesPath, await formatGeneratedCode(typesFile, typesPath));
  files.push(`${outputDir}/types.ts`);

  // 7. Generate table registry for pending data export/import
  const tableRegistry = generateTableRegistry(entityNames, entities);
  const tableRegistryPath = `${outputDir}/sync-tables.ts`;
  const tableRegistryFile = generateTableRegistryFile(tableRegistry);
  writeFileSync(tableRegistryPath, await formatGeneratedCode(tableRegistryFile, tableRegistryPath));
  files.push(`${outputDir}/sync-tables.ts`);

  // 8. Generate query keys for TanStack Query cache invalidation
  const queryKeysPath = `${outputDir}/query-keys.ts`;
  const queryKeysFile = generateQueryKeysFile(entityNames);
  writeFileSync(queryKeysPath, await formatGeneratedCode(queryKeysFile, queryKeysPath));
  files.push(`${outputDir}/query-keys.ts`);

  // 9. Generate engine factory
  const engineFactoryPath = `${outputDir}/engine.ts`;
  const engineFactoryFile = generateEngineFactoryFile({ entityNames });
  writeFileSync(engineFactoryPath, await formatGeneratedCode(engineFactoryFile, engineFactoryPath));
  files.push(`${outputDir}/engine.ts`);

  // Detect changes
  if (isSyncSchema(config)) {
    for (const name of entityNames) {
      const columns = (entities[name] as SerializedEntity).columns;
      changes.push(`${name}: ${columns.length} fields`);
    }
  } else {
    for (const name of entityNames) {
      const columns = introspectTable(config.entities[name].table);
      changes.push(`${name}: ${columns.length} fields`);
    }
  }

  return { files, changes };
}

function generateTypesFile(entityNames: string[]): string {
  const b = new CodeBuilder();
  b.line("// AUTO-GENERATED FILE - DO NOT EDIT");
  b.line("// Generated by drizzle-sync from backend schema");
  b.blank();
  b.line('export type { z } from "zod";');

  for (const name of entityNames) {
    const pascal = name.charAt(0).toUpperCase() + name.slice(1);
    b.line(`export type { ${pascal}, ${pascal}Input } from "./schemas";`);
  }

  return b.toString();
}
