import { readFileSync, existsSync } from "fs";
import { resolve } from "path";
import type { SyncConfigBuilder } from "./builder";

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
