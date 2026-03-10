# Unify Draft Sales into Sales Table

## Context

Working on the Avileo (PollosPro) offline-first chicken sales management system. The project uses TanStack DB + ElectricSQL for real-time offline synchronization. During investigation, we discovered that "Draft Sales" is a redundant entity that duplicates the main Sales table. Since TanStack DB already handles offline-first operations, having a separate Draft Sales table creates unnecessary complexity.

## The Problem / Objective

Eliminate the Draft Sales entity and unify everything into the main Sales table by adding a `status` field. This follows the same pattern already implemented for Orders (which uses status: draft | confirmed | cancelled | delivered). The refactor will:
- Remove 8+ duplicate files (schemas, collections, hooks)
- Simplify the data model
- Support multiple simultaneous sales in progress (a vendor can attend multiple customers at once)

## Key Decisions

- **Remove Draft Sales entirely**: All draft-related tables, collections, and hooks will be deleted. The code duplication is not justified since TanStack DB already provides offline capabilities.
- **Add status field to Sales**: New enum values: ["draft", "active", "cancelled"]. Default will be "draft" for new sales, changing to "active" upon confirmation.
- **Follow Orders pattern**: The Orders module already implements this exact pattern (draft → confirmed → cancelled | delivered). We will replicate this proven approach for Sales.
- **Reuse existing TXID infrastructure**: The backend already returns txid for all mutations, which ElectricSQL uses for sync. No changes needed here.
- **Single confirm endpoint**: Add POST /sales/:id/confirm to transition from draft to active status, rather than creating a separate API.

## Files Modified or Created

### Backend - To Modify:
- `packages/backend/src/db/schema/enums.ts` - Add "draft" to saleStatusEnum
- `packages/backend/src/db/schema/sales.ts` - Add status field with default "draft"
- `packages/backend/src/api/sales.ts` - Add POST /:id/confirm endpoint
- `packages/backend/src/services/business/sale.service.ts` - Add confirmSale() method
- `packages/backend/src/services/repository/sale.repository.ts` - Add status filter support

### Frontend - To Modify:
- `packages/app/app/lib/db/schema.ts` - Add status to sale schema
- `packages/app/app/lib/db/collections/sale.collection.ts` - Support draft operations
- `packages/app/app/hooks/use-sales-db.ts` - Add: useCreateDraftSale, useDraftSales, useConfirmSale
- `packages/app/app/components/sales/new-sale.tsx` - Migrate from draft hooks to sale hooks
- `packages/app/app/routes/_protected.ventas.nueva._index.tsx` - Update imports

### To Delete (8 files):
- `packages/backend/src/db/schema/draft-sales.ts`
- `packages/backend/drizzle/0021_add_draft_sales.sql`
- `packages/app/app/lib/db/schemas/draft-sale.ts`
- `packages/app/app/lib/db/collections/draft-sale.collection.ts`
- `packages/app/app/hooks/use-draft-sales.ts`
- `packages/app/app/hooks/use-draft-sale-items.ts`

## Next Step

Start Phase 1: Modify backend schema files. First, add "draft" to the saleStatusEnum in `packages/backend/src/db/schema/enums.ts`, then add the status field to the sales table schema.

---

Document generated from this conversation
