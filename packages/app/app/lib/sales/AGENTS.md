# AGENTS.md - POS/Sales Business Logic

> Core POS calculator, cart, payment, and domain events for the chicken sales workflow.

## OVERVIEW

Weight-based (kg) and unit-based POS calculator with split-payment support, OCR receipt scanning, and decoupled event-driven cart operations.

## STRUCTURE

| File | Purpose |
|------|---------|
| `events.ts` | `EventBus` for cart, payment, customer, sale lifecycle events |
| `types.ts` | `CartItem`, `PaymentMode`, calculator params |
| `cart-utils.ts` | `addFromCalculator()`, `removeFromCart()`, `isInCart()` |
| `payment-utils.ts` | `getPaymentSummary()` - balance, validation, submit rules |
| `calculator-logic.ts` | `calculateKgProduct()`, `calculateUnitProduct()`, auto-calc logic |
| `calculator-schema.ts` | Zod schemas for kg/unit calculator forms |
| `ocr-events.ts` | `emitOCRResult()` - bridge from Kimi Vision to calculator fields |
| `navigation.ts` | Sale editor routing helpers, draft/pre_order detection |

## WHERE TO LOOK

**Adding items to cart**
- `cart-utils.ts:addFromCalculator()` - kg vs unit branching
- `calculator-logic.ts:createCartItem()` - `CalculationResult` → `CartItem`

**Payment validation**
- `payment-utils.ts:getPaymentSummary()` - `canSubmit`, `requiresCustomer`, `balanceDue`
- Payment modes: `pago_total` (contado), `a_cuenta` (partial), `debe_todo` (full credit)

**Calculator auto-calculation**
- `calculator-logic.ts:autoCalculateKgField()` - fills missing field when 2 of 3 known
- `calculator-schema.ts:parseNumber()` - safe float parsing

**OCR integration**
- `ocr-events.ts:emitOCRResult()` - emits `ocr:bruto`, `ocr:tara`, `ocr:precio`
- `events.ts` handlers bind to calculator form setters

**Sale navigation**
- `navigation.ts:shouldOpenSaleEditor()` - drafts + confirmed pre_orders editable
- Paths: `/ventas/${id}/editar`, `/ventas/${id}/editar/calculadora`

## CONVENTIONS

**Event naming**
- Domain prefix: `cart:*`, `payment:*`, `sale:*`, `ocr:*`
- Past tense for completed actions: `sale:submitSuccess`, `sale:submitError`

**CartItem construction**
- `unitPrice` always recalculated from `subtotal / quantity` (2 decimals)
- `subtotal` = `quantity * unitPrice` (ensures backend consistency)
- kg products: `variantUnitQuantity` = 1, `unit` = "kg"
- unit products: `variantUnitQuantity` parsed from variant config

**Payment rules**
- Credit sales (`a_cuenta`, `debe_todo`) require `selectedCustomer`
- Partial payment (`a_cuenta`) must be > 0 and ≤ total
- `balanceDue` only applies to credit; contado always 0

**Calculator patterns**
- Empty string represents unset (not "0")
- `isNumericText()` validates input before parsing
- `formatNumber()` (from `~/lib/utils`) for display formatting

## ANTI-PATTERNS

- **Don't mutate cart arrays** - always return new arrays via `upsertCartItem()`
- **Don't duplicate cart item keys** - `(productId, variantId)` must be unique; check `isInCart()` first
- **Don't parse amounts with `parseFloat` directly** - use `parseNumber()` to handle empty/invalid
- **Don't skip `requiresCustomer` check** - credit sales without customer crash validation
- **Don't round inconsistently** - all monetary values to 2 decimals via `toFixed(2)` before storage
