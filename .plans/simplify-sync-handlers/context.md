# Simplify Sync Handlers Context

## Overview

Migrate backend sync handlers from custom `StatefulSyncHandler` subclasses to generic `SyncHandlerBuilder`-based handlers, aligning with Avileo's product principle: the app is a **digital cuaderno** that vendors carry everywhere. Like a physical notebook, daily operations must be writable without internet. The frontend owns the operational notebook: sales, abonos, distribuciones, purchases, and state changes are recorded locally first. The backend becomes a "dumb replicator" — it validates payload structure, persists data, and detects version conflicts, but does not implement daily workflow rules.

## Background

The Avileo sync system has a fundamental architectural tension: the `drizzle-sync` framework generates generic handlers for 11 entities via `SyncHandlerBuilder`, but 3 entities (sales, distribuciones, purchases) use custom `StatefulSyncHandler` subclasses with ~500 lines of duplicated business logic. This logic contradicts the cuaderno model because:

1. **Frontend already owns the state machine** — `SaleService.confirm()`, `finalizeDelivery()`, `cancelSale()` all run locally before sync
2. **Backend creates data nobody reads** — `confirmedSnapshot` and `deliveredSnapshot` are write-only fields with zero functional consumers
3. **Backend creates side effects the frontend can't see offline** — The automatic abono creation when a credit sale has an initial payment means the frontend doesn't see the payment locally until sync completes
4. **State machine transitions in backend are mostly no-ops** — `setupDistribucionTransitions` is entirely no-ops; `setupSaleTransitions` does inventory returns that could be separate sync operations
5. **Version conflict detection is reimplemented** — The framework's `withVersionConflictField` does the same check as the manual `existing.version > clientExpectedVersion` in `SaleSyncHandler`

The product intent is not "call a backend API when the seller is online". The product intent is "write the business notebook wherever the seller is, then sync later". That means the canonical operational flow for daily work lives in the local app/PGlite layer, not in backend sync handlers.

## Goal

Replace all 3 custom sync handlers with `SyncHandlerBuilder`-based handlers, eliminate dead code (snapshots, no-op transitions, custom base classes), and move abono creation to the frontend. The backend sync layer becomes purely structural: parse → persist → return. The frontend becomes the local cuaderno layer that records complete business facts while offline.

## Key Decisions

- **Frontend owns business logic**: All state transitions, calculations, and side effects originate in frontend services. Backend only persists what the frontend sends.
- **Cuaderno-first design**: Anything a seller writes during daily work must be a local, syncable entity or operation. If the action matters to the user's day-to-day workflow, it must be visible locally immediately, without waiting for backend-side side effects.
- **No more `StatefulSyncHandler`**: The "load-before-decide" pattern is unnecessary when the frontend sends complete payloads. `GenericSyncHandler` with `withVersionConflictField` handles conflict detection.
- **Abono creation moves to frontend**: When a credit sale has an initial payment, the frontend enqueues both `sales/create` and `abonos/create` as correlated operations.
- **Snapshots are dead code**: Removed from schema, handlers, and repos. If needed in the future, the frontend can send them as regular fields.
- **Purchase transitions stay temporarily**: The `pending→received` transition updates inventory (a server-side concern). This remains as a `withPostOperation` hook on the generic handler, not a state machine.
- **Staff invitation transitions are out of scope**: They handle business_users creation (auth concern), not sync business logic.

## Scope Boundaries

- In scope: `SaleSyncHandler`, `DistribucionSyncHandler`, `PurchaseSyncHandler`, `StatefulSyncHandler`, `BaseSyncHandler`, sale/distribucion/purchase transitions, snapshot fields, abono initial payment creation, and explicit documentation of the cuaderno-first sync boundary
- Out of scope: `staff-invitation.ts` transitions, the 11 already-generic handlers in `registry.ts`, `drizzle-sync` framework package itself, frontend service refactoring (separate plan), E2E test rewrites

## Cuaderno Model

The "cuaderno" is the local ledger of daily business activity. It is not a UI metaphor only; it is an architectural boundary:

| Daily action | Cuaderno expectation | Backend expectation |
| --- | --- | --- |
| Create sale | Sale and sale items exist in PGlite immediately | Persist received `sales`/`sale_items` operations |
| Credit sale with initial payment | Sale and abono exist locally immediately | Persist `sales/create` then `abonos/create` |
| Confirm/cancel sale | Local status and related local entries change immediately | Persist update payloads and detect conflicts |
| Distribucion work | Local distribution notes/items/status remain usable offline | Persist replicated rows |
| Purchase receipt | Local purchase is recorded offline; server-owned inventory reconciliation may run during sync | Persist purchase and reconcile inventory if required |

Backend-only side effects are allowed only for non-day-to-day, server-owned concerns such as reports, authentication membership, global reconciliation, or operational analytics. They must not be required for the seller's notebook to make sense offline.

## Current Architecture Map

### Custom Handlers (to be eliminated)

| Handler | Lines | What it does | Replacement |
|---------|-------|-------------|-------------|
| `SaleSyncHandler` | 240 | State branches for confirm/deliver/cancel, abono creation, snapshot creation, version conflict manual check | `SyncHandlerBuilder` with `customCreate`, `customUpdate`, `withVersionConflictField` |
| `DistribucionSyncHandler` | 115 | Delegates to `distribucionService.createDistribucion`, simple update | `SyncHandlerBuilder` with `customCreate` |
| `PurchaseSyncHandler` | 154 | State machine transition for inventory updates on status change, FK validation | `SyncHandlerBuilder` with `customUpdate` + `withPostOperation` for inventory |

### Base Classes (to be eliminated)

| Class | Lines | Purpose | Why eliminable |
|-------|-------|---------|----------------|
| `StatefulSyncHandler` | 65 | "Load existing before update" pattern | `GenericSyncHandler` handles this via `withVersionConflictField` |
| `BaseSyncHandler` (backend) | 174 | Logging, result creation, payload validation | Framework's `BaseSyncHandler` already provides this |

### Transitions (to be simplified/removed)

| Transition | Side Effects | Decision |
|-----------|-------------|----------|
| `sale.ts` | Reversal payment on cancel, inventory return on cancel, snapshot on confirm/deliver | Remove entirely — frontend enqueues separate operations |
| `distribucion.ts` | All no-ops | Remove entirely |
| `purchase.ts` | Inventory add on receive, inventory remove on cancel | Keep as `withPostOperation` hook on generic handler |
| `staff-invitation.ts` | Create business_users on accept | Out of scope |

### Dead Code Fields

| Field | Entity | Read By | Decision |
|-------|--------|---------|----------|
| `confirmedSnapshot` | sales | Nobody | Remove |
| `deliveredSnapshot` | sales | Nobody | Remove |

### Framework Capabilities Already Covering Custom Logic

| Custom Logic | Framework Equivalent |
|-------------|-------------------|
| Manual version conflict check | `withVersionConflictField("version")` |
| Load existing before update | `GenericSyncHandler.handleUpdate` does `findById` internally |
| Zod schema validation | `withSchemas(createSchema, updateSchema)` |
| Payload enrichment (sellerId from ctx) | `withPayloadEnricher` |
| Parent FK validation | `withParentCheck` |
| Post-operation side effects | `withPostOperation` |
| Custom create/update/delete | `withCustomCreate`, `withCustomUpdate`, `withCustomDelete` |
