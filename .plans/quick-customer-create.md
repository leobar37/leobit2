# Quick Customer Creation in CustomerSelect

## Objective

Add inline customer creation capability to the `CustomerSelect` component, allowing users to quickly create a new customer without leaving the sales flow. When a customer doesn't exist in the search results, users can create one directly from the selection drawer.

## Scope

### In Scope
- Add "Create new customer" UI to the `CustomerSelect` drawer
- Implement minimal form (name + phone) for quick creation
- Auto-select newly created customer after successful creation
- Follow existing `quick-tag-modal.tsx` pattern using `createModal`
- Reuse existing `useCreateCustomer` hook and validation

### Out of Scope
- Full customer form with all fields (address, DNI, notes)
- Duplicate customer detection/warning
- Edit customer from the select drawer
- Changes to backend API (already supports creation)

## Verified Context

### Current Implementation
- `CustomerSelect` component: `packages/app/app/components/customers/customer-select.tsx`
- Uses `AppDrawer` (Vaul-based) with search and list
- Current usage: `new-sale.tsx` > `CustomerSection` > `CustomerSelect`
- Existing quick create pattern: `quick-tag-modal.tsx` uses `createModal` from `~/lib/modal/create-modal`

### Data Flow
```
CustomerSelect → useCreateCustomer → CustomerService.create()
                        ↓
                  PGlite local insert + sync queue
                        ↓
              onSuccess: invalidate queries, auto-select
```

### Relevant Files
| File | Purpose |
|------|---------|
| `packages/app/app/components/customers/customer-select.tsx` | Main component to modify |
| `packages/app/app/components/tags/quick-tag-modal.tsx` | Reference pattern |
| `packages/app/app/lib/modal/create-modal.tsx` | Modal system |
| `packages/app/app/hooks/use-customers.ts` | `useCreateCustomer` hook |
| `packages/app/app/components/customers/customer-form-content.tsx` | `customerSchema` for validation |

## Implementation Steps

### Step 1: Create QuickCustomerModal Component
**File:** `packages/app/app/components/customers/quick-customer-modal.tsx`

Create a new modal component following the `quick-tag-modal.tsx` pattern:
- Use `createModal` with `type: "drawer"`
- Import `useCreateCustomer` from `~/hooks/use-customers`
- Create minimal schema: `name` (required, min 2 chars), `phone` (optional)
- Use `FormInput` components from `~/components/forms/form-input`
- On success: close modal and return created customer data

### Step 2: Modify CustomerSelect Component
**File:** `packages/app/app/components/customers/customer-select.tsx`

1. Import `QuickCustomerModal` and `useQuickCustomerModal`
2. Add `onCreateCustomer` optional prop to `CustomerSelectProps`:
   ```typescript
   onCreate?: (customer: { id: string; name: string; phone?: string | null }) => void;
   ```
3. In the drawer body, below the customer list, add a "Create new customer" button
   - Show at bottom of list or when search returns no results
   - Use `Plus` icon from lucide-react
   - Style: `shell-card-muted` with orange accent
4. On button click: open `QuickCustomerModal`
5. In `QuickCustomerModal` success callback:
   - Call `onChange` with new customer
   - Close CustomerSelect drawer (`setIsOpen(false)`)
   - Clear search query

### Step 3: Update CustomerSection in new-sale.tsx
**File:** `packages/app/app/components/sales/new-sale.tsx`

Verify `handleSelectCustomer` in `CustomerSection` works with newly created customers (it should - it already handles the `onChange` contract).

No changes needed if Step 2's `onChange` contract is preserved.

### Step 4: Add Export to Customer Components Index
**File:** `packages/app/app/components/customers/index.ts` (or create if doesn't exist)

Export `QuickCustomerModal` and `useQuickCustomerModal` if other components need them.

## Code Specifications

### Quick Customer Schema
```typescript
const quickCustomerSchema = z.object({
  name: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
  phone: z.string()
    .nullable()
    .refine((val) => {
      if (!val) return true;
      return /^9\d{8}$/.test(val);
    }, "Debe ser un celular válido (9 dígitos comenzando con 9)"),
});
```

### CustomerSelectProps Update
```typescript
interface CustomerSelectProps {
  value: string | null;
  selectedCustomer?: { id: string; name: string; phone?: string | null } | null;
  onChange: (customer: { id: string; name: string; phone?: string | null } | null) => void;
  disabled?: boolean;
  placeholder?: string;
  required?: boolean;
  helperText?: string;
  // NEW:
  allowCreate?: boolean; // Enable quick create (default: true)
}
```

### UI Placement
In the `AppDrawer.Body` of `CustomerSelect`, after the customer list:
```tsx
<div className="space-y-2">
  {/* Existing customer list */}
  
  {/* New: Create button */}
  <button
    type="button"
    onClick={() => quickCustomerModal.open()}
    className="w-full flex items-center gap-3 rounded-2xl border border-dashed border-orange-300 p-3 text-left transition-colors hover:bg-orange-50/50"
  >
    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-orange-100/50">
      <Plus className="h-5 w-5 text-orange-600" />
    </div>
    <div className="flex-1">
      <p className="font-medium text-orange-700">Crear nuevo cliente</p>
      <p className="text-sm text-muted-foreground">
        {searchQuery ? `Crear "${searchQuery}"` : "Agregar cliente rápido"}
    </div>
  </button>
</div>
```

## Risks and Edge Cases

| Risk | Impact | Mitigation |
|------|--------|------------|
| Duplicate customers created | Medium | Out of scope for MVP; full customer form has DNI field for dedup |
| Drawer height changes jarring | Low | Use consistent spacing; Vaul handles animations |
| Network failure during create | Low | Local-first PGlite: customer created locally immediately, syncs async |
| User creates customer with invalid phone | Low | Zod validation same as full form |
| Modal stacking issues | Low | `createModal` uses separate Jotai atoms, no interference |

## Validation Strategy

### Test Scenarios
1. **Happy path:**
   - Open sale creation → Click CustomerSelect → Click "Crear nuevo cliente"
   - Enter name + phone → Submit → Drawer closes, customer selected
   - Finalize sale → Customer appears in sale correctly

2. **Validation:**
   - Submit without name → Error message appears
   - Submit with invalid phone → Error message appears

3. **Offline:**
   - Disable network → Create customer → Success (local-only)
   - Re-enable network → Sync occurs → Customer appears on server

4. **Cancel flow:**
   - Open quick create → Click cancel → Return to CustomerSelect with previous search intact

### Manual QA Checklist
- [ ] "Crear nuevo cliente" button visible in CustomerSelect drawer
- [ ] Button shows search query when present ("Crear 'Juan'")
- [ ] Form validates name is required (min 2 chars)
- [ ] Form validates phone format (optional, but if present must be 9 digits starting with 9)
- [ ] After creation, customer is auto-selected in parent form
- [ ] Customer appears in list immediately after creation
- [ ] Works correctly in sales flow (`new-sale.tsx`)

## Open Questions

1. **Should we pre-fill the name field with the search query?**
   - Recommendation: Yes, if user has typed search query, pre-fill name field for faster UX

2. **Should we show the full customer form option?**
   - Recommendation: Add "Más opciones" link that navigates to `/clientes/nuevo` for full form

3. **Should the create button always show or only when no results?**
   - Recommendation: Always show at bottom (discoverability), but highlight when no results

## Estimated Effort

- **Implementation:** 2-3 hours
- **Testing:** 1 hour
- **Total:** 3-4 hours

## Dependencies

| Dependency | Status |
|------------|--------|
| `createModal` system | ✅ Exists |
| `useCreateCustomer` hook | ✅ Exists |
| `customerSchema` validation | ✅ Exists |
| `FormInput` component | ✅ Exists |
| Backend customer API | ✅ Exists |
| PGlite sync infrastructure | ✅ Exists |

**No new dependencies required.**
