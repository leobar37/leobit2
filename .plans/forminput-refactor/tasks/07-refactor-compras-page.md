# T-007 Refactor Compras Page

## Objective

Refactor `_protected.compras.nueva.($draftId)._index.tsx` to wrap its form with `FormProvider` and properly use `FormInput` and `FormDate`.

## Requirements Covered

- `FR-010` - compras page uses FormProvider
- `NFR-003` - Follow existing codebase patterns

## Dependencies

- T-001
- T-002 (FormDate with control prop)

## Files or Areas Involved

- `packages/app/app/routes/_protected.compras.nueva.($draftId)._index.tsx` - Modify

## Actions

1. Import `FormProvider` from `react-hook-form`
2. Locate the form element (around line 73-174 in `PurchaseFormInner`)
3. Wrap the form contents with `<FormProvider {...form}>`
4. Change `FormInput` usage from `name="invoiceNumber"` to proper context usage
5. Ensure `FormDate` works with the provider
6. Note: This page has a complex structure with `PurchaseFormInner` component

## Current Code Pattern

```tsx
function PurchaseFormInner() {
  const { form } = usePurchaseForm(); // custom hook
  // ...
  <form>
    <FormInput
      name="invoiceNumber"
      label="Número de factura"
    />
    <FormDate
      name="purchaseDate"
      label="Fecha de compra"
      required
    />
```

## Target Code Pattern

```tsx
function PurchaseFormInner() {
  const { form } = usePurchaseForm();
  // ...
  <FormProvider {...form}>
    <form>
      <FormInput
        name="invoiceNumber"
        label="Número de factura"
      />
      <FormDate
        name="purchaseDate"
        label="Fecha de compra"
        required
      />
    </form>
  </FormProvider>
```

## Completion Criteria

- [ ] `FormProvider` wraps the form in `PurchaseFormInner`
- [ ] `FormInput` and `FormDate` work correctly
- [ ] Purchase form still submits successfully
- [ ] No regressions in purchase flow

## Validation

- Manual test: create a new purchase, fill all fields
- Verify the calculator flow still works (navigates to calculadora and back)
- Verify file upload still works

## Risks or Notes

- This page uses a custom hook `usePurchaseForm` that provides the form instance
- The form is split across multiple components/files (PurchaseFormInner, NuevaCompraIndexPage)
- FormProvider should be in PurchaseFormInner where the form element is
- There's also FormDate which needs control - verify it works with FormProvider
