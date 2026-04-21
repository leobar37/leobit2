import { watch, type FSWatcher } from "fs";
import { mkdir, readFile, writeFile } from "fs/promises";
import { dirname, resolve } from "path";
import { getTableName } from "drizzle-orm";
import { introspectTable } from "./introspect";
import {
  serializeColumns,
  serializeEntityConfig,
  serializeRelationNode,
} from "./serializer";
import type { SyncSchema, SerializedEntity } from "./schema-types";
import { SYNC_SCHEMA_VERSION } from "./schema-types";
import type { EntitySyncConfig, RelationGraph, SchemaConfig } from "./types";

type OnWatchChange = () => void | Promise<void>;

export class SchemaManager {
  private readonly config: Required<SchemaConfig>;
  private currentSchema?: SyncSchema;
  private watcher?: FSWatcher;
  private debounceTimer?: ReturnType<typeof setTimeout>;

  constructor(config: SchemaConfig) {
    this.config = {
      output: config.output,
      format: config.format ?? "json",
      autoBuild: config.autoBuild ?? true,
      watch: config.watch ?? false,
      watchPath: config.watchPath ?? config.output,
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
        graph: serializeRelationNode(relations[name] ?? { parents: [], children: [], priority: 1 }),
      };
    }

    this.currentSchema = {
      version: SYNC_SCHEMA_VERSION,
      generatedAt: new Date().toISOString(),
      entities: serializedEntities,
    };

    if (this.config.autoBuild) {
      await this.save();
    }

    return this.currentSchema;
  }

  async save(): Promise<void> {
    if (!this.currentSchema) {
      throw new Error("No schema to save. Call build() first.");
    }

    const outputPath = this.getOutputPath();
    await mkdir(dirname(outputPath), { recursive: true });
    await writeFile(outputPath, `${JSON.stringify(this.currentSchema, null, 2)}\n`, "utf-8");
  }

  async load(): Promise<SyncSchema> {
    const outputPath = this.getOutputPath();
    const content = await readFile(outputPath, "utf-8");
    const parsed = JSON.parse(content) as SyncSchema;
    this.currentSchema = parsed;
    return parsed;
  }

  startWatch(onChange: OnWatchChange): void {
    if (this.watcher) {
      return;
    }

    const watchTarget = resolve(this.config.watchPath);
    this.watcher = watch(watchTarget, () => {
      if (this.debounceTimer) {
        clearTimeout(this.debounceTimer);
      }

      this.debounceTimer = setTimeout(() => {
        console.log("[drizzle-sync] schema source changed, rebuilding...");
        void Promise.resolve(onChange()).catch((error) => {
          console.error("[drizzle-sync] schema watch callback failed:", error);
        });
      }, 500);
    });
  }

  stopWatch(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = undefined;
    }

    this.watcher?.close();
    this.watcher = undefined;
  }

  isWatching(): boolean {
    return this.watcher !== undefined;
  }

  getSchema(): SyncSchema | undefined {
    return this.currentSchema;
  }

  getOutputPath(): string {
    return resolve(this.config.output);
  }

  private extractTableName(table: unknown): string {
    try {
      return getTableName(table as Parameters<typeof getTableName>[0]);
    } catch {
      const tableName = (table as { name?: unknown }).name;
      return typeof tableName === "string" ? tableName : "";
    }
  }
}
