# T-004: Create SyncConfigBuilder class

## Objective
Create the SyncConfigBuilder class that wraps the sync configuration and contains a SchemaManager instance. This is the main API surface for consumers.

## Requirements
- FR-002: SyncConfigBuilder Class

## Files to Create
- `packages/drizzle-sync/src/config/builder.ts`

## Implementation Details

### Class Interface

```typescript
export class SyncConfigBuilder {
  constructor(input: SyncConfigInput)
  
  // Schema operations
  async buildSchema(): Promise<SyncSchema>
  getSchema(): SyncSchema | undefined
  
  // Runtime config (for backend SyncEngine)
  getRuntimeConfig(): RuntimeSyncConfig
  getSyncEngineConfig(): SyncEngineConfig
  
  // Watch mode
  startWatch(): void
  stopWatch(): void
  
  // Access underlying config
  get entities(): Record<string, EntitySyncConfig>
  get options(): SyncConfig["options"]
  get schemaConfig(): SchemaConfig | undefined
  
  // SchemaManager access (if advanced control needed)
  readonly schemaManager: SchemaManager | undefined
}

export interface SyncConfigInput extends SyncConfig {
  schema?: SchemaConfig;
}

export interface RuntimeSyncConfig {
  entities: Record<string, EntitySyncConfig>;
  options?: SyncConfig["options"];
}
```

### Implementation

```typescript
import { SchemaManager, SchemaConfig } from "./schema-manager";
import { SyncSchema } from "./schema-types";
import { SyncConfig, EntitySyncConfig } from "./types";
import { buildRelationGraph } from "./introspect";
import { createSyncEngine } from "../create-sync-engine";
import type { SyncEngineConfig } from "./types";

export class SyncConfigBuilder {
  private input: SyncConfigInput;
  private _schemaManager?: SchemaManager;
  
  constructor(input: SyncConfigInput) {
    this.input = input;
    
    // Initialize SchemaManager if schema config provided
    if (input.schema) {
      this._schemaManager = new SchemaManager(input.schema);
      
      // Auto-build if configured
      if (input.schema.autoBuild !== false) {
        // Use setImmediate to allow constructor to complete
        setImmediate(() => this.buildSchema());
      }
      
      // Auto-watch if configured
      if (input.schema.watch) {
        this.startWatch();
      }
    }
  }
  
  async buildSchema(): Promise<SyncSchema> {
    if (!this._schemaManager) {
      throw new Error("SchemaManager not initialized. Provide schema config.");
    }
    
    const relations = buildRelationGraph(this.input.entities);
    const schema = await this._schemaManager.build(this.input.entities, relations);
    
    return schema;
  }
  
  getSchema(): SyncSchema | undefined {
    return this._schemaManager?.getSchema();
  }
  
  getRuntimeConfig(): RuntimeSyncConfig {
    return {
      entities: this.input.entities,
      options: this.input.options,
    };
  }
  
  getSyncEngineConfig(): SyncEngineConfig {
    // Convert new config format to legacy SyncEngineConfig
    // This maintains backward compatibility
    return this.adaptToLegacyConfig(this.input);
  }
  
  startWatch(): void {
    if (!this._schemaManager) return;
    
    this._schemaManager.startWatch(() => {
      this.buildSchema().catch((err) => {
        console.error("[drizzle-sync] Schema rebuild failed:", err);
      });
    });
  }
  
  stopWatch(): void {
    this._schemaManager?.stopWatch();
  }
  
  // Proxy properties for backward compatibility
  get entities(): Record<string, EntitySyncConfig> {
    return this.input.entities;
  }
  
  get options(): SyncConfig["options"] {
    return this.input.options;
  }
  
  get schemaConfig(): SchemaConfig | undefined {
    return this.input.schema;
  }
  
  get schemaManager(): SchemaManager | undefined {
    return this._schemaManager;
  }
  
  private adaptToLegacyConfig(input: SyncConfigInput): SyncEngineConfig {
    // Convert EntitySyncConfig[] to legacy EntityConfig[]
    // This is a best-effort conversion for backward compatibility
    const legacyEntities: Record<string, any> = {};
    
    for (const [name, config] of Object.entries(input.entities)) {
      legacyEntities[name] = {
        entityType: name,
        tableName: this.extractTableName(config.table),
        fields: [], // Would need to introspect
        priority: 99,
        selfHeal: false,
        conflictResolver: config.conflictResolver || "last-write-wins",
      };
    }
    
    return {
      entities: legacyEntities,
      options: input.options,
    } as SyncEngineConfig;
  }
  
  private extractTableName(table: unknown): string {
    const t = table as { name?: string };
    return t.name || "";
  }
}
```

## Validation

- [ ] Constructor accepts config with schema settings
- [ ] Auto-builds schema on construction
- [ ] Can access entities and options properties
- [ ] getRuntimeConfig returns config without schema manager internals
- [ ] Watch mode starts/stops correctly

## Notes

- SyncConfigBuilder is a proxy/wrapper around the original config
- Existing code that accesses `.entities` or `.options` continues to work
- The builder is lazy: schema is only built when needed or on auto-build
