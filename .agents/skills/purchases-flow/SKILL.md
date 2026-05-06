# Purchases Flow Skill

Comprehensive knowledge for the purchases (compras) workflow across all layers.

## State Machine

```
┌─────────────┐    receive    ┌────────────┐
│   pending   │ ────────────► │  received  │
└─────────────┘               └────────────┘
      │                              │
      │ cancel                       │ cancel
      ▼                              ▼
┌─────────────┐               ┌────────────┐
│ cancelled   │               │ cancelled  │
└─────────────┘               └────────────┘
```

| Transition | Inventory Effect | Condition |
|------------|------------------|-----------|
| `pending` → `received` | +stock | - |
| `pending` → `cancelled` | none | - |
| `received` → `cancelled` | -stock (reverse) | - |

## Layer Quick Reference

| Layer | Key Files | Purpose |
|-------|-----------|---------|
| **Schema** | `packages/backend/src/db/schema/purchases.ts` | `purchases` + `purchase_items` tables |
| **Transitions** | `packages/backend/src/services/transitions/purchase.ts` | State machine with inventory hooks |
| **Repository** | `packages/backend/src/services/repository/purchase.repository.ts` | Drizzle CRUD with tx support |
| **Service** | `packages/backend/src/services/business/purchase.service.ts` | Business logic + validations |
| **API** | `packages/backend/src/api/purchases.ts` | REST endpoints |
| **Hooks** | `packages/app/app/hooks/use-purchases.ts` | TanStack Query hooks |
| **Service (FE)** | `packages/app/app/lib/services/purchase-service.ts` | Offline-first with sync queue |
| **Context** | `packages/app/app/components/purchases/purchase-form-context.tsx` | New purchase form state |
| **Context** | `packages/app/app/components/purchases/purchase-edit-context.tsx` | Edit purchase state |

## Route Hierarchy

```
/compras                          # List all purchases
/compras/nueva                    # Create: layout + form
/compras/nueva/calculadora        # Create: calculator for adding items
/compras/:id                      # View detail + change status
/compras/:id/editar               # Edit: layout + form
/compras/:id/editar/calculadora    # Edit: calculator for editing items
```

## Key Patterns

### Backend: ctx MUST be first parameter
```typescript
// ✅ CORRECT
async findById(ctx: RequestContext, id: string)

// ❌ INCORRECT
async findById(id: string, ctx: RequestContext)
```

### Backend: All queries MUST filter by businessId
```typescript
where(eq(purchases.businessId, ctx.businessId))
```

### Frontend: Offline-first writes
```typescript
// Check isOnline() before API call
if (isOnline()) {
  // Use useCreatePurchase mutation
} else {
  // Use PurchaseService.create() which queues sync
}
```

## Reference Files

| File | Content |
|------|---------|
| `references/overview.md` | State diagram + workflow narrative |
| `references/data-model.md` | Schema columns, types, relations |
| `references/backend.md` | API, service, repository, transitions |
| `references/frontend.md` | Routes, components, contexts, hooks |
| `references/business-rules.md` | Validations, transitions, restrictions |

## Activation Tips

- Use `references/overview.md` for high-level understanding
- Use `references/business-rules.md` when implementing status transitions
- Use `references/backend.md` when adding/changing API endpoints
- Use `references/frontend.md` when adding/changing routes or components
- Use `references/data-model.md` for schema reference
