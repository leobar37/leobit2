import type { PgTable } from "drizzle-orm/pg-core";
import type { FieldCodecMap } from "../codecs/types";

// Legacy exports (mantener compatibilidad)
export type ConflictResolutionStrategy =
  | "last-write-wins"
  | "first-write-wins"
  | "version-based"
  | "merge"
  | "manual"
  | string;

export interface EntityHooks<TEntity = unknown, TContext = unknown> {
  beforeSync?: (data: TEntity, context: TContext) => Promise<void> | void;
  afterSync?: (entity: TEntity, context: TContext) => Promise<void> | void;
  onConflict?: (
    local: TEntity,
    server: TEntity,
    context: TContext
  ) => Promise<ConflictResolution> | ConflictResolution | void;
  onError?: (error: Error, data: TEntity, context: TContext) => Promise<void> | void;
}

export interface ConflictResolution {
  strategy: ConflictResolutionStrategy;
  data?: Record<string, unknown>;
}

// ============================================
// NUEVOS TIPOS PARA CODEGEN (CUID2 + Drizzle)
// ============================================

/**
 * Configuración de relación hijo
 */
export interface ChildRelationConfig {
  entity: string; // Nombre de la entidad hija
  foreignKey: string; // Columna FK en la tabla hija
  payloadKey?: string; // Campo FK en payload camelCase (si difiere de foreignKey)
  cascade?: boolean; // Incluir automáticamente en operaciones
}

/**
 * Configuración de relación padre
 */
export interface ParentRelationConfig {
  entity: string; // Nombre de la entidad padre
  foreignKey: string; // Columna FK en esta tabla
  payloadKey?: string; // Campo FK en payload camelCase (si difiere de foreignKey)
  required?: boolean; // Si el FK es NOT NULL
}

export type TenancyMode = "required" | "none";

/**
 * Configuration for file fields within an entity
 */
export interface FileFieldConfig {
  /** Target entity for the file reference: 'files' for private files, 'assets' for public assets */
  entity: "files" | "assets";
  /** Maximum file size in bytes (default: 5MB) */
  maxSize?: number;
  /** Accepted MIME types (e.g., ["image/*", "application/pdf"]) */
  accept?: string[];
}

export interface SyncTenancyConfig {
  tenantField?: string;
  tenantColumn?: string;
}

export interface EntityTenancyConfig {
  mode?: TenancyMode;
  tenantColumn?: string;
}

/**
 * Configuración de entidad para sync
 * Con soporte para hybrid field definition y CUID2
 */
export interface EntitySyncConfig<TTable extends PgTable = PgTable> {
  // Referencia a tabla Drizzle
  table: TTable;

  // Si esta entidad debe sincronizarse
  syncable: boolean;

  // Hybrid field definition
  fields?: string[]; // Explicit whitelist (modo 2)
  autoFields?: boolean; // Usar todos los campos (modo 1 y 3)
  excludeFields?: string[]; // Campos a excluir en modo auto

  // Prioridad para ordenamiento (auto-calculado de relaciones)
  priority?: number;

  // Estrategia de resolución de conflictos
  conflictResolver?: "version-based" | "last-write-wins" | "merge";

  // Relaciones (auto-detectadas de schema)
  relations?: {
    children?: ChildRelationConfig[];
    parents?: ParentRelationConfig[];
  };

  // Hooks opcionales
  hooks?: EntityHooks;

  // Serialización por campo (complementa Zod, no lo reemplaza)
  fieldCodecs?: FieldCodecMap;

  // API path override - when the entity name differs from the API route path
  // e.g., entity "customerGroups" has API path "groups"
  apiPath?: string;

  // Multi-tenant partitioning policy
  tenancy?: EntityTenancyConfig;

  // File fields configuration
  fileFields?: Record<string, FileFieldConfig>;

  // Metadata adicional
  metadata?: Record<string, unknown>;
}

/**
 * Configuración principal del sync
 */
export interface SyncConfig<
  TEntities extends Record<string, EntitySyncConfig> = Record<string, EntitySyncConfig>
> {
  entities: TEntities;
  tenancy?: SyncTenancyConfig;
  options?: {
    batchSize?: number;
    maxRetries?: number;
    syncInterval?: number;
  };
}

export interface SchemaConfig {
  output: string;
  format?: "json";
  autoBuild?: boolean;
  watch?: boolean;
  watchPath?: string;
}

export interface DrizzleSyncProjectConfig {
  schemaConfig: string;
  schemaOutput?: string;
  clientOutput: string;
  serverOutput?: string;
}

export interface SyncConfigInput<
  TEntities extends Record<string, EntitySyncConfig> = Record<string, EntitySyncConfig>
> extends SyncConfig<TEntities> {
  schema?: SchemaConfig;
}

/**
 * Resultado de introspección de columna
 */
export interface ColumnMetadata {
  name: string;
  dataType: "string" | "number" | "boolean" | "date" | "json" | "enum" | "unknown";
  drizzleType: string;
  notNull: boolean;
  hasDefault: boolean;
  default?: unknown;
  primary: boolean;
  isEnum: boolean;
  enumValues?: string[];
  /** For decimal/numeric columns: precision (total digits) */
  precision?: number;
  /** For decimal/numeric columns: scale (digits after decimal) */
  scale?: number;
  /** For varchar columns: length limit */
  length?: number;
}

/**
 * Nodo en el grafo de relaciones
 */
export interface RelationNode {
  parents: string[]; // Nombres de entidades padre
  children: string[]; // Nombres de entidades hijas
  priority: number; // Número de ordenamiento (menor = primero)
}

/**
 * Grafo de relaciones completo
 */
export type RelationGraph = Record<string, RelationNode>;

/**
 * Configuración del change applier generado
 */
export interface GeneratedApplierConfig {
  validTables: Set<string>;
  tableColumns: Record<string, Set<string>>;
  requiredDefaults?: Record<string, Record<string, unknown>>;
  relationFields?: Set<string>;
  applyOrder?: string[]; // Orden de aplicación para pull
}

// ============================================
// TIPOS LEGACY (mantener compatibilidad)
// ============================================

export interface EntityConfig<
  TName extends string = string,
  TField extends string = string
> {
  tableName: string;
  entityType: TName;
  fields: readonly TField[];
  priority: number;
  parentFields?: readonly string[];
  childEntities?: readonly string[];
  selfHeal: boolean;
  syncStatusField?: string;
  syncAttemptsField?: string;
  versionField?: string;
  conflictResolver: ConflictResolutionStrategy;
  hooks?: EntityHooks;
  fileFields?: Record<string, FileFieldConfig>;
  metadata?: Record<string, unknown>;
}

export interface DatabaseConfig {
  execute: (sql: string) => Promise<unknown>;
  transaction: <T>(fn: (tx: unknown) => Promise<T>) => Promise<T>;
}

export interface LoggerConfig {
  debug: (msg: string, data?: unknown) => void;
  info: (msg: string, data?: unknown) => void;
  warn: (msg: string, data?: unknown) => void;
  error: (msg: string, data?: unknown) => void;
}

export type HandlerFactory<
  TEntity extends string = string,
  TDeps = unknown
> = (deps: TDeps) => unknown;

export interface SyncEngineConfig<
  TEntity extends string = string,
  TContext = unknown,
  TTransaction = unknown
> {
  entities: Record<TEntity, EntityConfig<TEntity>>;
  handlers?: Partial<Record<TEntity, HandlerFactory<TEntity>>>;
  conflictResolvers?: Record<string, ConflictResolverConfig<TContext, TTransaction>>;
  database?: DatabaseConfig;
  logger?: LoggerConfig;
  hooks?: {
    onPushComplete?: (result: unknown) => Promise<void> | void;
    onPullComplete?: (changes: unknown[]) => Promise<void> | void;
    onConflictDetected?: (conflict: unknown) => Promise<void> | void;
    onError?: (error: Error) => Promise<void> | void;
  };
  options?: {
    batchSize?: number;
    maxRetries?: number;
    syncInterval?: number;
    pullInterval?: number;
    backoffMultiplier?: number;
    logLevel?: "debug" | "info" | "warn" | "error";
  };
}

export interface ConflictResolverConfig<TContext = unknown, TTransaction = unknown> {
  checkConflict: (
    ctx: TContext,
    operation: unknown,
    tx: TTransaction
  ) => Promise<{ hasConflict: boolean; serverVersion?: number; serverData?: unknown }>;
  resolve: (
    ctx: TContext,
    localData: unknown,
    serverData: unknown,
    strategy: string
  ) => Promise<unknown>;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

export interface ValidationError {
  path: string;
  message: string;
  code: string;
}

export type EntityNames<TConfig extends SyncEngineConfig> =
  TConfig extends SyncEngineConfig<infer TEntity, infer _, infer _>
    ? TEntity
    : never;

export type EntityConfigFor<TConfig extends SyncEngineConfig, TEntity extends string> =
  TConfig["entities"][TEntity];

export type EntityFields<TConfig extends SyncEngineConfig, TEntity extends string> =
  EntityConfigFor<TConfig, TEntity> extends EntityConfig<string, infer TFields>
    ? TFields
    : never;
