# State Machine Analysis Report

## Executive Summary

This report identifies entities in the Avileo codebase that could benefit from the state machine pattern currently implemented for `distribuciones` and `purchases`. The analysis covers backend services, database schema, and existing state transition implementations.

---

## Existing State Machine Implementations (Reference)

### Already Implemented ✅

| Entity | File | States | Side Effects |
|--------|------|--------|--------------|
| **distribucion** | `services/transitions/distribucion.ts` | activo → en_ruta → cerrado | Inventory reservation/return |
| **purchase** | `services/transitions/purchase.ts` | pending → received → cancelled | Stock updates on receive/cancel |

**Pattern Used:**
- State machine definition in `services/transitions/index.ts`
- Transition hooks in entity-specific files
- Execution via `StateMachine.executeTransition(ctx, entity, fromState, toState)`

---

## Entities with Status Fields (Candidates for State Machine)

### 1. SALES (HIGH PRIORITY) ⭐

**Location:** `packages/backend/src/db/schema/sales.ts:70`

**Status Field:**
```typescript
status: saleStatusEnum("status").notNull().default("draft"),
// Enum: ["draft", "confirmed", "active", "delivered", "cancelled"]
```

**Current Status Workflow:**
```
For instant_sales:  draft → active → cancelled
For pre_orders:     draft → confirmed → delivered → cancelled
```

**Hardcoded State Transitions Found:**

| File | Line | Transition | Side Effects |
|------|------|------------|--------------|
| `sale.service.ts` | 252, 403 | draft → [any] | Validation only |
| `sale.service.ts` | 330 | draft → [delete] | Hard delete vs soft delete |
| `sale.service.ts` | 393-435 | draft → active/confirmed | confirmSale() method |
| `sale.service.ts` | 437-462 | confirmed → delivered | deliverPreOrder() method |
| `sale.service.ts` | 464-562 | [any] → cancelled | cancelSale() with refunds, inventory return |
| `sale.service.ts` | 181-189 | [sale created] | Updates visita.status to "compro" |
| `SaleSyncHandler.ts` | 164-192 | Multiple transitions | Hardcoded state change handlers |
| `sale.repository.ts` | 350-394 | draft → confirmed | confirmPreOrder() with snapshot |
| `sale.repository.ts` | 396-439 | confirmed → delivered | deliverPreOrder() with snapshot |

**Side Effects Currently Implemented:**
1. **cancelSale()** (lines 464-562): 
   - Creates payment reversals/refunds
   - Returns items to distribucion inventory
   - Updates distribucionItem.cantidadVendida
   
2. **createSale()** (lines 181-189):
   - Updates visita.status to "compro" when sale created from visit
   - Updates distribucionItem.cantidadVendida

3. **confirmPreOrder()** (repository lines 350-394):
   - Creates confirmedSnapshot JSON
   - Version increment

4. **deliverPreOrder()** (repository lines 396-439):
   - Creates deliveredSnapshot JSON
   - Version increment

**Recommendation:** 
- **HIGH PRIORITY** - Create `sales.ts` transition hooks
- Missing transitions that should have side effects:
  - `draft → cancelled`: Cleanup operations
  - `active → cancelled`: Return inventory to distribucion
  - `confirmed → cancelled`: Return any allocated inventory
  - `delivered → cancelled`: Complex reversal with refunds

---

### 2. STAFF INVITATIONS (MEDIUM PRIORITY)

**Location:** `packages/backend/src/db/schema/staff-invitations.ts:25`

**Status Field:**
```typescript
status: invitationStatusEnum("status").notNull().default("pending"),
// Enum: ["pending", "accepted", "rejected", "cancelled", "expired"]
```

**Current Status Workflow:**
```
pending → accepted
pending → rejected
pending → cancelled
pending → expired (time-based)
```

**Hardcoded State Transitions Found:**

| File | Line | Transition | Side Effects |
|------|------|------------|--------------|
| `staff-invitation.service.ts` | 86-93 | pending → cancelled | Updates cancelledAt timestamp |
| `staff-invitation.service.ts` | 102-109 | pending → [validate] | Checks expiration |
| `staff-invitation.service.ts` | 118-157 | pending → accepted | Creates businessUsers membership |

**Side Effects Currently Implemented:**
1. **acceptInvitation()** (lines 118-157):
   - Creates `businessUsers` record (membership)
   - Updates acceptedAt, acceptedBy timestamps

2. **cancelInvitation()** (lines 86-93):
   - Updates cancelledAt timestamp

3. **validateToken()** (lines 95-116):
   - Auto-expires if past expiration date
   - Updates status to "expired"

**Recommendation:**
- **MEDIUM PRIORITY** - Simple state machine
- Benefits: Consistent timestamp management, validation on transitions
- Missing: No rejection handling currently implemented

---

### 3. VISITAS/VISITS (MEDIUM PRIORITY)

**Location:** `packages/backend/src/db/schema/visitas.ts:42`

**Status Field:**
```typescript
status: visitaStatusEnum("status").notNull().default("pendiente"),
// Enum: ["pendiente", "compro", "no_compra"]
```

**Current Status Workflow:**
```
pendiente → compro
pendiente → no_compra
```

**Hardcoded State Transitions Found:**

| File | Line | Transition | Side Effects |
|------|------|------------|--------------|
| `visita.service.ts` | 146-148 | [any] → no_compra | Requires motivoNoCompra |
| `visita.service.ts` | 151-153 | no_compra → [any] | Clears motivoNoCompra validation |
| `visita.service.ts` | 156-159 | [any] → compro | Validates saleId if provided |
| `visita.repository.ts` | 173-179 | Multiple | Updates motivoNoCompra or saleId fields |
| `sale.service.ts` | 181-189 | [sale created] | Auto-updates visita to "compro" |

**Side Effects Currently Implemented:**
1. **updateStatus()** (repository lines 162-193):
   - Sets `motivoNoCompra` when status is "no_compra"
   - Sets `saleId` when status is "compro"
   - Clears fields when transitioning away

2. **createSale()** (sale.service lines 181-189):
   - Auto-updates visita status to "compro" when sale created

**Recommendation:**
- **MEDIUM PRIORITY** - Simple workflow but good validation candidate
- Current validation logic scattered between service and repository
- State machine would centralize field management (motivoNoCompra, saleId)

---

### 4. WHATSAPP MESSAGES (LOW PRIORITY)

**Location:** `packages/backend/src/db/schema/whatsapp-messages.ts:33`

**Status Field:**
```typescript
status: varchar("status", { length: 20, enum: messageStatusEnum })
  .notNull()
  .default("enviado"),
// Enum: ["enviado", "entregado", "fallido"]
```

**Current Status Workflow:**
```
enviado → entregado
enviado → fallido
```

**Hardcoded State Transitions Found:**

| File | Line | Transition | Side Effects |
|------|------|------------|--------------|
| `whatsapp-message.repository.ts` | 180-223 | status updates | Updates sentAt timestamp |
| `whatsapp-message.service.ts` | 246 | validation | Only retries if status is "fallido" |

**Side Effects Currently Implemented:**
1. **updateStatus()** (repository lines 173-188):
   - Updates sentAt when status is "enviado"
   - Minimal side effects

**Recommendation:**
- **LOW PRIORITY** - Simple linear workflow
- Could benefit from state machine for tracking/auditing
- No complex side effects currently

---

### 5. SYNC OPERATIONS (LOW PRIORITY - Internal)

**Location:** `packages/backend/src/db/schema/sync-operations.ts:27`

**Status Field:**
```typescript
status: varchar("status", { length: 32 }).notNull().default("pending"),
// Values: ["pending", "processed", "failed"]
```

**Current Usage:**
- Internal sync framework state tracking
- Used in `SyncEngine.ts` and `SyncOperationRepository.ts`

**Recommendation:**
- **LOW PRIORITY** - Internal framework concern
- Not a business entity, pure technical state
- Current implementation in framework is sufficient

---

## Summary Table: Recommended State Machine Adoption

| Entity | Priority | Complexity | Side Effects | Current Issues |
|--------|----------|------------|--------------|----------------|
| **Sales** | ⭐ HIGH | High | Many (refunds, inventory, snapshots) | Scattered logic, complex cancel flow |
| **StaffInvitations** | MEDIUM | Low | Membership creation | Timestamp management scattered |
| **Visitas** | MEDIUM | Low | Field management (motivoNoCompra, saleId) | Validation scattered |
| **WhatsAppMessages** | LOW | Very Low | Timestamp tracking | Simple linear flow |
| **SyncOperations** | LOW | Low | None (internal) | Internal framework concern |

---

## Missing State Machine Hooks (Critical Gaps)

### Sales Entity - Missing Transitions

Based on analysis of `sale.service.ts`, the following transitions **should have side effects** but currently don't use the state machine:

```typescript
// Missing: draft → cancelled
// Should: Clean up any allocated resources

// Missing: active → cancelled  
// Should: Return inventory to distribucion (currently in cancelSale method)

// Missing: confirmed → cancelled
// Should: Release any pre-allocated inventory

// Missing: delivered → cancelled
// Should: Complex reversal (refunds already handled, but could be centralized)

// Missing: [any] → cancelled for pre_orders
// Current: Hardcoded in SaleSyncHandler.ts lines 182-192
```

**Current Implementation Issues:**
1. **Cancel logic is duplicated** between `sale.service.ts:cancelSale()` and `SaleSyncHandler.ts:handleUpdate()`
2. **Inventory return logic** is hardcoded in service method instead of being a transition hook
3. **Refund logic** is mixed with cancellation logic
4. **Version management** for pre_orders is scattered across repository methods

---

## Recommended Implementation Order

### Phase 1: Sales State Machine (HIGH PRIORITY)

**New File:** `services/transitions/sale.ts`

```typescript
// Proposed states and transitions:
draft → active          (instant_sale confirmation)
draft → confirmed       (pre_order confirmation)  
confirmed → delivered   (pre_order delivery)
[any] → cancelled       (cancellation with cleanup)

// Side effects needed:
// - draft → active: Validate stock, create snapshots
// - draft → confirmed: Create confirmedSnapshot, validate
// - confirmed → delivered: Create deliveredSnapshot, reduce inventory
// - [any] → cancelled: Handle refunds, return inventory, cleanup
```

**Refactor Needed:**
- `sale.service.ts:confirmSale()` - Lines 393-435
- `sale.service.ts:deliverPreOrder()` - Lines 437-462  
- `sale.service.ts:cancelSale()` - Lines 464-562
- `SaleSyncHandler.ts:handleUpdate()` - Lines 164-192

### Phase 2: Staff Invitation State Machine (MEDIUM PRIORITY)

**New File:** `services/transitions/staff-invitation.ts`

```typescript
// Proposed states:
pending → accepted   (create membership, set timestamps)
pending → rejected   (set rejectedAt - NOT CURRENTLY IMPLEMENTED)
pending → cancelled  (set cancelledAt)
pending → expired    (auto-transition on validation)
```

### Phase 3: Visita State Machine (MEDIUM PRIORITY)

**New File:** `services/transitions/visita.ts`

```typescript
// Proposed states:
pendiente → compro     (set saleId, clear motivoNoCompra)
pendiente → no_compra  (set motivoNoCompra, clear saleId)
// Note: Reverse transitions should be validated
```

---

## Files Requiring Updates

### For Sales State Machine:
1. `services/transitions/index.ts` - Register sale machine
2. `services/transitions/sale.ts` - Create transition hooks (NEW)
3. `services/business/sale.service.ts` - Refactor to use machine
4. `services/sync/handlers/SaleSyncHandler.ts` - Use machine for state changes
5. `services/repository/sale.repository.ts` - May keep snapshot methods

### For Staff Invitation State Machine:
1. `services/transitions/index.ts` - Register invitation machine
2. `services/transitions/staff-invitation.ts` - Create transition hooks (NEW)
3. `services/business/staff-invitation.service.ts` - Refactor to use machine

### For Visita State Machine:
1. `services/transitions/index.ts` - Register visita machine
2. `services/transitions/visita.ts` - Create transition hooks (NEW)
3. `services/business/visita.service.ts` - Refactor to use machine
4. `services/repository/visita.repository.ts` - Simplify updateStatus

---

## Architecture Observations

### Patterns Found:

1. **Good:** Purchases and Distribuciones use consistent state machine pattern
2. **Bad:** Sales have state logic scattered across service, repository, and sync handler
3. **Bad:** Status validation is duplicated in multiple places
4. **Bad:** Side effects (like inventory updates) are hardcoded in service methods

### Consistency Issues:

1. **Sale cancellation** has different code paths for API vs Sync
2. **Version management** for pre_orders is complex and error-prone
3. **Timestamp fields** (cancelledAt, acceptedAt) managed inconsistently
4. **Snapshot creation** for pre_orders happens in repository, not service

---

## Conclusion

**Immediate Action Required:**
- Implement Sales state machine to centralize complex cancellation and transition logic
- Current scattered implementation in 3+ files is error-prone

**Medium-term:**
- Staff Invitations and Visitas would benefit from state machines for cleaner code
- Simple entities with 2-3 states are good candidates for pattern consistency

**Low Priority:**
- WhatsApp messages and Sync operations can remain as-is
- Simple workflows don't justify the overhead

**Estimated Effort:**
- Sales state machine: 1-2 days (complex, many side effects)
- Staff Invitations: 2-4 hours (simple)
- Visitas: 2-4 hours (simple)
