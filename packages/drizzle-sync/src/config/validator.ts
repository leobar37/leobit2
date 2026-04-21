import type {
  SyncEngineConfig,
  EntityConfig,
  ValidationResult as LegacyValidationResult,
  ValidationError as LegacyValidationError,
  SyncConfig,
  EntitySyncConfig,
} from "./types";
import { introspectTable } from "./introspect";

// Tipos de validación exportados
export interface ConfigValidationError {
  path: string;
  message: string;
  hint?: string;
}

export interface ConfigValidationWarning {
  path: string;
  message: string;
}

export interface ConfigValidationResult {
  valid: boolean;
  errors: ConfigValidationError[];
  warnings: ConfigValidationWarning[];
}

// ============================================
// LEGACY VALIDATOR (mantener compatibilidad)
// ============================================

export function validateConfig<TEntity extends string>(
  config: SyncEngineConfig<TEntity>
): LegacyValidationResult {
  const errors: LegacyValidationError[] = [];

  if (!config.entities || Object.keys(config.entities).length === 0) {
    errors.push({
      path: "entities",
      message: "At least one entity must be configured",
      code: "MISSING_ENTITIES",
    });
    return { valid: false, errors };
  }

  const entityEntries = Object.entries(config.entities) as [TEntity, EntityConfig<TEntity>][];

  for (const [entityType, entityConfig] of entityEntries) {
    const entityErrors = validateLegacyEntity(entityConfig, entityType, config.entities);
    errors.push(...entityErrors.map((e) => ({ ...e, path: `entities.${entityType}.${e.path}` })));
  }

  const cycleErrors = checkLegacyCircularDependencies(config.entities);
  errors.push(...cycleErrors);

  const priorityErrors = validateLegacyPriorityConsistency(config.entities);
  errors.push(...priorityErrors);

  return {
    valid: errors.length === 0,
    errors,
  };
}

function validateLegacyEntity<TEntity extends string, TField extends string>(
  entity: EntityConfig<TEntity, TField>,
  entityType: TEntity,
  allEntities: Record<TEntity, EntityConfig<TEntity>>
): LegacyValidationError[] {
  const errors: LegacyValidationError[] = [];

  if (!entity.tableName || entity.tableName.trim() === "") {
    errors.push({
      path: "tableName",
      message: "Table name is required",
      code: "MISSING_TABLE_NAME",
    });
  }

  if (!entity.fields || entity.fields.length === 0) {
    errors.push({
      path: "fields",
      message: "At least one field is required",
      code: "MISSING_FIELDS",
    });
  }

  const fieldSet = new Set(entity.fields);
  if (fieldSet.size !== entity.fields.length) {
    errors.push({
      path: "fields",
      message: "Duplicate fields detected",
      code: "DUPLICATE_FIELDS",
    });
  }

  if (entity.parentFields) {
    for (const parentField of entity.parentFields) {
      if (!entity.fields.includes(parentField as TField)) {
        errors.push({
          path: "parentFields",
          message: `Parent field "${parentField}" must be in fields list`,
          code: "INVALID_PARENT_FIELD",
        });
      }
    }
  }

  if (entity.childEntities) {
    for (const childEntity of entity.childEntities) {
      if (!allEntities[childEntity as TEntity]) {
        errors.push({
          path: "childEntities",
          message: `Child entity "${childEntity}" is not defined`,
          code: "MISSING_CHILD_ENTITY",
        });
      }
    }
  }

  if (entity.syncStatusField && !entity.fields.includes(entity.syncStatusField as TField)) {
    errors.push({
      path: "syncStatusField",
      message: `Sync status field "${entity.syncStatusField}" must be in fields list`,
      code: "INVALID_SYNC_STATUS_FIELD",
    });
  }

  if (entity.entityType !== entityType) {
    errors.push({
      path: "entityType",
      message: `Entity type "${entity.entityType}" does not match key "${entityType}"`,
      code: "MISMATCHED_ENTITY_TYPE",
    });
  }

  return errors;
}

function checkLegacyCircularDependencies<TEntity extends string>(
  entities: Record<TEntity, EntityConfig<TEntity>>
): LegacyValidationError[] {
  const errors: LegacyValidationError[] = [];
  const visited = new Set<TEntity>();
  const recursionStack = new Set<TEntity>();

  function visit(entityType: TEntity, path: TEntity[]): boolean {
    if (recursionStack.has(entityType)) {
      const cycle = path.slice(path.indexOf(entityType)).concat(entityType);
      errors.push({
        path: "childEntities",
        message: `Circular dependency detected: ${cycle.join(" -> ")}`,
        code: "CIRCULAR_DEPENDENCY",
      });
      return true;
    }

    if (visited.has(entityType)) {
      return false;
    }

    visited.add(entityType);
    recursionStack.add(entityType);

    const entity = entities[entityType];
    if (entity?.childEntities) {
      for (const child of entity.childEntities) {
        if (visit(child as TEntity, [...path, entityType])) {
          return true;
        }
      }
    }

    recursionStack.delete(entityType);
    return false;
  }

  for (const entityType of Object.keys(entities) as TEntity[]) {
    if (!visited.has(entityType)) {
      visit(entityType, []);
    }
  }

  return errors;
}

function validateLegacyPriorityConsistency<TEntity extends string>(
  entities: Record<TEntity, EntityConfig<TEntity>>
): LegacyValidationError[] {
  const errors: LegacyValidationError[] = [];

  for (const [entityType, entity] of Object.entries(entities) as [TEntity, EntityConfig<TEntity>][]) {
    if (entity.childEntities) {
      for (const childType of entity.childEntities) {
        const child = entities[childType as TEntity];
        if (child && child.priority <= entity.priority) {
          errors.push({
            path: "priority",
            message:
              `Child entity "${childType}" (priority ${child.priority}) ` +
              `should have higher priority than parent "${entityType}" (priority ${entity.priority})`,
            code: "INVALID_PRIORITY_HIERARCHY",
          });
        }
      }
    }
  }

  return errors;
}

export function assertValidConfig<TEntity extends string>(
  config: SyncEngineConfig<TEntity>
): asserts config is SyncEngineConfig<TEntity> {
  const result = validateConfig(config);
  if (!result.valid) {
    const messages = result.errors.map((e) => `[${e.code}] ${e.path}: ${e.message}`);
    throw new Error(`Invalid sync configuration:\n${messages.join("\n")}`);
  }
}

// ============================================
// NUEVO VALIDATOR PARA CODEGEN (EntitySyncConfig)
// ============================================

export function validateSyncConfig(config: SyncConfig): ConfigValidationResult {
  const errors: ConfigValidationError[] = [];
  const warnings: ConfigValidationWarning[] = [];

  if (!config.entities || Object.keys(config.entities).length === 0) {
    errors.push({
      path: "entities",
      message: "No entities configured",
      hint: "Add at least one entity to sync.config.ts",
    });
  }

  for (const [name, entity] of Object.entries(config.entities)) {
    validateNewEntity(name, entity, errors, warnings);
  }

  checkNewCircularDependencies(config.entities, errors, warnings);

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

function validateNewEntity(
  name: string,
  entity: EntitySyncConfig,
  errors: ConfigValidationError[],
  warnings: ConfigValidationWarning[]
): void {
  const path = `entities.${name}`;
  let validFields: string[] = [];

  if (!entity.table) {
    errors.push({
      path: `${path}.table`,
      message: "Missing table reference",
      hint: "Provide a Drizzle table: table: customers",
    });
    return;
  }

  if (entity.fields && entity.excludeFields) {
    warnings.push({
      path: `${path}.fields`,
      message: "Both 'fields' and 'excludeFields' provided - 'fields' takes precedence",
    });
  }

  try {
    const columns = introspectTable(entity.table);
    validFields = columns.map((c) => c.name);
  } catch {
    errors.push({
      path: `${path}.table`,
      message: "Failed to introspect table",
      hint: "Ensure the table is a valid Drizzle pgTable",
    });
    return;
  }

  if (entity.fields) {
    const invalidFields = entity.fields.filter((f) => !validFields.includes(f));

    if (invalidFields.length > 0) {
      errors.push({
        path: `${path}.fields`,
        message: `Invalid field names: ${invalidFields.join(", ")}`,
        hint: `Valid fields are: ${validFields.join(", ")}`,
      });
    }
  }

  if (entity.fieldCodecs) {
    const codecFields = Object.keys(entity.fieldCodecs);
    const invalidCodecFields = codecFields.filter((f) => !validFields.includes(f));

    if (invalidCodecFields.length > 0) {
      errors.push({
        path: `${path}.fieldCodecs`,
        message: `Codec fields not found in table: ${invalidCodecFields.join(", ")}`,
        hint: `Valid fields are: ${validFields.join(", ")}`,
      });
    }

    if (codecFields.length === 0) {
      warnings.push({
        path: `${path}.fieldCodecs`,
        message: "fieldCodecs is present but empty",
      });
    }
  }

  const childRelations = entity.relations?.children || [];
  for (const relation of childRelations) {
    if (relation.payloadKey && relation.payloadKey.includes("_")) {
      warnings.push({
        path: `${path}.relations.children.${relation.entity}.payloadKey`,
        message: "payloadKey should be camelCase for payload contracts",
      });
    }
  }

  const parentRelations = entity.relations?.parents || [];
  for (const relation of parentRelations) {
    if (relation.payloadKey && relation.payloadKey.includes("_")) {
      warnings.push({
        path: `${path}.relations.parents.${relation.entity}.payloadKey`,
        message: "payloadKey should be camelCase for payload contracts",
      });
    }
  }

  const validResolvers = ["version-based", "last-write-wins", "merge"];
  if (entity.conflictResolver && !validResolvers.includes(entity.conflictResolver)) {
    errors.push({
      path: `${path}.conflictResolver`,
      message: `Invalid conflict resolver: ${entity.conflictResolver}`,
      hint: `Use one of: ${validResolvers.join(", ")}`,
    });
  }

  if (!entity.syncable) {
    warnings.push({
      path,
      message: "Entity is not syncable (syncable: false)",
    });
  }
}

function checkNewCircularDependencies(
  entities: Record<string, EntitySyncConfig>,
  errors: ConfigValidationError[],
  warnings: ConfigValidationWarning[]
): void {
  const graph: Record<string, Array<{ name: string; nullable: boolean }>> = {};

  for (const [name, entity] of Object.entries(entities)) {
    if (!entity.table) continue;

    try {
      const columns = introspectTable(entity.table);
      const foreignKeys = columns
        .filter((col) => col.name.endsWith("_id") && !col.primary)
        .map((col) => ({
          name: col.name.replace("_id", "").replace(/s$/, ""),
          nullable: !col.notNull,
        }));

      graph[name] = foreignKeys;
    } catch {
      graph[name] = [];
    }
  }

  const visited = new Set<string>();
  const visiting = new Set<string>();
  const circularRefs = new Set<string>();

  function visit(name: string, path: string[]): boolean {
    if (visiting.has(name)) {
      const cycleStart = path.indexOf(name);
      const cycle = path.slice(cycleStart).concat([name]);
      circularRefs.add(cycle.join("→"));
      return true;
    }

    if (visited.has(name)) {
      return false;
    }

    visiting.add(name);
    path.push(name);

    for (const dep of graph[name] || []) {
      const depEntity = Object.keys(entities).find((e) => e === dep.name || e === `${dep.name}s`);
      if (depEntity) {
        visit(depEntity, [...path]);
      }
    }

    visiting.delete(name);
    visited.add(name);

    return false;
  }

  for (const name of Object.keys(graph)) {
    if (!visited.has(name)) {
      visit(name, []);
    }
  }

  if (circularRefs.size > 0) {
    warnings.push({
      path: "entities.relations",
      message: `Circular references detected (handled gracefully): ${Array.from(circularRefs).join(", ")}`,
    });
  }
}
