import type { FieldCodecMap } from "../codecs/types";
import type { ColumnMetadata, EntitySyncConfig, RelationNode } from "./types";
import type {
  SerializedChildRelation,
  SerializedColumn,
  SerializedEntityConfig,
  SerializedFieldCodec,
  SerializedParentRelation,
  SerializedRelationNode,
  SerializedSqlDefault,
} from "./schema-types";
import type { ChildRelationConfig, ParentRelationConfig } from "./types";

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isDrizzleSqlObject(value: unknown): value is { queryChunks?: unknown[] } {
  return isPlainObject(value) && Array.isArray(value.queryChunks);
}

export function extractSqlString(sqlObj: unknown): string | null {
  if (!isDrizzleSqlObject(sqlObj) || !sqlObj.queryChunks || sqlObj.queryChunks.length === 0) {
    return null;
  }

  const chunk = sqlObj.queryChunks[0] as { value?: unknown };
  if (!chunk || !Array.isArray(chunk.value) || chunk.value.length === 0) {
    return null;
  }

  const firstValue = chunk.value[0];
  return typeof firstValue === "string" ? firstValue : null;
}

export function serializeDefaultValue(defaultValue: unknown): unknown {
  if (defaultValue === null || defaultValue === undefined) {
    return null;
  }

  if (
    typeof defaultValue === "string" ||
    typeof defaultValue === "number" ||
    typeof defaultValue === "boolean"
  ) {
    return defaultValue;
  }

  if (Array.isArray(defaultValue)) {
    return defaultValue;
  }

  const sqlValue = extractSqlString(defaultValue);
  if (sqlValue) {
    const serialized: SerializedSqlDefault = {
      __type: "sql",
      value: sqlValue,
    };
    return serialized;
  }

  if (isPlainObject(defaultValue)) {
    return null;
  }

  return null;
}

export function serializeColumns(columns: ColumnMetadata[]): SerializedColumn[] {
  return columns.map((col) => ({
    name: col.name,
    dataType: col.dataType,
    drizzleType: col.drizzleType,
    notNull: col.notNull,
    hasDefault: col.hasDefault,
    default: serializeDefaultValue(col.default),
    primary: col.primary,
    isEnum: col.isEnum,
    enumValues: col.enumValues,
    precision: col.precision,
    scale: col.scale,
    length: col.length,
  }));
}

export function serializeFieldCodecs(
  codecs?: FieldCodecMap
): Record<string, SerializedFieldCodec> | undefined {
  if (!codecs) {
    return undefined;
  }

  const serialized = Object.entries(codecs).reduce<Record<string, SerializedFieldCodec>>(
    (acc, [field, codec]) => {
      acc[field] = {
        kind: codec.kind,
        nullable: codec.isNullable,
      };
      return acc;
    },
    {}
  );

  return Object.keys(serialized).length > 0 ? serialized : undefined;
}

function serializeChildRelations(
  children?: ChildRelationConfig[]
): SerializedChildRelation[] | undefined {
  if (!children || children.length === 0) {
    return undefined;
  }

  return children.map((child) => ({
    entity: child.entity,
    foreignKey: child.foreignKey,
    payloadKey: child.payloadKey,
    cascade: child.cascade,
  }));
}

function serializeParentRelations(
  parents?: ParentRelationConfig[]
): SerializedParentRelation[] | undefined {
  if (!parents || parents.length === 0) {
    return undefined;
  }

  return parents.map((parent) => ({
    entity: parent.entity,
    foreignKey: parent.foreignKey,
    payloadKey: parent.payloadKey,
    required: parent.required,
  }));
}

export function serializeEntityConfig(config: EntitySyncConfig): SerializedEntityConfig {
  return {
    syncable: config.syncable,
    fields: config.fields,
    autoFields: config.autoFields,
    excludeFields: config.excludeFields,
    priority: config.priority,
    conflictResolver: config.conflictResolver,
    apiPath: config.apiPath,
    tenancy: config.tenancy,
    fieldCodecs: serializeFieldCodecs(config.fieldCodecs),
    relations: {
      children: serializeChildRelations(config.relations?.children),
      parents: serializeParentRelations(config.relations?.parents),
    },
    metadata: config.metadata,
  };
}

export function serializeRelationNode(node: RelationNode): SerializedRelationNode {
  return {
    parents: [...node.parents],
    children: [...node.children],
    priority: node.priority,
  };
}
