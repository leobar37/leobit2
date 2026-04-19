import { readFileSync, existsSync } from "fs";
import { resolve } from "path";

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

  if (!config.entities) {
    throw new Error(`Config must have 'entities' property`);
  }

  return config;
}
