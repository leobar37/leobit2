# Backend Configuration

Complete guide to configuring sync in your Drizzle/PostgreSQL backend.

## Overview

The sync config is defined using `defineSyncConfig()` in a TypeScript file. This config is used by:

1. The CLI to generate `sync.schema.json`
2. The CLI to generate frontend code
3. The server runtime to process sync operations

## Basic Setup

```typescript
// src/sync.config.ts
import { defineSyncConfig } from "@avileo/drizzle-sync/config";
import { customers } from "./db/schema";

export const syncConfig = defineSyncConfig({
  entities: {
    customers: {
      table: customers,
      syncable: true,
    },
  },
});
```

## Entity Configuration

### Required Fields

```typescript
customers: {
  table: customers,        // Drizzle table reference
  syncable: true,          // Enable sync for this entity
},
```

### Optional Fields

```typescript
products: {
  table: products,
  syncable: true,

  // Explicitly specify fields (default: all)
  fields: ["id", "name", "price", "stock"],

  // Or use autoFields (includes all except excluded)
  autoFields: true,
  excludeFields: ["internal_notes", "cost_price"],

  // Conflict resolution strategy
  conflictResolver: "version-based", // | "last-write-wins" | "merge"

  // API path override (default: entity name)
  apiPath: "products",

  // Relations to other entities
  relations: {
    children: [
      { entity: "product_variants", foreignKey: "product_id", cascade: true },
    ],
    parents: [
      { entity: "categories", foreignKey: "category_id" },
    ],
  },

  // Field codecs for serialization
  fieldCodecs: {
    price: currency(),
    weight: weight({ nullable: true }),
  },

  // Custom metadata
  metadata: {
    isJunctionTable: true,
  },
},
```

## Field Codecs

Codecs handle serialization of special field types:

```typescript
import { currency, weight, dateOnly, emptyStringToNull } from "@avileo/drizzle-sync/codecs";

// Currency (stored as string in DB, number in code)
fieldCodecs: {
  total_amount: currency(),
  amount_paid: currency({ nullable: true }),
}

// Weight in kg
fieldCodecs: {
  weight_kg: weight(),
  tara: weight({ nullable: true }),
}

// Date-only fields
fieldCodecs: {
  birth_date: dateOnly(),
}

// Empty string → null
fieldCodecs: {
  optional_note: emptyStringToNull(),
}
```

### Built-in Codecs

| Codec | Input Type | DB Type | Use Case |
|-------|------------|---------|----------|
| `currency()` | `number` | `string` | Money (PEN) |
| `weight()` | `number` | `string` | Weight in kg |
| `dateOnly()` | `Date` | `string` | Date without time |
| `emptyStringToNull()` | `string` | `string\|null` | Optional text |

## Relations

Define parent-child relationships for proper sync ordering:

```typescript
sales: {
  table: sales,
  syncable: true,
  relations: {
    children: [
      {
        entity: "sale_items",      // Entity name
        foreignKey: "sale_id",     // Foreign key column
        cascade: true,             // Delete children with parent
      },
    ],
  },
},
```

### Why Relations Matter

1. **Ordering** - Parents sync before children
2. **Cascade** - Child operations are grouped with parent
3. **Referential Integrity** - Handle FK constraints during conflict resolution

## Multi-Tenancy

Configure tenant isolation:

```typescript
export const syncConfig = defineSyncConfig({
  // ... entities

  tenancy: {
    tenantColumn: "business_id",  // Column in tables
    tenantField: "businessId",    // Field in operations
  },
});
```

This ensures all queries are scoped to the correct tenant.

## Sync Options

```typescript
export const syncConfig = defineSyncConfig({
  // ... entities

  options: {
    batchSize: 50,           // Operations per batch
    maxRetries: 3,          // Retry attempts before DLQ
    syncInterval: 30000,     // Auto-sync interval (ms)
    pullInterval: 10000,     // Auto-pull interval (ms)
  },
});
```

## Schema Output

```typescript
export const syncConfig = defineSyncConfig({
  // ... config

  schema: {
    output: "./src/sync.schema.json",  // Generated schema path
    autoBuild: true,                    // Build on config change
    watch: process.env.NODE_ENV === "development",  // Watch mode
    watchPath: "./src/sync.config.ts", // Config file to watch
  },
});
```

## Complete Example

```typescript
import { defineSyncConfig } from "@avileo/drizzle-sync/config";
import { currency, weight } from "@avileo/drizzle-sync/codecs";
import {
  customers,
  sales,
  saleItems,
  products,
  suppliers,
} from "./db/schema";

export const syncConfig = defineSyncConfig({
  entities: {
    customers: {
      table: customers,
      syncable: true,
      conflictResolver: "version-based",
    },

    products: {
      table: products,
      syncable: true,
      autoFields: true,
      excludeFields: ["cost_price"],
      conflictResolver: "version-based",
    },

    suppliers: {
      table: suppliers,
      syncable: true,
      conflictResolver: "version-based",
    },

    sales: {
      table: sales,
      syncable: true,
      conflictResolver: "version-based",
      fieldCodecs: {
        total_amount: currency(),
        amount_paid: currency({ nullable: true }),
        balance_due: currency({ nullable: true }),
        tara: weight({ nullable: true }),
        net_weight: weight({ nullable: true }),
      },
      relations: {
        children: [
          { entity: "sale_items", foreignKey: "sale_id", cascade: true },
        ],
      },
    },

    sale_items: {
      table: saleItems,
      syncable: true,
      conflictResolver: "version-based",
      fieldCodecs: {
        quantity: weight({ nullable: true }),
        unit_price: currency({ nullable: true }),
        subtotal: currency(),
      },
    },
  },

  tenancy: {
    tenantColumn: "business_id",
    tenantField: "businessId",
  },

  options: {
    batchSize: 50,
    maxRetries: 3,
    syncInterval: 30000,
  },

  schema: {
    output: "./src/sync.schema.json",
    autoBuild: true,
  },
});
```

## Validation

Validate your config:

```typescript
import { validateConfig } from "@avileo/drizzle-sync/config";

const result = validateConfig(syncConfig);
if (!result.valid) {
  console.error("Config errors:");
  result.errors.forEach(e => {
    console.error(`  ${e.path}: ${e.message}`);
    if (e.hint) console.error(`  Hint: ${e.hint}`);
  });
}
```

## Next Steps

- [CLI Reference](./04-cli.md) - Generate schema and code
- [Architecture](./02-architecture.md) - Understand the system
- [Concepts](./06-concepts.md) - Sync mechanics deep dive
