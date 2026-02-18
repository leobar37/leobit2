# Flexible Distribution System Architecture

## Context

Avileo (PollosPro) is an offline-first chicken sales management system built with Bun + ElysiaJS + React Router v7. The current distribution system assigns kilos to vendors daily, but it has rigid limitations that don't match real-world business operations.

## The Problem / Objective

Redesign the distribution system to support flexible business scenarios:

1. **Multi-product distributions**: Not just chicken kilos, but also eggs (units), offal, and other products in the same daily assignment
2. **Variant-level tracking**: Assign specific product variants (e.g., "Whole Chicken Large", "Eggs Dozen") with their own units
3. **Flexible modes**: 
   - Strict mode: Can only sell assigned amounts (stock validation)
   - Accumulative mode: Sell without limits, reconcile later
4. **Stock control flow**: Purchases → variant_inventory → distribution_items → sales (with stock deduction)
5. **Free sales**: Admin can sell without distribution; vendors can sell before assignment is configured
6. **Trust-based reporting**: Vendors report kilos sold without initial weighing

## Key Decisions

- **Create `distribucion_items` table**: Link distributions to specific product variants with quantities, enabling multi-product assignments
- **Connect `variant_inventory` to purchases**: Currently purchases only update general inventory; they must update variant-level stock
- **Implement dual stock validation**: Frontend for UX, backend for security (prevent overselling)
- **Add operation modes to businesses**: `modoDistribucion` enum (strict, accumulative, free) instead of binary flag
- **Stock reservation pattern**: When creating distribution, reserve stock from variant_inventory; release on close if unsold

## Files Modified or Created

### Backend (Schema & Services)
- `/packages/backend/src/db/schema/inventory.ts` - Add `distribucion_items` table, update `distribuciones` with new fields
- `/packages/backend/src/db/schema/businesses.ts` - Add `modoDistribucion` enum field
- `/packages/backend/src/services/business/distribucion.service.ts` - CRUD for items, stock reservation logic
- `/packages/backend/src/services/business/sale.service.ts` - Validate stock against distribucion_items
- `/packages/backend/src/services/business/purchase.service.ts` - Update variant_inventory on purchase
- `/packages/backend/src/services/repository/distribucion.repository.ts` - Queries for items with variants
- `/packages/backend/src/api/distribuciones.ts` - New endpoints for items management

### Frontend (Routes & Hooks)
- `/packages/app/app/hooks/use-distribuciones.ts` - Add hooks for items CRUD
- `/packages/app/app/routes/_protected.distribuciones.tsx` - Multi-variant assignment form
- `/packages/app/app/routes/_protected.mi-distribucion.tsx` - Show items breakdown
- `/packages/app/app/routes/_protected.ventas.nueva.tsx` - Variant-level stock validation
- `/packages/app/app/components/distribucion/` - New components for item selection

### Sync/Offline
- `/packages/backend/src/services/sync/sync.service.ts` - Add distribucion_items to sync entities

## Next Step

Begin Phase 1: Create database migration with `distribucion_items` table and update `distribuciones` schema with new fields (modo, pesoConfirmado, confiarEnVendedor).

---

Document generated from this conversation
