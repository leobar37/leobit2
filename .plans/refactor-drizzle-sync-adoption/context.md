# Refactor Drizzle Sync Adoption - Context

## Overview

This plan addresses the inconsistent and incorrect usage of `@avileo/drizzle-sync` (the separated SQL/sync framework) across the client flows (customers, debts/payments, and sales). The codebase currently mixes direct SQL queries (`pg.query()`), Drizzle ORM, and the sync library in ways that create maintenance burden, sync ordering bugs, and potential data inconsistency.

## Background

`@avileo/drizzle-sync` was extracted from the main Avileo codebase into a separate monorepo package to consolidate offline-first sync logic. It provides:
- Bidirectional sync (push/pull) with operation queuing
- Version-based conflict resolution
- Parent-before-child ordering via priorities
- Code generation (services, hooks, schemas) from Drizzle schema
- React integration (SyncProvider, hooks)

However, after separation, several frontend services continued using raw SQL (`pg.query()`) instead of the generated Drizzle-sync services or Drizzle ORM. Additionally, the sync configuration has inconsistencies that could cause foreign key constraint failures during sync.

## Goal

All frontend services for customers, payments (abonos), and sales use Drizzle ORM or generated drizzle-sync services consistently. The sync configuration is corrected so that parent entities are always processed before children, and all syncable entities are properly registered.

## Key Decisions

- **Keep SaleService extending BaseService**: The SaleService manages two entities atomically (sales + sale_items) with complex business logic. It will continue composing GeneratedSalesService and GeneratedItemsService rather than extending them directly. This pattern is documented and justified.
- **Replace raw SQL gradually**: Each service will be refactored independently to minimize risk.
- **Sync config changes are foundational**: All sync config fixes must be completed before any service refactor, because FK ordering depends on correct priorities.

## Scope Boundaries

- **In scope**:
  - Sync configuration fixes (`SYNC_ENTITIES`, `ENTITY_PRIORITIES`, parent/child relationships)
  - Frontend service refactoring (`payment-service.ts`, `sale-service.ts`, `purchase-service.ts`, `distribucion-service.ts`)
  - Integration testing of sync flows
  - Documentation updates for patterns

- **Out of scope**:
  - Backend repository refactoring (backend already uses Drizzle ORM correctly)
  - Changes to the `@avileo/drizzle-sync` library itself
  - New features or UI changes
  - Performance optimization beyond removing raw SQL
