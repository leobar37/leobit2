# Fix: Form Validation Disabled Button States

**Status**: analysis-completed → planning
**Priority**: high
**Estimated Effort**: 3-4 hours
**Created**: 2026-02-25
**Branch**: TBD
**Last Commit**: N/A

---

## 1. Context & Situation Analysis

### Current State
- **Project**: Avileo (PollosPro) - Offline-first chicken sales management system
- **Stack**: React Router v7 + React Hook Form + Zod + TanStack Query + shadcn/ui
- **What was being done**: Comprehensive analysis of form validation patterns across the frontend
- **Where we are now**: Analysis complete. Found 19 files with broken/missing disabled button validation
- **Blockers**: None

### Problem Statement
- **Objective**: Fix all forms to properly disable submit buttons when the form is invalid
- **Why it matters**: Users can currently click submit buttons even when required fields are empty or contain invalid data, leading to poor UX and potential data issues
- **Success looks like**: 
  1. All submit buttons disabled when form is invalid (`!form.formState.isValid`)
  2. Consistent pattern across all forms
  3. No regression in existing functionality

### Constraints & Assumptions
- **Must use**: 
  - `react-hook-form` with `mode: "onChange"` for live validation
  - `form.formState.isValid` for validity checking
  - Existing mutation hooks (`useCreateX`, `useUpdateX`) for submission state
- **Must avoid**: 
  - Breaking existing form behavior
  - Changing form schemas unnecessarily
  - Mixing different validation patterns
- **Assumptions**:
  - All forms use Zod schemas (verified true)
  - Button component properly handles disabled styling (verified true)
  - Tests exist for some forms (need to verify)

---

## 2. Technical Inventory

### Files Currently Involved

#### 🔴 Broken - Need Fixing (15 route files)
| File | Purpose | Status | Current Pattern | Fix Required |
|------|---------|--------|-----------------|--------------|
| `packages/app/app/routes/login.tsx` | Login form | existing | `isSubmitting` only | Add `!form.formState.isValid` |
| `packages/app/app/routes/register.tsx` | Registration form | existing | `isSubmitting \|\| isPending` | Add `!form.formState.isValid` |
| `packages/app/app/routes/_protected.clientes.nuevo.tsx` | New customer page | existing | `isLoading` only | Pass `isValid` to CustomerForm |
| `packages/app/app/routes/_protected.clientes.$id.edit.tsx` | Edit customer page | existing | `isPending` only | Add `!form.formState.isValid` |
| `packages/app/app/routes/_protected.productos.nuevo.tsx` | New product page | existing | `isLoading` only | Pass `isValid` to ProductForm |
| `packages/app/app/routes/_protected.business.create.tsx` | Create business | existing | `isPending` only | Add `!form.formState.isValid` |
| `packages/app/app/routes/_protected.business.edit.tsx` | Edit business | existing | `isPending` only | Add `!form.formState.isValid` |
| `packages/app/app/routes/_protected.profile.tsx` | User profile | existing | `isPending` only | Add `!form.formState.isValid` |
| `packages/app/app/routes/_protected.team.tsx` | Team management | existing | `isPending` only | Add `!form.formState.isValid` |
| `packages/app/app/routes/_protected.invitations.tsx` | Send invitations | existing | `isPending` only | Add `!form.formState.isValid` |
| `packages/app/app/routes/_protected.cobros.nuevo.tsx` | New payment | existing | `isSubmitting \|\| !amount` | Add `!form.formState.isValid` |
| `packages/app/app/routes/_protected.config.security.tsx` | Security settings | existing | `isSubmitting` only | Add `!form.formState.isValid` |
| `packages/app/app/routes/_protected.config.payment-methods.tsx` | Payment methods | existing | `isPending` only | Add `!form.formState.isValid` |

#### 🔴 Broken Form Components (4 component files)
| File | Purpose | Status | Current Pattern | Fix Required |
|------|---------|--------|-----------------|--------------|
| `packages/app/app/components/customers/customer-form.tsx` | Customer form component | existing | `disabled={isLoading}` | Accept `isValid` prop, include in disabled |
| `packages/app/app/components/products/product-form.tsx` | Product form component | existing | `disabled={isLoading}` | Accept `isValid` prop, include in disabled |
| `packages/app/app/components/products/variant-form.tsx` | Variant form component | existing | `disabled={isLoading}` | Accept `isValid` prop, include in disabled |
| `packages/app/app/components/payments/payment-form.tsx` | Payment form component | existing | `disabled={isPending}` | Check `form.formState.isValid` |

#### 🟢 Correct - Reference Patterns (2 files)
| File | Purpose | Status | Pattern |
|------|---------|--------|---------|
| `packages/app/app/routes/_protected.compras.nueva.tsx` | New purchase | existing | `disabled={isPending \|\| !isFormValid \|\| ...}` |
| `packages/app/app/routes/_protected.proveedores.nuevo.tsx` | New supplier | existing | `disabled={isPending \|\| !isFormValid}` |

### Architecture Context
- **Pattern to follow**: Use `mode: "onChange"` in useForm, extract `isFormValid = form.formState.isValid`, combine with mutation pending state
- **Existing similar implementations**: 
  - `packages/app/app/routes/_protected.compras.nueva.tsx` (lines 45-54, 79, 221)
  - `packages/app/app/routes/_protected.proveedores.nuevo.tsx` (lines 33-55, 133)
- **APIs/Interfaces involved**: 
  - react-hook-form `useForm`, `formState.isValid`, `formState.isSubmitting`
  - TanStack Query mutation hooks with `isPending`

---

## 3. Execution Plan

### Phase 1: Fix Form Components (Estimated: 1 hour)
**Goal**: Update reusable form components to accept and use validation state
**Prerequisites**: None
**Definition of Done**: All 4 form components accept `isValid` prop and include it in button disabled state

#### Step 1.1: Fix CustomerForm Component
- **Action**: Add `isValid` prop to CustomerForm and include it in submit button disabled logic
- **Files**: `packages/app/app/components/customers/customer-form.tsx`
- **Details**:
  - Add `isValid?: boolean` to `CustomerFormProps` interface (around line 21-25)
  - Update submit button disabled prop from `disabled={isLoading}` to `disabled={isLoading || !isValid}` (around line 135)
  - Ensure form uses `mode: "onChange"` in useForm config (around line 54-59)
- **Acceptance Criteria**:
  - [ ] `isValid` prop added to interface
  - [ ] Button disabled includes `!isValid`
  - [ ] No TypeScript errors
  - [ ] No functional regressions
- **Validation Command**: `cd packages/app && bun run typecheck`
- **Estimated Time**: 10 minutes

#### Step 1.2: Fix ProductForm Component
- **Action**: Add `isValid` prop to ProductForm and include it in submit button disabled logic
- **Files**: `packages/app/app/components/products/product-form.tsx`
- **Details**:
  - Add `isValid?: boolean` to `ProductFormProps` interface (around line 23-28)
  - Update submit button disabled prop from `disabled={isLoading}` to `disabled={isLoading || !isValid}` (around line 162)
  - Ensure form uses `mode: "onChange"` in useForm config (around line 39-59)
- **Acceptance Criteria**:
  - [ ] `isValid` prop added to interface
  - [ ] Button disabled includes `!isValid`
  - [ ] No TypeScript errors
- **Validation Command**: `cd packages/app && bun run typecheck`
- **Dependencies**: Step 1.1 (same pattern)
- **Estimated Time**: 10 minutes

#### Step 1.3: Fix VariantForm Component
- **Action**: Add `isValid` prop to VariantForm and include it in submit button disabled logic
- **Files**: `packages/app/app/components/products/variant-form.tsx`
- **Details**:
  - Add `isValid?: boolean` to props interface
  - Update submit button disabled to include `!isValid`
  - Ensure form uses `mode: "onChange"`
- **Acceptance Criteria**:
  - [ ] `isValid` prop added to interface
  - [ ] Button disabled includes `!isValid`
  - [ ] No TypeScript errors
- **Validation Command**: `cd packages/app && bun run typecheck`
- **Dependencies**: Step 1.1, 1.2
- **Estimated Time**: 10 minutes

#### Step 1.4: Fix PaymentForm Component
- **Action**: Check and include form validity in submit button disabled state
- **Files**: `packages/app/app/components/payments/payment-form.tsx`
- **Details**:
  - Extract `form.formState.isValid` from useForm (around line 55-76)
  - Update submit button disabled from `disabled={createPayment.isPending}` to `disabled={createPayment.isPending || !form.formState.isValid}`
  - Ensure form uses `mode: "onChange"`
- **Acceptance Criteria**:
  - [ ] `isValid` extracted from form state
  - [ ] Button disabled includes `!form.formState.isValid`
  - [ ] No TypeScript errors
- **Validation Command**: `cd packages/app && bun run typecheck`
- **Dependencies**: Step 1.1, 1.2, 1.3
- **Estimated Time**: 10 minutes

### Phase 2: Fix Routes Using Form Components (Estimated: 45 minutes)
**Goal**: Update routes that use form components to pass `isValid` prop
**Prerequisites**: Phase 1 complete (components have `isValid` prop)
**Definition of Done**: All parent routes pass `isValid` to form components

#### Step 2.1: Fix _protected.clientes.nuevo.tsx
- **Action**: Pass `isValid` prop to CustomerForm
- **Files**: `packages/app/app/routes/_protected.clientes.nuevo.tsx`
- **Details**:
  - Add `const form = useForm()` with `mode: "onChange"` (if not already present)
  - Pass `isValid={form.formState.isValid}` to `CustomerForm` component (around line 31-34)
  - Ensure form state is properly managed
- **Acceptance Criteria**:
  - [ ] `isValid` prop passed to CustomerForm
  - [ ] Form uses `mode: "onChange"`
  - [ ] Submit button disabled when form invalid
- **Validation Command**: `cd packages/app && bun run typecheck`
- **Dependencies**: Phase 1 (Step 1.1)
- **Estimated Time**: 15 minutes

#### Step 2.2: Fix _protected.productos.nuevo.tsx
- **Action**: Pass `isValid` prop to ProductForm
- **Files**: `packages/app/app/routes/_protected.productos.nuevo.tsx`
- **Details**:
  - Add `const form = useForm()` with `mode: "onChange"` (if not already present)
  - Pass `isValid={form.formState.isValid}` to `ProductForm` component (around line 44-48)
- **Acceptance Criteria**:
  - [ ] `isValid` prop passed to ProductForm
  - [ ] Form uses `mode: "onChange"`
  - [ ] Submit button disabled when form invalid
- **Validation Command**: `cd packages/app && bun run typecheck`
- **Dependencies**: Phase 1 (Step 1.2)
- **Estimated Time**: 15 minutes

#### Step 2.3: Fix _protected.clientes.$id.edit.tsx
- **Action**: Add `isValid` check to submit button
- **Files**: `packages/app/app/routes/_protected.clientes.$id.edit.tsx`
- **Details**:
  - Find submit button (around line 175-188)
  - Change `disabled={updateCustomer.isPending}` to `disabled={updateCustomer.isPending || !form.formState.isValid}`
  - Ensure useForm has `mode: "onChange"` (around line 37-55)
- **Acceptance Criteria**:
  - [ ] Button disabled includes `!form.formState.isValid`
  - [ ] Form uses `mode: "onChange"`
- **Validation Command**: `cd packages/app && bun run typecheck`
- **Dependencies**: None (inline form, not using component)
- **Estimated Time**: 15 minutes

### Phase 3: Fix Remaining Routes with Inline Forms (Estimated: 1.5 hours)
**Goal**: Fix all remaining routes that have inline forms (not using form components)
**Prerequisites**: Phase 1 complete
**Definition of Done**: All inline forms properly disable submit based on validity

#### Step 3.1: Fix Authentication Routes
- **Action**: Update login.tsx and register.tsx
- **Files**: 
  - `packages/app/app/routes/login.tsx`
  - `packages/app/app/routes/register.tsx`
- **Details**:
  - **login.tsx** (line 93): Change `disabled={form.formState.isSubmitting}` to `disabled={form.formState.isSubmitting || !form.formState.isValid}`
  - **register.tsx** (line 169): Change `disabled={form.formState.isSubmitting || acceptInvitation.isPending}` to include `|| !form.formState.isValid`
  - Ensure both forms have `mode: "onChange"` in useForm config
- **Acceptance Criteria**:
  - [ ] Both login and register buttons disable when form invalid
  - [ ] No TypeScript errors
- **Validation Command**: `cd packages/app && bun run typecheck`
- **Dependencies**: None
- **Estimated Time**: 20 minutes

#### Step 3.2: Fix Business Routes
- **Action**: Update business.create.tsx and business.edit.tsx
- **Files**:
  - `packages/app/app/routes/_protected.business.create.tsx`
  - `packages/app/app/routes/_protected.business.edit.tsx`
- **Details**:
  - **create.tsx** (line 125): Change `disabled={createBusiness.isPending}` to `disabled={createBusiness.isPending || !form.formState.isValid}`
  - **edit.tsx** (line 270): Change `disabled={updateBusiness.isPending}` to `disabled={updateBusiness.isPending || !form.formState.isValid}`
  - Add `mode: "onChange"` to both useForm configs
- **Acceptance Criteria**:
  - [ ] Both forms disable submit when invalid
  - [ ] No TypeScript errors
- **Validation Command**: `cd packages/app && bun run typecheck`
- **Dependencies**: Step 3.1
- **Estimated Time**: 20 minutes

#### Step 3.3: Fix Configuration Routes
- **Action**: Update config routes
- **Files**:
  - `packages/app/app/routes/_protected.config.security.tsx`
  - `packages/app/app/routes/_protected.config.payment-methods.tsx`
- **Details**:
  - **security.tsx** (line 129): Change `disabled={form.formState.isSubmitting}` to `disabled={form.formState.isSubmitting || !form.formState.isValid}`
  - **payment-methods.tsx** (line 280): Change `disabled={updateMutation.isPending}` to `disabled={updateMutation.isPending || !form.formState.isValid}`
  - Add `mode: "onChange"` where missing
- **Acceptance Criteria**:
  - [ ] Both forms disable submit when invalid
  - [ ] No TypeScript errors
- **Validation Command**: `cd packages/app && bun run typecheck`
- **Dependencies**: Step 3.2
- **Estimated Time**: 20 minutes

#### Step 3.4: Fix Remaining Routes
- **Action**: Update profile, team, invitations, and cobros routes
- **Files**:
  - `packages/app/app/routes/_protected.profile.tsx`
  - `packages/app/app/routes/_protected.team.tsx`
  - `packages/app/app/routes/_protected.invitations.tsx`
  - `packages/app/app/routes/_protected.cobros.nuevo.tsx`
- **Details**:
  - Update each file to include `|| !form.formState.isValid` in button disabled
  - Add `mode: "onChange"` to useForm configs where missing
- **Acceptance Criteria**:
  - [ ] All 4 forms disable submit when invalid
  - [ ] No TypeScript errors
- **Validation Command**: `cd packages/app && bun run typecheck`
- **Dependencies**: Step 3.3
- **Estimated Time**: 30 minutes

### Phase 4: Verification & Testing (Estimated: 30 minutes)
**Goal**: Verify all changes work correctly and no regressions
**Prerequisites**: Phase 1, 2, 3 complete
**Definition of Done**: All forms tested, type checks pass, no console errors

#### Step 4.1: Run Type Checking
- **Action**: Ensure all TypeScript compiles without errors
- **Files**: All modified files
- **Details**:
  - Run `bun run typecheck` in packages/app
  - Fix any type errors
- **Acceptance Criteria**:
  - [ ] Type check passes with 0 errors
- **Validation Command**: `cd packages/app && bun run typecheck`
- **Dependencies**: All previous steps
- **Estimated Time**: 5 minutes

#### Step 4.2: Build Verification
- **Action**: Ensure project builds successfully
- **Files**: All modified files
- **Details**:
  - Run `bun run build` in packages/app
  - Check for build errors
- **Acceptance Criteria**:
  - [ ] Build completes successfully
- **Validation Command**: `cd packages/app && bun run build`
- **Dependencies**: Step 4.1
- **Estimated Time**: 5 minutes

#### Step 4.3: Manual Testing Checklist
- **Action**: Quick manual verification of key forms
- **Files**: N/A (browser testing)
- **Details**:
  - Test login form (empty fields = disabled button)
  - Test customer creation form (empty name = disabled button)
  - Test product form (empty fields = disabled button)
  - Verify buttons enable when form becomes valid
- **Acceptance Criteria**:
  - [ ] Login form: button disabled when email/password empty
  - [ ] Customer form: button disabled when name empty
  - [ ] Product form: button disabled when required fields empty
  - [ ] All forms: button enables when valid data entered
- **Validation Command**: Manual browser testing
- **Dependencies**: Step 4.2
- **Estimated Time**: 20 minutes

---

## 4. Implementation Details

### Decisions Made
| Decision | Rationale | Impact |
|----------|-----------|--------|
| Use `mode: "onChange"` | Ensures `isValid` updates immediately as user types | Better UX, immediate feedback |
| Extract `isFormValid` variable | Improves readability | Cleaner code, consistent pattern |
| Combine `isPending` and `!isValid` | Covers both submission state and validation | Prevents double-submit and invalid submits |
| Add `isValid` prop to form components | Allows parent routes to control disabled state | Consistent pattern across all forms |

### Patterns to Follow

```typescript
// Pattern 1: Inline forms (routes)
const form = useForm<FormData>({
  resolver: zodResolver(schema),
  mode: "onChange", // REQUIRED for live validation
  defaultValues: { ... },
});

// In JSX:
<Button 
  type="submit" 
  disabled={mutation.isPending || !form.formState.isValid}
>
```

```typescript
// Pattern 2: Reusable form components
interface FormProps {
  onSubmit: (data: FormData) => void;
  isLoading?: boolean;
  isValid?: boolean; // Add this
}

// In component:
<Button 
  onClick={handleSubmit(onSubmit)}
  disabled={isLoading || !isValid} // Include isValid
>
```

```typescript
// Pattern 3: Parent routes using form components
const form = useForm<FormData>({
  resolver: zodResolver(schema),
  mode: "onChange",
  defaultValues: { ... },
});

// Pass to component:
<CustomerForm 
  onSubmit={handleSubmit}
  isLoading={createCustomer.isPending}
  isValid={form.formState.isValid} // Pass this
/>
```

---

## 5. Verification & Quality Gates

### Pre-Implementation Checklist
- [ ] All 19 files identified and accessible
- [ ] No conflicting changes in progress
- [ ] TypeScript compilation currently passing
- [ ] Development server available for testing

### Per-Phase Verification

**Phase 1**:
- Run: `cd packages/app && bun run typecheck`
- Expected: 0 TypeScript errors
- Run: `cd packages/app && bun run build`
- Expected: Successful build

**Phase 2**:
- Run: `cd packages/app && bun run typecheck`
- Expected: 0 TypeScript errors
- Manual test: Customer and Product forms disable submit when invalid

**Phase 3**:
- Run: `cd packages/app && bun run typecheck`
- Expected: 0 TypeScript errors
- Run: `cd packages/app && bun run build`
- Expected: Successful build

**Phase 4**:
- Manual testing: All forms behave correctly
- Browser console: No errors or warnings

### Final Acceptance Criteria
- [ ] All 19 files updated with proper disabled logic
- [ ] All forms use `mode: "onChange"` in useForm
- [ ] All submit buttons disabled when form invalid
- [ ] TypeScript compilation passes (0 errors)
- [ ] Build completes successfully
- [ ] Manual testing confirms correct behavior
- [ ] No console errors in browser

---

## 6. Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Breaking existing form functionality | Low | High | Test each form after changes; verify submission still works |
| TypeScript compilation errors | Medium | Low | Run typecheck after each phase; fix errors immediately |
| Missing some files | Low | Medium | Use grep to verify all forms checked; review file list |
| Form components not receiving isValid | Low | High | Verify all parent routes updated to pass prop |
| Mode "onChange" causing performance issues | Very Low | Low | Monitor form responsiveness; unlikely with simple forms |

---

## 7. Ready-to-Execute Commands

### Option A: Execute Full Plan
```bash
# Start from Phase 1
/build Execute full plan from @docs/fix-form-validation-disabled-states.md starting Phase 1
```

### Option B: Execute by Phase
```bash
# Execute only Phase 1 (Form Components)
/build Execute Phase 1 only from @docs/fix-form-validation-disabled-states.md

# Execute Phase 2 (Routes Using Form Components)
/build Execute Phase 2 only from @docs/fix-form-validation-disabled-states.md

# Execute Phase 3 (Inline Forms)
/build Execute Phase 3 only from @docs/fix-form-validation-disabled-states.md

# Execute Phase 4 (Verification)
/build Execute Phase 4 only from @docs/fix-form-validation-disabled-states.md
```

### Option C: Execute Single Step
```bash
# Execute specific step
/build Execute Step 1.1 from @docs/fix-form-validation-disabled-states.md
/build Execute Step 3.1 from @docs/fix-form-validation-disabled-states.md
```

---

## 8. Continuation Context

### If Interrupted, Resume Here:
**Current Phase**: Analysis complete, ready to start Phase 1
**Current Step**: None started
**What's Done**: Comprehensive analysis of all forms; identified 19 files needing fixes
**What's Next**: Execute Phase 1, Step 1.1 (Fix CustomerForm Component)

### Key Information for Next Agent:
- **Reference implementations**: 
  - `packages/app/app/routes/_protected.compras.nueva.tsx` (lines 45-54, 79, 221)
  - `packages/app/app/routes/_protected.proveedores.nuevo.tsx` (lines 33-55, 133)
- **Critical pattern**: Always use `mode: "onChange"` in useForm when checking `isValid`
- **Gotchas**:
  - Form components use `onClick={handleSubmit(onSubmit)}` not `type="submit"`
  - Some routes manage form state locally, others pass to components
  - Always combine `isPending` and `!isValid` for complete disabled logic

### File Summary
**Total files to modify**: 19
- Form components: 4 files
- Routes with inline forms: 11 files  
- Routes using form components: 2 files (already counted in parent count)

**Estimated total time**: 3-4 hours
- Phase 1: 1 hour
- Phase 2: 45 minutes
- Phase 3: 1.5 hours
- Phase 4: 30 minutes

---

Document generated: 2026-02-25
Generated by: Sisyphus Agent (Form Validation Analysis)
Context: Comprehensive analysis of disabled button states in forms
