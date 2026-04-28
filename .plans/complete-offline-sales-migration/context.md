# Complete Offline Sales Migration Context

## Overview

This structured plan completes the offline-first migration for the core vendor flow in Avileo: customers, sales, sale details/items, and cobros/abonos. The goal is to make the flow reliable while offline, safely synchronized through the drizzle-sync framework, and provable with backend and browser validation.

The work spans shared contracts, generated local schema, frontend services/hooks/routes, backend sync handlers/repositories/conflict resolution, and E2E tests. It is intentionally decomposed into durable tasks so execution can happen in dependency order without mixing contract decisions, backend safety, frontend service migration, UI coverage, and validation.

## Background

Recent investigation found that the app is mostly migrated to the generated-service and `BaseService` model, but several gaps still prevent full confidence in the end-to-end offline-first flow:

- Frontend hooks request `useEngineService("payments")` while the generated engine and service overrides register the payment domain as `abonos`.
- Payment method definitions drift between shared schema, backend schema, sync payload validation, and generated frontend schemas.
- Shared `abonos` lacks `version`, while backend/generated schema include it.
- Backend conflict detection depends on version columns that are not consistently incremented for customers and sale item mutations.
- Local sales operations write `sales` and `sale_items` sequentially even though comments describe transaction-level atomicity.
- `EnqueueParams` currently supports idempotency only, while backend sync contracts already expose optional `correlationId`; compound operations need explicit grouping semantics.
- Existing E2E sync tests use a mock payload shape that differs from `/sync/batch` and do not prove a real offline round trip.

## Goal

When all tasks are complete, a vendor can create or update a customer, create a sale with sale items, register an abono, continue using the relevant screens offline, reconnect, push pending operations, pull changes on another client, and observe consistent balances and sync statuses without manual repair.

## Key Decisions

- Use `abonos` as the canonical sync entity and service key for cobros/payments in the current system.
- Do not manually edit generated files under `packages/app/app/lib/sync/generated/`; update generator inputs and regenerate them with the project sync commands.
- Prefer version-based conflict detection already present in backend sync, but make version mutation behavior consistent with resolver expectations.
- Use explicit operation correlation/grouping for compound offline writes rather than relying only on queue insertion order.
- Keep optional online-only proof upload out of the core offline gold path unless attachment staging is explicitly implemented as part of the UI task.

## Scope Boundaries

- In scope: `customers`, `sales`, `sale_items`, `abonos`, sync operation contracts, schema parity, backend conflict safety, frontend offline services/hooks, core cobros/ventas UI links, and validation tests.
- In scope: generated artifacts produced by the existing drizzle-sync generation workflow.
- Out of scope: unrelated entities such as purchases, distribuciones, inventory, WhatsApp, public sale tokens, and broad visual redesign.
- Out of scope: replacing the sync framework; this plan exercises and hardens the current framework.
- Out of scope: React Native or non-PGlite adapters beyond preserving the current `DatabaseAdapter` abstraction.

## Verified Evidence

- `packages/app/app/hooks/use-payments.ts:14,25,40,57,99,122` and `packages/app/app/hooks/use-accounts-receivable.ts:28,71` request `useEngineService("payments")`.
- `packages/app/app/lib/sync/service-overrides.ts:29` registers `abonos` for `PaymentService` and generated engine types expose `abonos` at `packages/app/app/lib/sync/generated/engine.ts:48`.
- `packages/shared/src/sync-config.ts:8-26` includes `customers`, `sales`, `sale_items`, `abonos`, and `files`; priorities put `abonos` and `sale_items` in tier 2.
- `packages/shared/src/sync-stages.ts:35,55,75-87` stages `customers`, `sales`, `sale_items`, and `abonos`, but not `files`.
- `packages/shared/src/schema.ts:56-62` defines payment methods without `tarjeta`; `packages/backend/src/db/schema/enums.ts:44-51` includes both `tarjeta` and `saldo`; `packages/backend/src/services/sync/schemas/index.ts:164` allows `tarjeta` but not `saldo`; generated schemas allow both.
- `packages/shared/src/schema.ts:254-271` defines `abonos` without `version`; `packages/backend/src/db/schema/payments.ts:58-60` and generated schema include `version`.
- `packages/backend/src/services/repository/customer.repository.ts:147-158` updates customers without incrementing `version`, while `CustomerConflictResolver` reads `version` in `packages/backend/src/services/sync/framework/ConflictResolver.ts:105-121`.
- `packages/backend/src/services/repository/sale.repository.ts:607-639,675-689` updates/deletes sale items and recalculates totals without incrementing parent sale `version`; `SaleItemConflictResolver` uses parent sale version at `packages/backend/src/services/sync/framework/ConflictResolver.ts:464-522`.
- `packages/app/app/lib/services/sale-service.ts:635-679` creates a sale and then items sequentially; `packages/app/app/lib/services/sale-service.ts:865-879` finalizes delivery by sequential item updates and then sale update.
- `packages/drizzle-sync/src/core/types.ts:111-122` defines `EnqueueParams` without `correlationId` or grouping fields; backend `/sync/batch` accepts `correlationId` in `packages/backend/src/api/sync.ts:193-240`.
- `packages/app/e2e/tests/sync-tests.spec.ts:30-50` uses mock operation fields `entity`, `data`, and `timestamp`, which differ from the backend contract `entityType`, `entityId`, `payload`, `localVersion`, and `localTimestamp`.

## Inferred Context

- The current architecture is close to the desired model: custom services mostly extend or compose generated services, and writes generally queue sync operations.
- The biggest risks are not missing routes alone, but contract drift and partial writes that create data the sync framework cannot safely order, validate, or conflict-check.
- Fixing contracts before services is important because generated schema/services and backend validation must converge before reliable tests can be written.

## Unknowns

- Product decision: whether `saldo` is a valid abono payment method, a refund-only method, or both.
- Product decision: whether `tarjeta` must remain available in cobros UI and sync payloads.
- Technical decision during execution: whether grouping should be represented as `correlationId`, `syncGroupId`, or both with one canonical field mapped to the backend contract.
- Testing decision: whether the offline gold-path E2E should use real backend/database, MSW with exact contract, or both.

## Mode Justification

Mode: structured.

The migration has more than two durable execution units across schemas, backend sync, frontend services, UI, and tests. A single simple plan would hide dependencies between contract alignment, generated artifacts, conflict behavior, local atomicity, and validation.
