import { existsSync } from "fs";
import { readFile } from "fs/promises";
import { dirname, resolve } from "path";
import type { SyncSchema } from "../config/schema-types";
import { SYNC_SCHEMA_VERSION } from "../config/schema-types";

const SCHEMA_FILE_NAMES = ["sync.schema.json"];

export function validateSchema(schema: unknown): schema is SyncSchema {
  if (!schema || typeof schema !== "object") {
    return false;
  }

  const candidate = schema as Record<string, unknown>;
  if (typeof candidate.version !== "string") {
    return false;
  }

  if (typeof candidate.generatedAt !== "string") {
    return false;
  }

  if (!candidate.entities || typeof candidate.entities !== "object") {
    return false;
  }

  const entities = candidate.entities as Record<string, unknown>;
  return Object.values(entities).every((entity) => {
    if (!entity || typeof entity !== "object") {
      return false;
    }

    const typed = entity as Record<string, unknown>;
    return (
      typeof typed.name === "string" &&
      typeof typed.tableName === "string" &&
      Array.isArray(typed.columns) &&
      !!typed.config &&
      typeof typed.config === "object" &&
      !!typed.graph &&
      typeof typed.graph === "object"
    );
  });
}

export function isVersionCompatible(schemaVersion: string): boolean {
  const currentMajor = SYNC_SCHEMA_VERSION.split(".")[0];
  const schemaMajor = schemaVersion.split(".")[0];
  return currentMajor === schemaMajor;
}

export async function loadSchema(schemaPath: string): Promise<SyncSchema> {
  const absolutePath = resolve(schemaPath);

  if (!existsSync(absolutePath)) {
    throw new Error(`Schema file not found: ${absolutePath}`);
  }

  const raw = await readFile(absolutePath, "utf-8");
  let parsed: unknown;

  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(`Invalid JSON schema file: ${absolutePath}`);
  }

  if (!validateSchema(parsed)) {
    throw new Error(`Invalid sync schema format: ${absolutePath}`);
  }

  if (!isVersionCompatible(parsed.version)) {
    throw new Error(
      `Schema version ${parsed.version} is incompatible with CLI version ${SYNC_SCHEMA_VERSION}`
    );
  }

  return parsed;
}

export function findSchema(startPath = process.cwd()): string | null {
  let currentPath = resolve(startPath);

  while (true) {
    for (const fileName of SCHEMA_FILE_NAMES) {
      const candidate = resolve(currentPath, fileName);
      if (existsSync(candidate)) {
        return candidate;
      }
    }

    const parent = dirname(currentPath);
    if (parent === currentPath) {
      break;
    }

    currentPath = parent;
  }

  return null;
}
