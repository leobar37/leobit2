import { buildRelationGraph } from "./introspect";
import { SchemaManager } from "./schema-manager";
import type { SyncSchema } from "./schema-types";
import { validateSyncConfig } from "./validator";
import type {
  EntitySyncConfig,
  SchemaConfig,
  SyncConfig,
  SyncConfigInput,
} from "./types";

export interface RuntimeSyncConfig<
  TEntities extends Record<string, EntitySyncConfig> = Record<string, EntitySyncConfig>
> {
  entities: TEntities;
  tenancy?: SyncConfig<TEntities>["tenancy"];
  options?: SyncConfig<TEntities>["options"];
}

export class SyncConfigBuilder<
  TEntities extends Record<string, EntitySyncConfig> = Record<string, EntitySyncConfig>
> {
  private readonly input: SyncConfigInput<TEntities>;
  private readonly _schemaManager?: SchemaManager;

  constructor(input: SyncConfigInput<TEntities>) {
    this.input = input;

    if (input.schema) {
      this._schemaManager = new SchemaManager(input.schema);
      if (input.schema.watch) {
        this.startWatch();
      }

      if (
        input.schema.autoBuild !== false &&
        process.env.DRIZZLE_SYNC_DISABLE_AUTO_BUILD !== "1"
      ) {
        queueMicrotask(() => {
          void this.buildSchema().catch((error) => {
            console.error("[drizzle-sync] auto schema build failed:", error);
          });
        });
      }
    }
  }

  async buildSchema(options?: { output?: string }): Promise<SyncSchema> {
    const schemaManager = options?.output
      ? new SchemaManager({
          ...(this.input.schema ?? {}),
          output: options.output,
          autoBuild: false,
          watch: false,
        })
      : this._schemaManager;

    if (!schemaManager) {
      throw new Error("SchemaManager not initialized. Add 'schema' config to defineSyncConfig.");
    }

    const validation = validateSyncConfig(this.getRuntimeConfig());
    if (!validation.valid) {
      const message = validation.errors
        .map((error) => `${error.path}: ${error.message}`)
        .join("\n");
      throw new Error(`Invalid sync configuration:\n${message}`);
    }

    const graph = buildRelationGraph(this.input.entities);
    return schemaManager.build(this.input.entities, graph, this.input.tenancy);
  }

  getSchema(): SyncSchema | undefined {
    return this._schemaManager?.getSchema();
  }

  getRuntimeConfig(): RuntimeSyncConfig<TEntities> {
    return {
      entities: this.input.entities,
      tenancy: this.input.tenancy,
      options: this.input.options,
    };
  }

  startWatch(): void {
    if (!this._schemaManager) {
      return;
    }

    this._schemaManager.startWatch(async () => {
      await this.buildSchema();
      console.log(`[drizzle-sync] schema rebuilt at ${new Date().toISOString()}`);
    });
  }

  stopWatch(): void {
    this._schemaManager?.stopWatch();
  }

  get entities(): TEntities {
    return this.input.entities;
  }

  get options(): SyncConfig<TEntities>["options"] {
    return this.input.options;
  }

  get schemaConfig(): SchemaConfig | undefined {
    return this.input.schema;
  }

  get schema(): SchemaManager | undefined {
    return this._schemaManager;
  }
}
