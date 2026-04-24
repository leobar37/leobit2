export const SYNC_SCHEMA_VERSION = "1.0.0";

export type SerializedColumnDataType =
  | "string"
  | "number"
  | "boolean"
  | "date"
  | "json"
  | "enum"
  | "unknown";

export interface SerializedSqlDefault {
  __type: "sql";
  value: string;
}

export interface SerializedFieldCodec {
  kind: string;
  nullable?: boolean;
}

export interface SerializedChildRelation {
  entity: string;
  foreignKey: string;
  payloadKey?: string;
  cascade?: boolean;
}

export interface SerializedParentRelation {
  entity: string;
  foreignKey: string;
  payloadKey?: string;
  required?: boolean;
}

export interface SerializedRelationNode {
  parents: string[];
  children: string[];
  priority: number;
}

export interface SerializedColumn {
  name: string;
  dataType: SerializedColumnDataType;
  drizzleType: string;
  notNull: boolean;
  hasDefault: boolean;
  default?: unknown;
  primary: boolean;
  isEnum: boolean;
  enumValues?: string[];
  precision?: number;
  scale?: number;
  length?: number;
}

export interface SerializedFileFieldConfig {
  entity: "files" | "assets";
  maxSize?: number;
  accept?: string[];
}

export interface SerializedEntityConfig {
  syncable: boolean;
  fields?: string[];
  autoFields?: boolean;
  excludeFields?: string[];
  priority?: number;
  conflictResolver?: string;
  apiPath?: string;
  tenancy?: {
    mode?: "required" | "none";
    tenantColumn?: string;
  };
  fieldCodecs?: Record<string, SerializedFieldCodec>;
  relations?: {
    children?: SerializedChildRelation[];
    parents?: SerializedParentRelation[];
  };
  fileFields?: Record<string, SerializedFileFieldConfig>;
  metadata?: Record<string, unknown>;
}

export interface SerializedEntity {
  name: string;
  entityType: string;
  tableName: string;
  columns: SerializedColumn[];
  config: SerializedEntityConfig;
  graph: SerializedRelationNode;
}

export interface SyncSchema {
  version: string;
  generatedAt: string;
  tenancy?: {
    tenantField?: string;
    tenantColumn?: string;
  };
  entities: Record<string, SerializedEntity>;
}
