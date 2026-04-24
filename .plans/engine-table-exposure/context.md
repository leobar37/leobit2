# Engine Table Exposure - Context

## Overview

This plan implements a centralized schema exposure mechanism where the `SyncClientEngine` exposes all Drizzle ORM tables through a typed `tables` property. This eliminates the need for frontend services to import table definitions directly from `@avileo/shared`, decoupling services from the shared schema package and centralizing database access patterns.

## Background

Currently, frontend services (both generated and custom) import Drizzle table objects directly from `@avileo/shared`:

```typescript
// payment-service.ts
import { abonos, customers, sales } from "@avileo/shared";

// sale-service.ts
import { sales as salesTable, saleItems as saleItemsTable, customers } from "@avileo/shared";
```

This creates tight coupling between the service layer and the schema package. Additionally, generated services reference a non-existent file (`~/lib/sync/drizzle-schema`) which was intended to be the schema source but was never implemented.

## Goal

After this plan is complete:
1. All Drizzle tables are accessible via `engine.tables` as type-safe properties
2. `BaseService` exposes `this.tables` to all subclasses
3. Custom services no longer import table objects from `@avileo/shared`
4. Generated services import from the actual generated file (`~/lib/sync/drizzle-schema`)
5. The codebase has a single source of truth for schema access: the engine

## Key Decisions

- **Option B chosen**: Engine exposes `tables` as a typed property (`engine.tables.customers`)
- **File name**: `drizzle-schema.ts` (fixes the broken import path in generated services)
- **Type generation**: Use TypeScript `typeof` to maintain full Drizzle type inference
- **Backward compatibility**: Existing imports from `@avileo/shared` will continue to work during migration
- **Generator update**: The code generator must be updated to produce `drizzle-schema.ts`

## Scope Boundaries

- **In scope**:
  - Generate `drizzle-schema.ts` file with all table exports
  - Extend `SyncClientEngine` with `tables` property
  - Update `BaseService` to expose `this.tables`
  - Refactor custom services (payment, sale, purchase, distribucion, customer, inventory)
  - Update code generator to produce `drizzle-schema.ts`
  - Update generated services import path

- **Out of scope**:
  - Changes to `@avileo/shared` schema definitions
  - Backend changes
  - Database migrations
  - Removing `@avileo/shared` dependency entirely (types may still be needed)
  - Changes to Drizzle ORM library itself
