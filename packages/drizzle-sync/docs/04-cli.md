# CLI Reference

Command-line interface for `@avileo/drizzle-sync`.

## Installation

```bash
# As local dependency
npm install --save-dev @avileo/drizzle-sync

# Or use directly with npx
npx drizzle-sync <command>
```

## Global Options

These options apply to all commands:

| Flag | Description |
|------|-------------|
| `-s, --schema <path>` | Path to `sync.schema.json` |
| `-h, --help` | Show help |
| `-V, --version` | Show version |

## Commands

### build-schema

Build `sync.schema.json` from `sync.config.ts`.

```bash
drizzle-sync build-schema [options]
```

**Options:**

| Flag | Default | Description |
|------|---------|-------------|
| `-c, --config <path>` | `./src/sync.config.ts` | Path to sync config |

**Example:**

```bash
# Default path
drizzle-sync build-schema

# Custom config path
drizzle-sync build-schema -c ./backend/src/sync.config.ts
```

**Output:**

```
Schema generated at ./src/sync.schema.json
```

---

### generate

Generate all frontend code from `sync.schema.json`.

```bash
drizzle-sync generate [options]
```

**Options:**

| Flag | Default | Description |
|------|---------|-------------|
| `-c, --config <path>` | `./src/sync.config.ts` | Path to sync config |
| `-o, --output <path>` | `./generated` | Output directory |
| `--dry-run` | `false` | Show what would be generated |

**Example:**

```bash
# Generate to default location
drizzle-sync generate

# Generate to custom location
drizzle-sync generate -o ./src/generated

# Dry run (see what would be generated)
drizzle-sync generate --dry-run
```

**Dry Run Output:**

```
DRY RUN - Would generate:
- schemas.ts (14 schemas)
- init.sql (14 tables)
- applier.ts (column mappings)
- hooks.ts (70 hooks)
- types.ts (TypeScript types)

- services.ts (CRUD services)
- engine.ts (engine factory)
- query-keys.ts (cache keys)
- table-registry.ts (table registry)
```

---

### validate

Validate `sync.schema.json` without generating code.

```bash
drizzle-sync validate [options]
```

**Options:**

| Flag | Default | Description |
|------|---------|-------------|
| `-s, --schema <path>` | (searches up) | Path to schema file |

**Example:**

```bash
drizzle-sync validate
```

**Output:**

```
Schema loaded
Schema is valid

Entities:
- customers
- sales
- sale_items
- products
- ...

Total: 14 entities
```

---

### clean

Remove all generated files.

```bash
drizzle-sync clean [options]
```

**Options:**

| Flag | Default | Description |
|------|---------|-------------|
| `-o, --output <path>` | `./generated` | Output directory |

**Example:**

```bash
drizzle-sync clean
```

---

## Generated Files

The `generate` command creates these files:

| File | Description |
|------|-------------|
| `schemas.ts` | Zod schemas for all entities |
| `init.sql` | PostgreSQL DDL for PGlite tables |
| `schema-sql.ts` | SQL as TypeScript string |
| `applier.ts` | Column mappings for change application |
| `hooks.ts` | TanStack Query hooks (5 per entity) |
| `services.ts` | BaseService subclasses |
| `types.ts` | TypeScript type exports |
| `query-keys.ts` | TanStack Query cache keys |
| `engine.ts` | Engine factory function |
| `table-registry.ts` | Table registry for export/import |

### Generated Hooks (per entity)

Each entity generates these React hooks:

```typescript
// For "customers" entity:
useCustomers()           // List all
useCustomer(id)          // Get one
useCreateCustomer()      // Create mutation
useUpdateCustomer()      // Update mutation
useDeleteCustomer()      // Delete mutation
```

## Workflow

Typical development workflow:

```bash
# 1. Define/update sync.config.ts
vim ./src/sync.config.ts

# 2. Build the schema
drizzle-sync build-schema

# 3. Generate frontend code
drizzle-sync generate -o ./src/generated

# 4. Validate the schema
drizzle-sync validate
```

## Programmatic Usage

Use the CLI functions in your own scripts:

```typescript
import { loadSchema } from "@avileo/drizzle-sync/cli/schema-loader";
import { generateAll } from "@avileo/drizzle-sync/config/generator";

const schema = await loadSchema("./sync.schema.json");
const output = await generateAll(schema, { outputDir: "./generated" });

console.log("Generated:", output.files);
```

## Next Steps

- [Quick Start](./01-quickstart.md) - Get running
- [Backend Config](./03-backend-config.md) - Configure sync
- [Frontend React](./05-frontend-react.md) - Use generated code
