export type {
  EntityConfig,
  EntityHooks,
  EntityNames,
  EntityConfigFor,
  EntityFields,
  SyncEngineConfig,
  DatabaseConfig,
  LoggerConfig,
  HandlerFactory,
  ConflictResolutionStrategy,
  ConflictResolution,
  ConflictResolverConfig,
  ValidationResult,
  ValidationError,
  EntitySyncConfig,
  SyncConfig,
  ColumnMetadata,
  RelationNode,
  RelationGraph,
  GeneratedApplierConfig,
  ChildRelationConfig,
  ParentRelationConfig,
  TenancyMode,
  SyncTenancyConfig,
  EntityTenancyConfig,
  SchemaConfig,
  DrizzleSyncProjectConfig,
  SyncConfigInput,
} from "./types";

export type {
  SyncSchema,
  SerializedEntity,
  SerializedEntityConfig,
  SerializedColumn,
  SerializedFieldCodec,
  SerializedRelationNode,
  SerializedSqlDefault,
} from "./schema-types";

// Tipos de validación desde validator
export type {
  ConfigValidationResult,
  ConfigValidationError,
  ConfigValidationWarning,
} from "./validator";

export {
  defineEntity,
  entityBuilder,
  EntityBuilder,
  type DefineEntityInput,
} from "./entity-definition";

export {
  validateConfig,
  assertValidConfig,
  validateSyncConfig,
} from "./validator";

// Nuevos exports para codegen
export {
  defineSyncConfig,
  defineDrizzleSyncProject,
  createId,
  generateSyncGroupId,
  generateIdempotencyKey,
} from "./define-config";
export { introspectTable, detectRelations, buildRelationGraph, resolveColumns } from "./introspect";
export { loadConfig } from "./loader";
export { generateAll } from "./generator";
export { SyncConfigBuilder, type RuntimeSyncConfig } from "./builder";
export { SchemaManager } from "./schema-manager";
export { SYNC_SCHEMA_VERSION } from "./schema-types";

export {
  generateLocalFirstHooksFactory,
  generateLocalFirstHooksWithChildren,
  generateAllLocalFirstHooks,
  generateLocalFirstHooksFile,
  type LocalFirstHooks,
  type LocalFirstHooksOutput,
} from "./generators/local-first-hooks-generator";

export type { FieldCodec, FieldCodecMap } from "../codecs/types";
