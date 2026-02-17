# Implement Suppliers and Purchases Module

## Context

Analysis of the Avileo (PollosPro) distribution system revealed a fundamental architectural issue: the system has distributions working on inventory, but no purchase/supplier module to feed that inventory. During analysis of the distribution feature, we discovered that:

- Inventory is currently managed via manual adjustments (not purchases)
- Distributions assign stock to vendors but there's no clear entry point for stock
- Many businesses using the system previously used notebooks and don't have historical purchase records
- The accounting flow is broken: inventory exists without corresponding purchase records

## The Problem / Objective

Establish a proper purchase-to-inventory flow that:

1. Supports businesses without historical purchase data (common scenario)
2. Maintains proper accounting practices (no sales without prior purchases)
3. Enables distributions to work on legitimate stock with real cost data
4. Allows gradual migration from "unknown" suppliers to real suppliers as data is collected

## Key Decisions

- **Use `type` enum instead of boolean flag**: Supplier type field with values `generic`, `regular`, `internal` for extensibility (not `isGeneric` boolean)
- **Auto-create generic supplier**: System creates "Proveedor Varios" supplier with `type: "generic"` for each new business to handle purchases without identified suppliers
- **Optional billing data**: Suppliers can have RUC, address, phone, email, notes - all optional to accommodate informal suppliers
- **Purchases required before sales**: No inventory adjustments without purchase records; businesses must register initial stock as purchase from generic supplier
- **Real cost tracking**: Even generic purchases have estimated costs, enabling proper margin calculations
- **Migration path**: As businesses identify their suppliers, they create regular suppliers and new purchases go there; old purchases stay with generic supplier (historical accuracy)

## Files to Modify or Create

Backend:
- `packages/backend/src/db/schema/suppliers.ts` - New suppliers table with type enum and optional billing fields
- `packages/backend/src/db/schema/purchases.ts` - New purchases/purchase_items tables
- `packages/backend/src/api/suppliers.ts` - CRUD endpoints for suppliers
- `packages/backend/src/api/purchases.ts` - Purchase endpoints (creates inventory entries)
- `packages/backend/src/services/business/supplier.service.ts` - Business logic
- `packages/backend/src/services/business/purchase.service.ts` - Purchase logic with inventory updates
- `packages/backend/src/services/repository/supplier.repository.ts` - Data access
- `packages/backend/src/services/repository/purchase.repository.ts` - Data access

Frontend:
- `packages/app/app/routes/_protected.proveedores.tsx` - Supplier management page
- `packages/app/app/routes/_protected.compras.tsx` - Purchase management page
- `packages/app/app/hooks/use-suppliers.ts` - TanStack Query hooks
- `packages/app/app/hooks/use-purchases.ts` - TanStack Query hooks

## Next Step

Create the database schema for suppliers and purchases tables, then implement the backend API endpoints starting with suppliers CRUD.

---

Document generated from conversation on distribution analysis and inventory flow architecture
