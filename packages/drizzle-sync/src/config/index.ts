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
} from "./types";

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
export { defineSyncConfig, createId, generateSyncGroupId, generateIdempotencyKey } from "./define-config";
export { introspectTable, detectRelations, buildRelationGraph, resolveColumns } from "./introspect";
export { loadConfig } from "./loader";
export { generateAll } from "./generator";
