# AGENTS.md - State Machine Transitions

> **Side effect handlers for entity state changes in Avileo**

## Overview

Transition handlers execute side effects (inventory updates, payment reversals) atomically when entities change state.

## Structure

```
transitions/
├── index.ts               # Machine registries, dependency injection
├── sale.ts               # Sale transitions: reversal payments, inventory returns
├── purchase.ts           # Purchase transitions: stock updates on receive/cancel
├── distribucion.ts       # Distribucion transitions: lifecycle hooks (no-op)
├── staff-invitation.ts   # Invitation transitions: business membership creation
└── *.test.ts             # Unit tests for each handler
```

## Where to Look

| Transition | File | Trigger | Effect |
|------------|------|---------|--------|
| `active` → `cancelled` | `sale.ts` | Cancelling a confirmed sale | Reversal payment + inventory return |
| `confirmed` → `cancelled` | `sale.ts` | Cancelling a pre-order | Inventory return (no payment) |
| `confirmed` → `delivered` | `sale.ts` | Pre-order delivery | Snapshot creation trigger |
| `pending` → `received` | `purchase.ts` | Goods received | Add stock to inventory |
| `received` → `cancelled` | `purchase.ts` | Reverse purchase | Remove stock from inventory |
| `pending` → `accepted` | `staff-invitation.ts` | Accept invite | Create `business_users` record |

## Conventions

### Hook Signature

```typescript
.onTransition(from, to, async (ctx, entity, tx) => {
  // ctx: RequestContext (businessId, userId, permissions)
  // entity: The entity with its items/relations
  // tx: Drizzle transaction for atomicity
});
```

### Dependency Injection Pattern

```typescript
export interface SaleTransitionDeps {
  paymentRepository: PaymentRepository;
  distribucionItemRepository: DistribucionItemRepository;
  saleRepository: SaleRepository;
}

export function setupSaleTransitions(
  machine: StateMachine<SaleWithItems, SaleState>,
  deps: SaleTransitionDeps
): void {
  machine.onTransition("active", "cancelled", async (ctx, sale, tx) => {
    await deps.paymentRepository.createReversal(ctx, {...}, tx);
  });
}
```

### Machine Definition

```typescript
export const saleMachine = createMachine<SaleWithItems, SaleState>({
  name: "sale",
  initialState: "draft",
  states: ["draft", "confirmed", "active", "delivered", "cancelled"],
  allowedTransitions: [
    { from: "draft", to: "active" },
    { from: "active", to: "cancelled" },
    { from: "confirmed", to: "delivered" },
    // ...
  ],
});
```

### Transaction Safety

All side effects MUST use the provided `tx` parameter:

```typescript
// Correct: Pass tx to all repo calls
await deps.paymentRepository.createReversal(ctx, data, tx);
await deps.saleRepository.update(ctx, id, patch, tx);

// Wrong: Implicitly uses non-transactional db
await deps.paymentRepository.createReversal(ctx, data); // ❌
```

## Anti-Patterns

- **Don't** call services from transitions. Only repositories.  
- **Don't** access request body data in handlers. Use `entity._refundData` pattern.  
- **Don't** create machines inline. Export from `index.ts` and register in `initializeStateMachines`.  
- **Don't** mutate `entity` directly. Return data via repository updates.
