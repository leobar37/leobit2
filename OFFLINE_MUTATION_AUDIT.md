# Offline-First Pattern Audit: Non-Synced Mutations

**Date**: February 22, 2026  
**Purpose**: Identify all mutations that do NOT follow offline-first pattern (no isOnline check + enqueue)  
**Scope**: All hooks in `packages/app/app/hooks/`

---

## Summary

### Entity Classification

| Entity | Sync Support | Offline Pattern | Files | Status |
|--------|---|---|---|---|
| **customers** | ✅ Yes | ✅ Has isOnline check | use-customers.ts, collections.ts | ✓ COMPLIANT |
| **sales** | ✅ Yes | ✅ Has isOnline check | use-sales.ts, collections.ts | ✓ COMPLIANT |
| **abonos** (payments) | ✅ Yes | ✅ Has isOnline check | use-payments.ts, collections.ts | ✓ COMPLIANT |
| **distribuciones** | ✅ Yes | ✅ Has isOnline check | use-distribuciones.ts | ✓ COMPLIANT |
| **suppliers** | ❌ NO | ❌ NO isOnline check | use-suppliers.ts | ⚠️ NOT SYNCED |
| **closings** | ❌ NO | ❌ NO isOnline check | use-closings.ts | ⚠️ NOT SYNCED |
| **profile** | ❌ NO | ❌ NO isOnline check | use-profile.ts | ⚠️ NOT SYNCED |
| **product_variants** | ❌ NO | ❌ NO isOnline check | use-product-variants.ts | ⚠️ NOT SYNCED |
| **payment_methods_config** | ❌ NO | ❌ NO isOnline check | use-payment-methods-config.ts | ⚠️ NOT SYNCED |
| **files** (upload) | ❌ NO | ❌ NO isOnline check | use-files.ts | ⚠️ NOT SYNCED |

---

## 1. SYNCED Entities (Offline-First Compliant)

### 1.1 Customers ✅
**File**: `packages/app/app/hooks/use-customers.ts`

```typescript
async function createCustomer(input: CreateCustomerInput): Promise<Customer> {
  if (!isOnline()) {              // ✅ Online check
    const tempId = createSyncId();
    await syncClient.enqueueOperation({
      entity: "customers",        // ✅ Queued
      operation: "insert",
      entityId: tempId,
      data: { ...input },
    });
    return { id: tempId, syncStatus: "pending", ... };
  }
  
  const { data, error } = await api.customers.post(input);  // Direct API when online
  return data as unknown as Customer;
}
```

**Status**: ✅ FULLY COMPLIANT
- Creates: Has isOnline check + enqueue
- Updates: Has isOnline check + enqueue
- Deletes: Has isOnline check + enqueue

---

### 1.2 Sales ✅
**File**: `packages/app/app/hooks/use-sales.ts`

**Status**: ✅ FULLY COMPLIANT
- Creates: Has isOnline check + enqueue for offline
- Note: Updates/deletes not currently used

---

### 1.3 Payments (Abonos) ✅
**Files**: `packages/app/app/hooks/use-payments.ts`, `packages/app/app/lib/db/collections.ts`

**Status**: ✅ FULLY COMPLIANT
- Creates: Has isOnline check + enqueue
- Deletes: Has isOnline check + enqueue
- Note: Updates not supported (v1 limitation)

---

### 1.4 Distribuciones ✅
**File**: `packages/app/app/hooks/use-distribuciones.ts`

**Status**: ✅ FULLY COMPLIANT
- Creates: Has isOnline check + enqueue
- Updates: Has isOnline check + enqueue (2 different updates)
- Deletes: Has isOnline check + enqueue

---

## 2. NOT SYNCED Entities (Offline-First NOT Implemented)

### ⚠️ 2.1 Suppliers
**File**: `packages/app/app/hooks/use-suppliers.ts`

```typescript
async function createSupplier(input: CreateSupplierInput): Promise<Supplier> {
  const { data, error } = await api.suppliers.post(input);  // ❌ NO isOnline check
  if (error) throw new Error(String(error.value));
  return data as unknown as Supplier;
}

async function updateSupplier({id, ...input}): Promise<Supplier> {
  const { data, error } = await api.suppliers({ id }).put(input);  // ❌ NO isOnline check
  if (error) throw new Error(String(error.value));
  return data as unknown as Supplier;
}

async function deleteSupplier(id: string): Promise<void> {
  const { error } = await api.suppliers({ id }).delete();  // ❌ NO isOnline check
  if (error) throw new Error(String(error.value));
}
```

**Status**: ⚠️ NOT SYNCED
- Creates: NO offline support ❌
- Updates: NO offline support ❌
- Deletes: NO offline support ❌
- **Impact**: Supplier changes WILL FAIL when offline
- **Usage**: use-product-variants.ts reorders variants (requires online)

**Recommendation**: 
1. Add `sync_status` and `sync_attempts` to backend `suppliers` table
2. Add isOnline checks + enqueue in createSupplier/updateSupplier/deleteSupplier
3. Add backend handler in sync.service.ts

---

### ⚠️ 2.2 Closings
**File**: `packages/app/app/hooks/use-closings.ts`

```typescript
async function createClosing(input: CreateClosingInput): Promise<Closing> {
  const { data, error } = await api.closings.post({
    closingDate: input.closingDate,
    totalSales: input.totalSales,
    totalAmount: input.totalAmount.toString(),
    cashAmount: input.cashAmount.toString(),
    creditAmount: input.creditAmount.toString(),
    totalKilos: input.totalKilos?.toString(),
  });  // ❌ NO isOnline check
  
  if (error) throw new Error(String(error.value));
  return data as unknown as Closing;
}
```

**Status**: ⚠️ NOT SYNCED
- Creates: NO offline support ❌
- **Impact**: Day closing (critical business operation) WILL FAIL when offline
- **Note**: Has `syncStatus` field in schema but no sync implementation

**Recommendation**:
1. Add isOnline check + enqueue in createClosing
2. Add backend handler in sync.service.ts
3. Add sync processing for critical closing data

---

### ⚠️ 2.3 Profile
**File**: `packages/app/app/hooks/use-profile.ts`

```typescript
async function updateProfile(input: UpdateProfileInput): Promise<Profile> {
  const { data, error } = await api.profile.me.put(input);  // ❌ NO isOnline check
  if (error) throw new Error(String(error.value));
  if (!data?.success || !data.data) throw new Error("Failed to update profile");
  return data.data as Profile;
}
```

**Status**: ⚠️ NOT SYNCED
- Updates: NO offline support ❌
- **Impact**: Profile edits WILL FAIL when offline
- **Usage**: useUploadAvatar also calls updateProfile

**Recommendation**:
1. Add isOnline check + enqueue in updateProfile
2. Consider if profile updates are critical for offline workflow

---

### ⚠️ 2.4 Product Variants
**File**: `packages/app/app/hooks/use-product-variants.ts`

```typescript
async function createVariant(productId: string, input: CreateVariantInput): Promise<Variant> {
  const { data, error } = await api.products({ id: productId }).variants.post(input);
  // ❌ NO isOnline check
  if (error) throw new Error(String(error.value));
  return data as unknown as Variant;
}

async function updateVariant(id: string, input: UpdateVariantInput): Promise<Variant> {
  const { data, error } = await api.variants({ id }).put(input);
  // ❌ NO isOnline check
  if (error) throw new Error(String(error.value));
  return data as unknown as Variant;
}

async function deleteVariant(id: string): Promise<void> {
  const { error } = await api.variants({ id }).delete();
  // ❌ NO isOnline check
  if (error) throw new Error(String(error.value));
}

async function reorderVariants(productId: string, variantIds: string[]): Promise<void> {
  const { error } = await api.products({ id: productId }).variants.reorder.post({variantIds});
  // ❌ NO isOnline check - calls supplier which also fails offline
  if (error) throw new Error(String(error.value));
}

async function updateVariantInventory(variantId: string, quantity: number): Promise<Variant> {
  const { data, error } = await api.variants({ id: variantId }).inventory.put({quantity});
  // ❌ NO isOnline check
  if (error) throw new Error(String(error.value));
  return data as unknown as Variant;
}
```

**Status**: ⚠️ NOT SYNCED
- Creates: NO offline support ❌
- Updates: NO offline support ❌
- Deletes: NO offline support ❌
- Reorders: NO offline support ❌
- Inventory updates: NO offline support ❌
- **Impact**: Inventory management (read-only in offline mode)

**Recommendation**:
1. Consider if variants/inventory changes need offline support
2. If yes: Add sync support similar to distribuciones
3. If no: Add explicit error message when offline

---

### ⚠️ 2.5 Payment Methods Config
**File**: `packages/app/app/hooks/use-payment-methods-config.ts`

```typescript
async function updatePaymentMethodsConfig(config: PaymentMethodsConfig): Promise<PaymentMethodsConfig> {
  const response = await api["businesses"]["payment-methods"].put({
    allowCash: config.allowCash,
    allowCard: config.allowCard,
    allowBankTransfer: config.allowBankTransfer,
    allowCrypto: config.allowCrypto,
  });  // ❌ NO isOnline check
  
  if (response.error) throw new Error(String(response.error.value));
  return response.data as unknown as PaymentMethodsConfig;
}
```

**Status**: ⚠️ NOT SYNCED
- Updates: NO offline support ❌
- **Impact**: Payment config changes only when online
- **Business Impact**: LOW (admin-only, not vendor-facing)

**Recommendation**:
1. Low priority for offline sync (admin config)
2. Could be cached in localStorage for read-only access offline

---

### ⚠️ 2.6 File Upload
**File**: `packages/app/app/hooks/use-files.ts` (if exists)

**Status**: ⚠️ NOT SYNCED (by design)
- File uploads: Cannot sync offline (no binary in IndexedDB efficiently)
- **Expected behavior**: Error message when user attempts upload offline

**Recommendation**:
1. Queue file references in IndexedDB
2. Retry uploads when online
3. Or: Show clear error message "Cannot upload files offline"

---

## 3. Risk Assessment

### High Priority (Business-Critical)
| Feature | Entity | Risk | Recommendation |
|---------|--------|------|---|
| **Day Closing** | closings | ❌ CRITICAL | Must support offline |
| **Sales** | sales | ✅ SUPPORTED | Keep as-is |
| **Payments** | abonos | ✅ SUPPORTED | Keep as-is |
| **Customers** | customers | ✅ SUPPORTED | Keep as-is |

### Medium Priority
| Feature | Entity | Risk | Recommendation |
|---------|--------|------|---|
| **Suppliers** | suppliers | ⚠️ MEDIUM | Add sync if used by vendors |
| **Product Variants** | product_variants | ⚠️ MEDIUM | Add sync if edited by vendors |
| **Distribution** | distribuciones | ✅ SUPPORTED | Keep as-is |

### Low Priority
| Feature | Entity | Risk | Recommendation |
|---------|--------|------|---|
| **Profile** | profile | ⚠️ LOW | Nice-to-have |
| **Payment Config** | payment_methods_config | ✅ LOW | Admin-only |
| **Files** | files | ✅ EXPECTED | By design |

---

## 4. Implementation Gaps

### Gap 1: Closings - Critical Missing
**Severity**: 🔴 CRITICAL

Closings have `syncStatus` field but NO offline-first implementation:

```typescript
// ❌ CURRENT (in use-closings.ts)
async function createClosing(input: CreateClosingInput): Promise<Closing> {
  const { data, error } = await api.closings.post(...);
  if (error) throw new Error(...);
  return data as unknown as Closing;
}

// ✅ SHOULD BE (following offline-first pattern)
async function createClosing(input: CreateClosingInput): Promise<Closing> {
  if (!isOnline()) {
    const tempId = createSyncId();
    await syncClient.enqueueOperation({
      entity: "closings",
      operation: "insert",
      entityId: tempId,
      data: input,
    });
    return { id: tempId, syncStatus: "pending", ...input };
  }
  
  const { data, error } = await api.closings.post(input);
  if (error) throw new Error(...);
  return data as unknown as Closing;
}
```

**Files to Modify**:
1. `packages/app/app/hooks/use-closings.ts` → Add isOnline check
2. `packages/backend/src/db/schema/closings.ts` → Confirm `sync_status` exists
3. `packages/backend/src/services/sync/sync.service.ts` → Add `applyClosingOperation()` handler
4. `packages/app/app/lib/db/schema.ts` → Add `"closings"` to entity enum

---

### Gap 2: Suppliers - Optional but Recommended
**Severity**: 🟡 MEDIUM

If vendors manage suppliers offline:

```typescript
// File: packages/app/app/hooks/use-suppliers.ts
// Add isOnline checks to: createSupplier(), updateSupplier(), deleteSupplier()
```

---

### Gap 3: Variants - Depends on Business Use Case
**Severity**: 🟡 MEDIUM

If vendors edit product variants offline:

```typescript
// File: packages/app/app/hooks/use-product-variants.ts
// Add isOnline checks to all mutation functions
```

---

## 5. Validation Checklist

### For Each Mutation Function

```typescript
// ✅ Pattern: Check online → Enqueue or API
async function myMutation(input: MyInput): Promise<MyOutput> {
  // ✅ Step 1: Check online
  if (!isOnline()) {
    // ✅ Step 2: Generate temp ID
    const tempId = createSyncId();
    
    // ✅ Step 3: Enqueue operation
    await syncClient.enqueueOperation({
      entity: "myEntity",      // Must match backend case
      operation: "insert",     // insert | update | delete
      entityId: tempId,
      data: input,
      lastError: undefined,
    });
    
    // ✅ Step 4: Return optimistic result
    return { id: tempId, syncStatus: "pending", ...input };
  }
  
  // ✅ Step 5: Call API when online
  const { data, error } = await api.myEntity.post(input);
  if (error) throw new Error(String(error.value));
  return data as unknown as MyOutput;
}
```

---

## 6. Recommendations (Prioritized)

### Immediate (Must Do)
1. ✅ **Validate entity parity** (DONE in previous report)
2. ✅ **Audit non-synced mutations** (DONE in this report)
3. 🔴 **Implement Closings offline-first** - CRITICAL for day-end operations

### Phase 1 (This Sprint)
1. Add offline-first to closings
2. Test closing offline → online sync flow
3. Update sync.service.ts with applyClosingOperation handler

### Phase 2 (Next Sprint)
1. Add offline-first to suppliers (if used by vendors)
2. Add offline-first to product_variants (if edited by vendors)

### Phase 3 (Future)
1. Add conflict resolution for concurrent updates
2. Add exponential backoff to retry strategy
3. Add comprehensive error reporting

---

## 7. Files Affected by Changes

### If Implementing Closings Sync

| File | Change | Type |
|------|--------|------|
| `packages/app/app/hooks/use-closings.ts` | Add isOnline check to createClosing() | mutation |
| `packages/backend/src/db/schema/closings.ts` | Ensure sync_status field exists | schema |
| `packages/backend/src/services/sync/sync.service.ts` | Add `applyClosingOperation()` handler | service |
| `packages/app/app/lib/db/schema.ts` | Add `"closings"` to entity enum | schema |
| `OFFLINE_FIRST_SYNC_AUDIT.md` | Update section 5 (Operation Coverage) | doc |

---

## Summary

### Current Offline-First Status

**SYNCED** (4 entities):
- ✅ customers (full CRUD)
- ✅ sales (insert, delete)
- ✅ abonos/payments (insert, delete)
- ✅ distribuciones (full CRUD)

**NOT SYNCED** (6 entities):
- ❌ closings (HAS syncStatus but NO implementation) 🔴 CRITICAL
- ⚠️ suppliers (NO syncStatus, NO implementation)
- ⚠️ product_variants (NO syncStatus, NO implementation)
- ⚠️ profile (NO implementation)
- ⚠️ payment_methods_config (NO implementation)
- ⚠️ files (No offline support by design)

### Action Required

🔴 **CRITICAL**: Implement offline-first for `closings` (has syncStatus field but no enqueue logic)

---

**End of Audit Report**

Generated: 2026-02-22  
Scope: Non-synced mutations and offline-first pattern compliance  
Result: Found 1 critical gap (closings), 5 optional gaps

