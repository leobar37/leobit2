# T-008: Create CLI schema-loader.ts

## Objective
Create a module for the CLI that can load and validate sync.schema.json files without executing TypeScript.

## Requirements
- FR-005: CLI Reads Schema JSON

## Files to Create
- `packages/drizzle-sync/src/cli/schema-loader.ts`

## Implementation Details

### Functions to Implement

```typescript
/**
 * Load schema from file path
 */
export async function loadSchema(schemaPath: string): Promise<SyncSchema>

/**
 * Find schema.json in current directory or parent directories
 */
export async function findSchema(cwd?: string): Promise<string | null>

/**
 * Validate schema format and version
 */
export function validateSchema(schema: unknown): schema is SyncSchema

/**
 * Check if schema version is compatible with current CLI
 */
export function isVersionCompatible(schemaVersion: string): boolean
```

### Implementation

```typescript
import { readFile } from "fs/promises";
import { existsSync } from "fs";
import { resolve, dirname } from "path";
import { SyncSchema } from "../config/schema-types";

const CURRENT_SCHEMA_VERSION = "1.0.0";
const SCHEMA_FILENAMES = ["sync.schema.json", ".drizzle-sync/schema.json"];

export async function loadSchema(schemaPath: string): Promise<SyncSchema> {
  const absolutePath = resolve(schemaPath);
  
  if (!existsSync(absolutePath)) {
    throw new Error(`Schema file not found: ${absolutePath}`);
  }
  
  const content = await readFile(absolutePath, "utf-8");
  let schema: unknown;
  
  try {
    schema = JSON.parse(content);
  } catch (err) {
    throw new Error(`Invalid JSON in schema file: ${err}`);
  }
  
  if (!validateSchema(schema)) {
    throw new Error("Invalid schema format. Run 'drizzle-sync build-schema' first.");
  }
  
  if (!isVersionCompatible(schema.version)) {
    throw new Error(
      `Schema version ${schema.version} is not compatible. ` +
      `Expected: ${CURRENT_SCHEMA_VERSION}. ` +
      `Please rebuild the schema.`
    );
  }
  
  return schema;
}

export async function findSchema(cwd: string = process.cwd()): Promise<string | null> {
  let currentDir = resolve(cwd);
  
  while (currentDir !== dirname(currentDir)) {
    for (const filename of SCHEMA_FILENAMES) {
      const schemaPath = resolve(currentDir, filename);
      if (existsSync(schemaPath)) {
        return schemaPath;
      }
    }
    currentDir = dirname(currentDir);
  }
  
  return null;
}

export function validateSchema(schema: unknown): schema is SyncSchema {
  if (typeof schema !== "object" || schema === null) {
    return false;
  }
  
  const s = schema as Record<string, unknown>;
  
  // Check required fields
  if (typeof s.version !== "string") return false;
  if (typeof s.generatedAt !== "string") return false;
  if (typeof s.entities !== "object" || s.entities === null) return false;
  
  // Check entities structure
  for (const [name, entity] of Object.entries(s.entities)) {
    if (!validateEntity(entity)) return false;
  }
  
  return true;
}

function validateEntity(entity: unknown): boolean {
  if (typeof entity !== "object" || entity === null) return false;
  
  const e = entity as Record<string, unknown>;
  if (typeof e.name !== "string") return false;
  if (typeof e.tableName !== "string") return false;
  if (!Array.isArray(e.columns)) return false;
  if (typeof e.config !== "object") return false;
  if (typeof e.graph !== "object") return false;
  
  return true;
}

export function isVersionCompatible(schemaVersion: string): boolean {
  // Simple semver check: major version must match
  const currentMajor = CURRENT_SCHEMA_VERSION.split(".")[0];
  const schemaMajor = schemaVersion.split(".")[0];
  return currentMajor === schemaMajor;
}
```

## Validation

- [ ] Can load valid schema.json
- [ ] Throws on missing file
- [ ] Throws on invalid JSON
- [ ] Throws on incompatible version
- [ ] findSchema searches current and parent directories
- [ ] Validates all required fields

## Notes

- This is the ONLY module in CLI that reads files
- All other CLI commands depend on this
- Keep validation strict but helpful error messages
