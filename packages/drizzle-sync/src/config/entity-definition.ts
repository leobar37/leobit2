import type {
  EntityConfig,
  EntityHooks,
  ConflictResolutionStrategy,
} from './types';

export interface DefineEntityInput<
  TName extends string = string,
  TField extends string = string
> {
  tableName: string;
  fields: readonly TField[];
  priority?: number;
  parentFields?: readonly string[];
  childEntities?: readonly string[];
  selfHeal?: boolean;
  syncStatusField?: string;
  syncAttemptsField?: string;
  versionField?: string;
  conflictResolver?: ConflictResolutionStrategy;
  hooks?: EntityHooks;
  metadata?: Record<string, unknown>;
}

export function defineEntity<
  TName extends string,
  const TFields extends readonly string[]
>(
  entityType: TName,
  input: Omit<DefineEntityInput<TName, TFields[number]>, 'entityType'>
): EntityConfig<TName, TFields[number]> {
  return {
    entityType,
    tableName: input.tableName,
    fields: input.fields,
    priority: input.priority ?? 99,
    parentFields: input.parentFields,
    childEntities: input.childEntities,
    selfHeal: input.selfHeal ?? false,
    syncStatusField: input.syncStatusField,
    syncAttemptsField: input.syncAttemptsField,
    versionField: input.versionField,
    conflictResolver: input.conflictResolver ?? 'last-write-wins',
    hooks: input.hooks,
    metadata: input.metadata,
  };
}

export class EntityBuilder<TName extends string> {
  private config: Partial<EntityConfig<TName>> & { entityType: TName };

  constructor(entityType: TName) {
    this.config = { entityType };
  }

  table(name: string): this {
    this.config.tableName = name;
    return this;
  }

  fields<const T extends readonly string[]>(fields: T): EntityBuilderWithFields<TName, T> {
    (this.config as EntityConfig).fields = fields;
    return this as unknown as EntityBuilderWithFields<TName, T>;
  }

  priority(p: number): this {
    this.config.priority = p;
    return this;
  }

  parentFields(fields: readonly string[]): this {
    this.config.parentFields = fields;
    return this;
  }

  childEntities(entities: readonly string[]): this {
    this.config.childEntities = entities;
    return this;
  }

  selfHeal(enabled: boolean): this {
    this.config.selfHeal = enabled;
    return this;
  }

  syncStatusField(field: string): this {
    this.config.syncStatusField = field;
    return this;
  }

  versionField(field: string): this {
    this.config.versionField = field;
    return this;
  }

  conflictResolver(strategy: ConflictResolutionStrategy): this {
    this.config.conflictResolver = strategy;
    return this;
  }

  hooks(h: EntityHooks): this {
    this.config.hooks = h;
    return this;
  }

  build(): EntityConfig<TName> {
    if (!this.config.tableName) {
      throw new Error(`Entity ${this.config.entityType}: tableName is required`);
    }
    if (!this.config.fields || this.config.fields.length === 0) {
      throw new Error(`Entity ${this.config.entityType}: fields are required`);
    }

    return {
      entityType: this.config.entityType,
      tableName: this.config.tableName,
      fields: this.config.fields,
      priority: this.config.priority ?? 99,
      parentFields: this.config.parentFields,
      childEntities: this.config.childEntities,
      selfHeal: this.config.selfHeal ?? false,
      syncStatusField: this.config.syncStatusField,
      syncAttemptsField: this.config.syncAttemptsField,
      versionField: this.config.versionField,
      conflictResolver: this.config.conflictResolver ?? 'last-write-wins',
      hooks: this.config.hooks,
      metadata: this.config.metadata,
    } as EntityConfig<TName>;
  }
}

interface EntityBuilderWithFields<TName extends string, TFields extends readonly string[]> {
  priority(p: number): this;
  parentFields(fields: readonly string[]): this;
  childEntities(entities: readonly string[]): this;
  selfHeal(enabled: boolean): this;
  syncStatusField(field: string): this;
  versionField(field: string): this;
  conflictResolver(strategy: ConflictResolutionStrategy): this;
  hooks(h: EntityHooks): this;
  build(): EntityConfig<TName, TFields[number]>;
}

export function entityBuilder<TName extends string>(entityType: TName): EntityBuilder<TName> {
  return new EntityBuilder(entityType);
}
