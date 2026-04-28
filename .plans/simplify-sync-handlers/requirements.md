# Simplify Sync Handlers Requirements

## Objective

Eliminate custom sync handler subclasses and transition state machines from the backend, replacing them with `SyncHandlerBuilder`-based generic handlers that treat sync operations as pure "parse → persist" operations. This formalizes Avileo's **cuaderno-first** architecture: the frontend/PGlite layer is the seller's local business notebook and must remain complete and useful without internet.

## Scope

- In scope: Backend sync handlers for sales, distribuciones, purchases; backend state machine transitions for sale/distribucion/purchase; snapshot fields in sales schema; initial payment creation logic; `StatefulSyncHandler` and backend `BaseSyncHandler` base classes
- Out of scope: Frontend service refactoring (separate follow-up plan); `staff-invitation.ts` transitions; `drizzle-sync` framework package changes; the 11 already-generic handlers in `registry.ts`; E2E test rewrites; migration scripts for existing data

## Functional Requirements

- `FR-001` - Sales sync handler must use `SyncHandlerBuilder` with `withVersionConflictField("version")` for conflict detection, replacing the manual version check in `SaleSyncHandler.handleUpdate`
- `FR-002` - Sales sync handler must accept any valid `saleUpdateSchema` payload and persist it directly via `saleRepo.update`, without branching on `status` transitions
- `FR-003` - Sales sync handler must support create with embedded items via `withCustomCreate` that delegates to `saleRepo.create` (which already handles parent + items in one transaction)
- `FR-004` - Distribuciones sync handler must use `SyncHandlerBuilder` with `withCustomCreate` that delegates to `distribucionService.createDistribucion`, and standard update/delete via repo
- `FR-005` - Purchases sync handler must use `SyncHandlerBuilder` with `withCustomUpdate` that executes inventory updates (add on received, remove on cancelled) as a post-operation hook, without using the state machine infrastructure
- `FR-006` - Abono initial payment creation must be moved out of the sales sync handler; the frontend will enqueue a separate `abonos/create` operation
- `FR-007` - `confirmedSnapshot` and `deliveredSnapshot` fields must be removed from the sales Drizzle schema, shared schema, generated schemas, and all references
- `FR-008` - `StatefulSyncHandler` class must be deleted after all handlers are migrated
- `FR-009` - Backend `BaseSyncHandler` class must be deleted after all handlers are migrated (framework's `BaseSyncHandler` replaces it)
- `FR-010` - Sale transition hooks (`setupSaleTransitions`) must be removed entirely
- `FR-011` - Distribucion transition hooks (`setupDistribucionTransitions`) must be removed entirely
- `FR-012` - Purchase transition hooks (`setupPurchaseTransitions`) must be inlined as a `withPostOperation` hook on the purchase handler
- `FR-013` - `saleMachine` and `distribucionMachine` state machines must be removed from `transitions/index.ts`
- `FR-014` - `purchaseMachine` state machine must be removed; inventory logic moves to sync handler hook
- `FR-015` - Frontend `SaleService.createWithItems()` must enqueue an `abonos/create` operation when `saleType === "credito" && amountPaid > 0`
- `FR-016` - `confirmPreOrder` and `deliverPreOrder` repository methods must be removed (frontend sends complete update payloads including any snapshot-like data)
- `FR-017` - Sync handler registration in `sync.service.ts` must use the new builder-based factories instead of custom handler classes
- `FR-018` - All existing backend tests for custom sync handlers must be updated or removed
- `FR-019` - The plan must document the cuaderno boundary: daily operational actions belong to frontend/local syncable entities; backend-only side effects are limited to server-owned concerns
- `FR-020` - Any initial payment, sale status change, cancellation metadata, or other seller-visible daily fact must be represented locally before sync succeeds
- `FR-021` - Backend sync handlers must not create user-visible day-to-day records that the frontend cannot see offline

## Non-Functional Requirements

- `NFR-001` - Sync operation processing must remain atomic within a single transaction
- `NFR-002` - Version conflict detection behavior must be preserved (same error message, same comparison logic)
- `NFR-003` - No regression in sync operation success rate for existing entity types (tags, customers, products, etc.)
- `NFR-004` - Day-to-day workflows must remain usable for long periods without internet; sync latency must not be required for the local notebook to be coherent

## Acceptance Criteria

- No `StatefulSyncHandler` or backend `BaseSyncHandler` classes exist in the codebase
- No `SaleSyncHandler`, `DistribucionSyncHandler`, or `PurchaseSyncHandler` custom class files exist
- All 14 sync handlers are registered via `SyncHandlerBuilder` factory functions in `registry.ts`
- `confirmedSnapshot` and `deliveredSnapshot` do not appear in any schema definition
- `saleMachine`, `distribucionMachine`, and `purchaseMachine` are not registered in `StateMachineRegistry`
- Creating a credit sale with initial payment produces both `sales/create` and `abonos/create` operations in the frontend sync queue
- Creating, confirming, cancelling, and paying a sale leaves the local cuaderno coherent before any backend sync succeeds
- `bun test` passes in both `packages/backend` and `packages/app`
- `bun run build` succeeds for all packages

## Constraints

- Database migration required to drop `confirmed_snapshot` and `delivered_snapshot` columns from `sales` table
- The `purchaseMachine` inventory logic must survive the migration (as a handler hook, not a state machine)
- `staffInvitationMachine` must remain untouched
- Existing data with non-null snapshot values will be lost after migration
- Backend reports, analytics, and global reconciliation may still be server-side, but they must not be required for the user's offline daily notebook to be accurate locally

## Open Questions

- Should we keep `confirmedSnapshot`/`deliveredSnapshot` as nullable columns (set always to null) instead of dropping them, to avoid a migration? This trades code cleanup for schema consistency.
- For purchase inventory updates: should the `withPostOperation` hook run only on status change, or on every update? Currently the state machine only fires on `previousStatus !== newStatus`.
- For sale cancellation with refund: the frontend currently sets `cancelReason`, `refundAmount`, `refundMethod` in the update payload. But the `sale.ts` transition also creates a reversal payment and returns inventory. Should these also become separate sync operations from the frontend, or should a `withPostOperation` hook handle them server-side?
