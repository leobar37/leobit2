# Schema-First Sync Code Generation System

## Overview

Implement a declarative configuration system that uses Drizzle ORM schema as the single source of truth to automatically generate frontend code for the offline-first synchronization system.

### Current State

The project currently has:
- **Backend**: Drizzle ORM schema in `packages/backend/src/db/schema/` defining tables
- **Frontend**: Manual Zod schemas in `packages/app/app/lib/db/schema.ts` 
- **Sync**: Hardcoded column mappings in `packages/drizzle-sync/src/pglite/schema-mapper.ts`
- **Change Applier**: SQL raw queries with hardcoded table/column whitelists

**Problems**:
1. Schema duplication between backend (Drizzle) and frontend (Zod)
2. Manual maintenance of column mappings in change-applier
3. Risk of desync when backend schema changes
4. No single source of truth

### Goal

Create a code generation system where:
1. Backend `sync.config.ts` defines sync entities declaratively
2. CLI tool `bun run sync:generate` reads Drizzle schema
3. Automatically generates frontend code:
   - Zod schemas for validation
   - PGlite DDL (CREATE TABLE statements)
   - Change applier column mappings
   - React hooks for data fetching
   - TypeScript types

### Key Design Decisions

| Aspect | Decision | Rationale |
|--------|----------|-----------|
| **ID Generation** | **Frontend CUID2** | URLs stable from creation, no mapping complexity |
| Config location | `packages/backend/src/sync.config.ts` | Backend is source of truth |
| Field definition | Hybrid approach | Flexibility: auto / explicit / exclude |
| Generation trigger | Manual command | Developer control over when to sync |
| Change applier | SQL raw | Keep current lightweight approach |
| Output location | `packages/app/app/lib/db/generated/` | Clear separation from manual code |

### ID Architecture (CUID2 Frontend)

```
┌─────────────────┐         ┌─────────────────┐         ┌─────────────────┐
│   Frontend      │         │    Backend      │         │   PostgreSQL    │
│                 │         │                 │         │                 │
│  createId()     │─────────│→  Accept ID     │─────────│→  Store as PK   │
│  "cm9abc123..." │         │  (no generation)│         │  (same ID)      │
└─────────────────┘         └─────────────────┘         └─────────────────┘
         │                            │                            │
         ▼                            ▼                            ▼
┌─────────────────┐         ┌─────────────────┐         ┌─────────────────┐
│   URL:          │         │   PGlite Local  │         │   References    │
│ /sales/cm9abc123│         │   (same ID)     │         │   work without  │
│   (STABLE!)     │         │                 │         │   complexity    │
└─────────────────┘         └─────────────────┘         └─────────────────┘
```

**Benefits:**
- URLs are stable from the moment of creation
- No temp→real ID mapping needed
- References use actual IDs (not @ref: placeholders)
- 100% offline capable
- No post-sync redirects

### Scope

**In Scope**:
- Config definition API (`defineSyncConfig`)
- CLI tool with introspection
- Generators for all 5 output types
- Backend integration (sync.config.ts)
- Frontend integration (import generated code)
- Validation and diff commands
- CUID2 ID generation in frontend

**Out of Scope**:
- Watch mode (phase 2)
- Drizzle ORM in frontend (keeping SQL raw)
- Automatic migration generation
- GUI for configuration
- Temp→real ID mapping (we use CUID2 instead)

## Architecture

```
packages/
├── backend/
│   ├── src/
│   │   ├── db/schema/          # Drizzle schema (source of truth)
│   │   │   └── uses text IDs   # (not defaultRandom uuid)
│   │   └── sync.config.ts      # Declarative sync configuration
│   └── package.json            # Add sync:generate script
│
├── drizzle-sync/               # Enhanced framework
│   ├── src/
│   │   ├── config/
│   │   │   ├── define-config.ts     # defineSyncConfig() API
│   │   │   ├── types.ts             # Config types
│   │   │   ├── validator.ts         # Config validation
│   │   │   ├── introspect.ts        # Drizzle introspection
│   │   │   └── generator.ts         # Code generators
│   │   ├── cli.ts                     # CLI entry point
│   │   └── pglite/
│   │       └── generated-types.ts   # Types for generated code
│   └── package.json
│       └── bin: "./dist/cli.js"     # CLI executable
│
└── app/
    └── app/
        └── lib/
            └── db/
                ├── generated/         # 🆕 AUTO-GENERATED (gitignored)
                │   ├── schemas.ts     # Zod schemas
                │   ├── init.sql       # PGlite DDL
                │   ├── applier.ts     # Change applier config
                │   ├── hooks.ts       # React hooks (with CUID2)
                │   └── types.ts       # TypeScript types
                ├── schema.ts          # Manual schemas (legacy, migrate to generated)
                └── collections.ts     # Uses generated code
```

## Workflow

### Developer Workflow

1. **Define/Update Schema** (backend)
   ```typescript
   // packages/backend/src/db/schema/customers.ts
   export const customers = pgTable("customers", {
     id: text("id").primaryKey(), // No default - accepts client ID
     name: varchar("name").notNull(),
     email: varchar("email"), // ← new field
   });
   ```

2. **Update Config** (backend)
   ```typescript
   // packages/backend/src/sync.config.ts
   export const syncConfig = defineSyncConfig({
     entities: {
       customers: {
         table: customers,
         syncable: true,
         // Option A: Auto (all fields)
         // Option B: Explicit
         fields: ["id", "name", "email", "sync_status"],
       }
     }
   });
   ```

3. **Generate Code**
   ```bash
   $ bun run sync:generate
   
   ✅ Introspecting Drizzle schema...
   ✅ Found 6 syncable entities
   ✅ Generated:
      - packages/app/app/lib/db/generated/schemas.ts (6 schemas)
      - packages/app/app/lib/db/generated/init.sql (6 tables)
      - packages/app/app/lib/db/generated/applier.ts (6 configs)
      - packages/app/app/lib/db/generated/hooks.ts (12 hooks with CUID2)
      - packages/app/app/lib/db/generated/types.ts (12 types)
   
   Changes detected:
     - customers: Added field 'email'
   ```

4. **Use in Frontend** (CUID2 IDs)
   ```typescript
   // Frontend code uses generated schemas and hooks
   import { useCreateSale, useCreateSaleItem } from "~/lib/db/generated/hooks";
   
   function SaleForm() {
     const createSale = useCreateSale();
     const createItem = useCreateSaleItem();
     
     const handleSubmit = async (data) => {
       // ID generado automáticamente por el hook
       const sale = await createSale.mutateAsync({ 
         total: 100,
         customerId: "cust_123"
       });
       
       // URL es inmediatamente válida: /sales/{sale.id}
       navigate(`/sales/${sale.id}/items`);
       
       // Agregar items con referencia directa (no @ref:)
       await createItem.mutateAsync({
         saleId: sale.id,  // ← ID real CUID2
         productId: "prod_1",
         quantity: 2
       });
     };
   }
   ```

## Technical Notes

### Hybrid Field Definition

The config supports three modes:

```typescript
// Mode 1: Auto (all columns from Drizzle)
customers: {
  table: customers,
  syncable: true,
  // No 'fields' = auto all
}

// Mode 2: Explicit whitelist
customers: {
  table: customers,
  syncable: true,
  fields: ["id", "name", "dni"],
}

// Mode 3: Auto + exclusions
customers: {
  table: customers,
  syncable: true,
  autoFields: true,
  excludeFields: ["internal_notes", "stripe_id"],
}
```

### ID Generation Strategy (CUID2)

```typescript
// packages/drizzle-sync/src/utils/id.ts
import { createId } from "@paralleldrive/cuid2";

export { createId };

// Hooks generados usan createId() automáticamente:
export function useCreateSale() {
  return useMutation({
    mutationFn: async (input) => {
      const id = createId(); // "cm9abc123xyz..."
      const response = await api.sales.post({ ...input, id });
      return response.data;
    }
  });
}
```

### Backend Schema Changes (Required)

```typescript
// Before (UUID autogenerated):
export const sales = pgTable("sales", {
  id: uuid("id").primaryKey().defaultRandom(), // ❌ No acepta IDs cliente
  // ...
});

// After (CUID2 from client):
export const sales = pgTable("sales", {
  id: text("id").primaryKey(), // ✅ Acepta CUID2 del cliente
  // ...
});
```

### Introspection Strategy

Use Drizzle's `getTableColumns()` to extract:
- Column names
- Data types
- Not-null constraints
- Default values
- Primary key status

Map Drizzle types to:
- Zod types (for validation)
- PGlite types (for DDL)
- TypeScript types (for codegen)

### CLI Commands

| Command | Description |
|---------|-------------|
| `bun run sync:generate` | Generate all frontend code |
| `bun run sync:validate` | Validate config without generating |
| `bun run sync:diff` | Show diff between schema and generated |
| `bun run sync:clean` | Remove generated files |

## References

- **Drizzle Introspection**: Use `getTableColumns()` from `drizzle-orm`
- **Current Change Applier**: `packages/drizzle-sync/src/pglite/schema-mapper.ts`
- **Current Frontend Schema**: `packages/app/app/lib/db/schema.ts`
- **Backend Schema**: `packages/backend/src/db/schema/`
- **CUID2**: `@paralleldrive/cuid2` for collision-resistant IDs

## Open Questions

1. ~~How to handle relations (nested objects) in generation?~~ → **CUID2 IDs frontend**
2. Should we generate migration scripts for existing PGlite databases?
3. How to handle custom Zod refinements (e.g., phone validation)?

---
*Plan created: 2026-04-18*
*Updated: 2026-04-18 (CUID2 frontend ID strategy)*
*Mode: Structured*
