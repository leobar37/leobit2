import { currency } from "../../codecs/currency";
import { dateOnly } from "../../codecs/date-only";
import { decimalCodec } from "../../codecs/decimal";
import { emptyStringToNull } from "../../codecs/empty-string-to-null";
import type { FieldCodecMap } from "../../codecs/types";
import { weight } from "../../codecs/weight";
import { getTableName } from "drizzle-orm";
import { camelCase } from "../../utils/string-utils";
import { introspectTable, resolveColumns } from "../introspect";
import type { SerializedEntity, SerializedFieldCodec } from "../schema-types";
import type { ColumnMetadata, EntitySyncConfig } from "../types";

export type GeneratorEntity = EntitySyncConfig | SerializedEntity;

export interface GeneratorTenancyOptions {
  tenantColumn?: string;
  tenantField?: string;
}

export interface GeneratorEntityConfig {
  fields?: string[];
  autoFields?: boolean;
  excludeFields?: string[];
  metadata?: Record<string, unknown>;
  relations?: {
    children?: Array<{ entity: string; foreignKey: string; payloadKey?: string; cascade?: boolean }>;
    parents?: Array<{ entity: string; foreignKey: string; payloadKey?: string; required?: boolean }>;
  };
  apiPath?: string;
  tenancy?: {
    mode?: "required" | "none";
    tenantColumn?: string;
  };
  fieldCodecs?: FieldCodecMap;
  fileFields?: Record<string, { entity: "files" | "assets"; maxSize?: number; accept?: string[] }>;
}

export function isSerializedEntity(entity: GeneratorEntity): entity is SerializedEntity {
  return "columns" in entity && "config" in entity;
}

export function getGeneratorConfig(entity: GeneratorEntity): GeneratorEntityConfig {
  if (isSerializedEntity(entity)) {
    return {
      fields: entity.config.fields,
      autoFields: entity.config.autoFields,
      excludeFields: entity.config.excludeFields,
      metadata: entity.config.metadata,
      relations: entity.config.relations,
      apiPath: entity.config.apiPath,
      tenancy: entity.config.tenancy,
      fieldCodecs: mapSerializedCodecs(entity.config.fieldCodecs),
      fileFields: entity.config.fileFields,
    };
  }

  return {
    fields: entity.fields,
    autoFields: entity.autoFields,
    excludeFields: entity.excludeFields,
    metadata: entity.metadata,
    relations: entity.relations,
    apiPath: entity.apiPath,
    tenancy: entity.tenancy,
    fieldCodecs: entity.fieldCodecs,
    fileFields: entity.fileFields,
  };
}

export function getColumnsToInclude(entity: GeneratorEntity): ColumnMetadata[] {
  if (isSerializedEntity(entity)) {
    const columns = entity.columns as ColumnMetadata[];
    return resolveColumns(columns, {
      fields: entity.config.fields,
      autoFields: entity.config.autoFields,
      excludeFields: entity.config.excludeFields,
    });
  }

  const columns = introspectTable(entity.table);
  return resolveColumns(columns, entity);
}

export function resolveTenantColumn(
  entity: GeneratorEntity,
  options?: GeneratorTenancyOptions
): string {
  const config = getGeneratorConfig(entity);
  return config.tenancy?.tenantColumn ?? options?.tenantColumn ?? "tenant_id";
}

export function resolveTenantField(
  entity: GeneratorEntity,
  options?: GeneratorTenancyOptions
): string {
  const config = getGeneratorConfig(entity);
  if (options?.tenantField) return options.tenantField;
  return camelCase(resolveTenantColumn(entity, options));
}

export function isTenantScopedEntity(
  entity: GeneratorEntity,
  options?: GeneratorTenancyOptions
): boolean {
  const config = getGeneratorConfig(entity);
  if (config.tenancy?.mode === "none") return false;
  if (config.tenancy?.mode === "required") return true;

  const tenantColumn = resolveTenantColumn(entity, options);
  return getAllColumns(entity).some((col) => col.name === tenantColumn);
}

export function getAllColumns(entity: GeneratorEntity): ColumnMetadata[] {
  if (isSerializedEntity(entity)) {
    return entity.columns as ColumnMetadata[];
  }

  return introspectTable(entity.table);
}

export function extractTableName(entityName: string, entity: GeneratorEntity): string {
  if (isSerializedEntity(entity)) {
    return entity.tableName || entity.entityType || entityName;
  }

  try {
    return getTableName(entity.table as Parameters<typeof getTableName>[0]);
  } catch {
    const tableName = (entity.table as { name?: unknown }).name;
    return typeof tableName === "string" && tableName.length > 0 ? tableName : entityName;
  }
}

function mapSerializedCodecs(
  codecs?: Record<string, SerializedFieldCodec>
): FieldCodecMap | undefined {
  if (!codecs) {
    return undefined;
  }

  const mapped = Object.entries(codecs).reduce<FieldCodecMap>((acc, [key, codec]) => {
    const codecFactoryMap: Record<string, () => FieldCodecMap[string]> = {
      currency: () => currency({ nullable: codec.nullable === true }),
      weight: () => weight({ nullable: codec.nullable === true }),
      decimal: () => decimalCodec({ scale: 2, nullable: codec.nullable === true }),
      "empty-string-to-null": () => emptyStringToNull(),
      "date-only": () => dateOnly({ nullable: codec.nullable === true }),
    };

    const factory = codecFactoryMap[codec.kind];
    acc[key] =
      typeof factory === "function"
        ? factory()
        : {
            kind: codec.kind,
            isNullable: codec.nullable,
            toStorage(value) {
              return value;
            },
            fromStorage(value) {
              return value;
            },
          };
    return acc;
  }, {});

  return Object.keys(mapped).length > 0 ? mapped : undefined;
}
