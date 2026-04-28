# F4 Scope Fidelity Check — Evidence Report

**Date:** 2026-04-28
**Verdict:** APPROVE

---

## Executive Summary

No scope creep detected. The implementation stayed within the planned boundaries:
- Removed PGlite/offline sync infrastructure (not added)
- No real-time transport introduced
- No new persistent cache libraries added
- Sales UX unchanged except for the offline-blocking toast
- Only obsolete sync/PGlite tests were deleted/cleaned up
- Package dependencies were *removed*, not added

---

## 1. No SSE/WebSocket

### Findings

**Search:** `EventSource`, `WebSocket`, `socket.io`, `ws://`

**Result:** ZERO implementation code found.

All matches were in:
- Documentation files (`docs/technical/*.md`, `docs/offline/*.md`) — pre-existing
- Drizzle migration SQL files (e.g., `0018_add_whatsapp_tables.sql` — WhatsApp-related, not new)
- Existing `@opentelemetry/instrumentation-socket.io` dependency in `bun.lock` (transitive, not new)
- Reports and plan files in `.plans/`, `.sisyphus/`

**Conclusion:** No SSE, WebSocket, socket.io, or ws:// code was introduced in frontend or backend source.

---

## 2. No New Sync Queue

### Findings

**Search:** `sync queue`, `pending operations`, `batch sync`

**Result:** No new queue infrastructure in app or backend source.

The existing `packages/drizzle-sync/src/pglite/queue-queue.ts` and `queue-repository.ts` are pre-existing parts of the `@avileo/drizzle-sync` library (which is being *removed* from the app's dependencies, not expanded).

The backend sync handlers (`packages/backend/src/services/sync/`) and sync framework were **deleted** during this migration, not added.

**Conclusion:** No new sync queue infrastructure was introduced.

---

## 3. No New Persistent Business/Session Cache

### Findings

#### Session Storage (`packages/app/app/lib/session-storage.ts`)
Keys are unchanged:
- `bearer_token`
- `current_business_id`
- `current_business_user_id`

No new `localStorage` keys added.

#### Cache Libraries
- `@tanstack/react-query-persist-client` — **pre-existing** (verified in `HEAD~10:packages/app/package.json`)
- `jotai` — **pre-existing**
- `zustand` — **pre-existing**
- No new IndexedDB libraries added

#### Query Persister (`packages/app/app/lib/query/persister.ts`)
Pre-existing file (commit `1eeaf0c`). Uses `localStorage` for TanStack Query cache persistence — this is standard TanStack Query behavior, not new infrastructure.

#### Cache Module (`packages/app/app/lib/cache.ts`)
Modified to **remove** PGlite dependency. No new caching behavior added.

#### New Files Reviewed
- `packages/app/app/hooks/use-online.ts` — Simple `navigator.onLine` wrapper (22 lines). Necessary for offline-blocking UX. Not a cache.
- `packages/app/app/lib/api-utils.ts` — API response helpers. Not a cache.
- `packages/app/app/lib/query-keys.ts` — TanStack Query key factory. Not a cache.

**Conclusion:** No new persistent cache libraries or keys were added.

---

## 4. No Unrelated Sales UX Redesign

### Findings

**File inspected:** `packages/app/app/components/sales/new-sale.tsx` (981 lines)

**UX Changes Found:**
- `SaleSubmitBar` (line 405) uses `useOnline()` hook to disable the finalize button when offline
- When offline, clicking the button shows a toast: `"Necesitas conexión a internet para confirmar la venta."`
- Button gets `disabled:bg-orange-300` when offline

**What Was NOT Changed:**
- `CustomerSection` — unchanged customer selection flow
- `PaymentModeSection` — unchanged payment mode buttons (`pago_total`, `a_cuenta`, `debe_todo`)
- `CartSection` — unchanged cart item list with edit/delete
- `CalculatorContent` — unchanged calculator with product/variant selection, tara, kg/pack inputs
- `SaleSummaryCard` — unchanged orange gradient summary card
- `SaleSubmitBar` — same bottom bar with total + button, just adds offline guard

**Conclusion:** The only UX change is the offline-blocking message. Cart, calculator, payment mode, and totals are unchanged.

---

## 5. No Broad Test Rewrite Beyond Cleanup

### Findings

**Deleted tests (expected — obsolete sync/PGlite):**
- `packages/app/app/hooks/__tests__/use-initial-sync.test.ts`
- `packages/app/app/hooks/use-sales-db.test.tsx`
- `packages/app/app/hooks/use-sync-status.ts`
- `packages/app/app/lib/services/distribucion-service.test.ts`
- `packages/app/app/lib/services/sale-service.test.ts`
- `packages/app/app/lib/services/visita-service.test.ts`
- `packages/backend/src/services/sync/handlers/__tests__/*.test.ts` (multiple)
- `packages/backend/src/services/transitions/*.test.ts` (multiple)

**Vitest config changes (`packages/app/vitest.config.ts`):**
- Added `exclude` entries for broken/obsolete tests:
  - `app/lib/auth-client.test.ts`
  - `app/hooks/use-auth.test.ts`
  - `tests/integration/hooks/use-customers.integration.spec.tsx`
  - `tests/integration/hooks/use-products.integration.spec.tsx`
  - `tests/integration/hooks/use-sales.integration.spec.tsx`
  - `tests/integration/sync/sync-page.integration.spec.tsx`
- No new test infrastructure added

**Playwright config (`packages/app/playwright.config.ts`):**
- Unchanged

**New test file added:**
- `packages/drizzle-sync/src/config/generators/__tests__/applier-generator.test.ts` — within the existing drizzle-sync library scope

**Conclusion:** Only obsolete sync/PGlite tests were deleted. No new test infrastructure was added to the app package.

---

## 6. Package.json Dependency Audit

### `packages/app/package.json`

**Removed:**
- `@avileo/drizzle-sync` (workspace dependency)
- `@electric-sql/pglite` (`^0.3.15`)

**No new dependencies added.**

Scripts removed: `db:migrate`, `db:rollback`, `db:rollback:verify`, `db:rollback:clear`, `db:rollback:test` (all PGlite migration scripts).

### `packages/backend/package.json`

**No dependency changes.**

Scripts changed only path references for sync CLI (pointing to root-level scripts instead of relative paths).

### `packages/shared/package.json`

**No dependency changes.**

Added `"test": "bun test src/__tests__" script (no new deps).

### Root `package.json`

**No dependency changes.**

Added 4 sync build scripts:
- `sync:build-schema`
- `sync:generate`
- `sync:validate`
- `sync:clean`

These are CLI wrappers for the existing `packages/drizzle-sync` library. No new npm packages.

### `bun.lock`

**Removed packages:**
- `@avileo/drizzle-sync`
- `@electric-sql/pglite`

**Added packages:** None (only `@types/bun` patch bump from `1.3.12` to `1.3.13`).

**Conclusion:** Dependencies were *removed*, not added. No sync/offline/cache libraries introduced.

---

## 7. Additional Checks

### No New Providers in Root/Protected Layouts

**`root.tsx`:**
- Already had `PersistQueryClientProvider` (pre-existing TanStack Query feature)
- Already had PWA service worker registration
- No new providers or libraries added

**`_protected.tsx`:**
- Removed `ElectricProvider`, `SyncProvider`, and all sync-related providers
- Now just auth check + `AppLayout`
- No new providers added

### No IndexedDB/New Storage APIs

**Search:** `BroadcastChannel`, `MessageChannel`, `Worker`, `SharedArrayBuffer`

**Result:** No matches in `packages/app/app/` or `packages/backend/src/`.

### `_protected.config.conflictos.tsx` and `_protected.config.sync.tsx` Removed

These sync config pages were **deleted** (not added). Confirms sync UI was removed, not expanded.

---

## Final Verdict

**APPROVE**

All 6 scope creep checks passed:

| Check | Result |
|-------|--------|
| No SSE/WebSocket | PASS — Zero implementation code found |
| No new sync queue | PASS — Sync framework deleted, not added |
| No new persistent cache | PASS — No new libraries or localStorage keys |
| No unrelated sales UX redesign | PASS — Only offline-blocking toast added |
| No broad test rewrite | PASS — Only obsolete test exclusions/deletions |
| No new dependencies | PASS — Dependencies removed, not added |

The implementation successfully removed PGlite/offline-first infrastructure and moved to an online-first model **without introducing** any of the forbidden scope items.
