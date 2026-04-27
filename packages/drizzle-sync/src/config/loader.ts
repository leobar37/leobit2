import { existsSync } from "fs";
import { resolve } from "path";
import type { SyncConfigBuilder } from "./builder";
import type { DrizzleSyncProjectConfig } from "./types";

export async function loadConfig(configPath: string) {
  const absolutePath = resolve(configPath);

  if (!existsSync(absolutePath)) {
    throw new Error(`Config file not found: ${absolutePath}`);
  }

  const module = await import(absolutePath);

  const config = module.syncConfig || module.default;

  if (!config) {
    throw new Error(`Config must export 'syncConfig'`);
  }

  const maybeBuilder = config as SyncConfigBuilder & { entities?: unknown };
  if (!maybeBuilder.entities && typeof maybeBuilder.getRuntimeConfig !== "function") {
    throw new Error(`Config must have 'entities' property or export SyncConfigBuilder`);
  }

  return config;
}

export async function loadProjectConfig(configPath: string): Promise<DrizzleSyncProjectConfig> {
  const absolutePath = resolve(configPath);

  if (!existsSync(absolutePath)) {
    throw new Error(`Config file not found: ${absolutePath}`);
  }

  const module = await import(absolutePath);
  const config = module.drizzleSyncConfig || module.default;

  if (!isProjectConfig(config)) {
    throw new Error(`Config must export defineDrizzleSyncProject(...) result.`);
  }

  return config;
}

export function isProjectConfig(config: unknown): config is DrizzleSyncProjectConfig {
  if (!config || typeof config !== "object") {
    return false;
  }

  const candidate = config as Partial<DrizzleSyncProjectConfig>;
  return typeof candidate.schemaConfig === "string" && typeof candidate.clientOutput === "string";
}
