# T-003: Create SchemaManager class

## Objective
Create the SchemaManager class that encapsulates all schema-related operations: serialization, persistence, and optional watch mode.

## Requirements
- FR-001: SchemaManager Class

## Files to Create
- `packages/drizzle-sync/src/config/schema-manager.ts`

## Implementation Details

### Class Interface

```typescript
export class SchemaManager {
  constructor(config: SchemaConfig)
  
  // Build schema from entities and relations
  async build(
    entities: Record<string, EntitySyncConfig>,
    relations: RelationGraph
  ): Promise<SyncSchema>
  
  // Persist schema to disk
  async save(): Promise<void>
  
  // Load schema from disk
  async load(): Promise<SyncSchema>
  
  // Watch mode
  startWatch(onChange: () => void): void
  stopWatch(): void
  
  // Getters
  getSchema(): SyncSchema | undefined
  getOutputPath(): string
  isWatching(): boolean
}

export interface SchemaConfig {
  output: string;           // Path to write schema.json
  format?: "json";          // Future: "dts" for TypeScript declarations
  autoBuild?: boolean;      // Build on construction
  watch?: boolean;          // Enable watch mode
}
```

### Implementation

```typescript
import { watch, FSWatcher } from "fs";
import { writeFile, readFile } from "fs/promises";
import { resolve, dirname } from "path";
import { SyncSchema } from "./schema-types";
import { EntitySyncConfig, RelationGraph } from "./types";
import { introspectTable, buildRelationGraph } from "./introspect";
import { 
  serializeColumns, 
  serializeEntityConfig,
  serializeRelationNode 
} from "./serializer";

export class SchemaManager {
  private config: Required<SchemaConfig>;
  private currentSchema?: SyncSchema;
  private watcher?: FSWatcher;
  private watchDebounceTimer?: ReturnType<typeof setTimeout>;
  
  constructor(config: SchemaConfig) {
    this.config = {
      output: config.output,
      format: config.format ?? "json",
      autoBuild: config.autoBuild ?? true,
      watch: config.watch ?? false,
    };
  }
  
  async build(
    entities: Record<string, EntitySyncConfig>,
    relations: RelationGraph
  ): Promise<SyncSchema> {
    const serializedEntities: Record<string, SerializedEntity> = {};
    
    for (const [name, config] of Object.entries(entities)) {
      const columns = introspectTable(config.table);
      
      serializedEntities[name] = {
        name,
        tableName: this.extractTableName(config.table),
        columns: serializeColumns(columns),
        config: serializeEntityConfig(config),
        graph: serializeRelationNode(relations[name]),
      };
    }
    
    this.currentSchema = {
      version: "1.0.0",
      generatedAt: new Date().toISOString(),
      entities: serializedEntities,
    };
    
    if (this.config.autoBuild) {
      await this.save();
    }
    
    return this.currentSchema;
  }
  
  private extractTableName(table: unknown): string {
    const t = table as { name?: string };
    return t.name || "";
  }
  
  async save(): Promise<void> {
    if (!this.currentSchema) {
      throw new Error("No schema to save. Call build() first.");
    }
    
    const outputPath = this.getOutputPath();
    const content = JSON.stringify(this.currentSchema, null, 2);
    
    await writeFile(outputPath, content, "utf-8");
  }
  
  async load(): Promise<SyncSchema> {
    const outputPath = this.getOutputPath();
    const content = await readFile(outputPath, "utf-8");
    this.currentSchema = JSON.parse(content) as SyncSchema;
    return this.currentSchema;
  }
  
  startWatch(onChange: () => void): void {
    if (this.watcher) return;
    
    const configPath = this.getOutputPath();
    
    this.watcher = watch(configPath, (eventType) => {
      if (eventType === "change") {
        // Debounce
        if (this.watchDebounceTimer) {
          clearTimeout(this.watchDebounceTimer);
        }
        
        this.watchDebounceTimer = setTimeout(() => {
          console.log("[drizzle-sync] Schema source changed, rebuilding...");
          onChange();
        }, 500);
      }
    });
  }
  
  stopWatch(): void {
    if (this.watchDebounceTimer) {
      clearTimeout(this.watchDebounceTimer);
    }
    this.watcher?.close();
    this.watcher = undefined;
  }
  
  getSchema(): SyncSchema | undefined {
    return this.currentSchema;
  }
  
  getOutputPath(): string {
    return resolve(this.config.output);
  }
  
  isWatching(): boolean {
    return this.watcher !== undefined;
  }
}
```

## Validation

- [ ] Can build schema from entities
- [ ] Saves to correct path
- [ ] Loads from disk correctly
- [ ] Watch mode detects changes
- [ ] Debounce works (only rebuilds after 500ms of no changes)
- [ ] Handles missing schema gracefully

## Notes

- Watch mode watches the source sync.config.ts, not the schema.json itself
- The `onChange` callback should typically call `buildSchema()` on the SyncConfigBuilder
- Consider adding file locking or atomic writes for concurrent access
