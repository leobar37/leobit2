# Migrate Distribuciones to Offline-First Pattern

## Objective

Migrate distribuciones to use the same offline-first pattern as customers and ventas: write to local PGlite database + queue sync operation, instead of direct API calls. This ensures UI updates immediately and works offline.

## Current State

- **Done**: 
  - Identified root cause: useCreateDistribucion makes direct API POST instead of using service pattern
  - Created DistribucionService skeleton at `packages/app/app/lib/services/distribucion-service.ts` (not complete)
  - Added logs throughout the flow to debug
  - Fixed query in existsForVendedorAndFecha to use inArray instead of raw SQL

- **Remaining**:
  - Fix schema inconsistencies between shared and backend
  - Complete DistribucionService implementation
  - Update hooks to use service pattern
  - Register service in ServicesProvider

- **In Progress**: Analysis phase, no code changes yet

- **Blockers**:
  - Schema inconsistencies must be fixed first
  - Need to understand why pull/push sync isn't updating local PGlite

## Decisions Already Made

- Pattern: Follow CustomerService pattern exactly - insert locally, queue sync, invalidate queries
- Hooks: useDistribuciones reads from PGlite (done), useCreateDistribucion should write to PGlite (not done)
- Service: Create DistribucionService extending BaseService (similar to CustomerService)

## Schema Inconsistencies (MUST FIX FIRST)

### Shared Schema (`packages/shared/src/schema.ts`) - distribuciones table
- **ADD**: `puntoVentaId` (exists in backend but missing in shared)

### Shared Schema - distribucion_items table  
- **ADD**: `businessId` (required for multi-tenant sync filtering, exists in backend)

### Backend Schema (`packages/backend/src/db/schema/inventory.ts`)
- **ADD**: `updatedAt` to distribuciones table
- **ADD**: `updatedAt` to distribucion_items table

## Affected Files / Artifacts

- `packages/shared/src/schema.ts` - NEEDS CHANGES - add missing fields
- `packages/backend/src/db/schema/inventory.ts` - NEEDS CHANGES - add updatedAt
- `packages/app/app/lib/services/distribucion-service.ts` - EXISTS but incomplete - needs completion
- `packages/app/app/lib/services/base-service.ts` - REVIEW - understand create/enqueueSync pattern
- `packages/app/app/hooks/use-distribuciones.ts` - NEEDS CHANGES - migrate to service pattern
- `packages/app/app/lib/sync/service-provider.tsx` - NEEDS CHANGES - register DistribucionService
- `packages/app/app/lib/services/customer-service.ts` - REFERENCE - example of correct pattern

## Execution Plan

1. **Fix Shared Schema** - Add puntoVentaId to distribuciones, add businessId to distribucion_items
2. **Fix Backend Schema** - Add updatedAt to both tables
3. **Complete DistribucionService** - Implement create() that inserts to PGlite + enqueues sync
4. **Register in ServicesProvider** - Add DistribucionService instance and useDistribucionService hook
5. **Update useCreateDistribucion** - Use service instead of direct API call
6. **Update useDistribuciones** - Use service for reads (already reads from PGlite)

## Validation

- **Automated**: Run `bun run typecheck` after changes
- **Manual**: 
  1. Create distribucion - should appear in list immediately (before sync)
  2. Go offline - create distribucion - should be queued
  3. Go online - should sync automatically

## Open Questions / Assumptions

- Assumes BaseService.create() pattern works correctly (verified in CustomerService)
- Need to verify distribucion_items are also synced (child records)

## Immediate Next Action

Fix shared schema: Add `puntoVentaId` to distribuciones and `businessId` to distribucion_items in `packages/shared/src/schema.ts`

Then add `updatedAt` to both tables in backend schema.
