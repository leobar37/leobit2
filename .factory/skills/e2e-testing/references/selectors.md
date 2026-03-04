# Selectors Reference

Lista de `data-testid` selectors disponibles en la aplicación para E2E testing.

## Login

| Selector | Componente | Uso |
|----------|------------|-----|
| `input-email` | FormInput email | LoginPage.login() |
| `input-password` | FormPassword | LoginPage.login() |

## Productos

### Formulario Producto

| Selector | Componente | Uso |
|----------|------------|-----|
| `product-name-input` | Input nombre | NewProductPage.fillForm() |
| `product-type-select` | Select tipo | NewProductPage.fillForm() |
| `product-unit-select` | Select unidad | NewProductPage.fillForm() |
| `product-baseprice-input` | Input precio base | NewProductPage.fillForm() |
| `save-product-button` | Button guardar | NewProductPage.save() |

### Variantes

| Selector | Componente | Uso |
|----------|------------|-----|
| `add-variant-button` | Button agregar | ProductDetailPage.addVariant() |
| `variant-name-input` | Input nombre variante | ProductDetailPage.addVariant() |
| `variant-sku-input` | Input SKU | ProductDetailPage.addVariant() |
| `variant-unitquantity-input` | Input cantidad unidad | ProductDetailPage.addVariant() |
| `variant-price-input` | Input precio | ProductDetailPage.addVariant() |
| `save-variant-button` | Button guardar variante | ProductDetailPage.addVariant() |

## Ventas

### Cliente

| Selector | Componente | Uso |
|----------|------------|-----|
| `customer-select-button` | Button abrir drawer | NewSalePage.selectCustomer() |
| `customer-search-input` | Input buscar cliente | NewSalePage.selectCustomer() |
| `customer-list` | Lista de clientes | NewSalePage.selectCustomer() |
| `customer-option-{id}` | Item de cliente | NewSalePage.selectCustomer() |
| `customer-selected-card` | Card cliente seleccionado | Verificación |
| `customer-selected-name` | Nombre cliente seleccionado | Verificación |

### Tipo de Cobro

| Selector | Componente | Uso |
|----------|------------|-----|
| `payment-mode-pago_total` | Button pago total | NewSalePage.selectPaymentMode("pago_total") |
| `payment-mode-a_cuenta` | Button a cuenta | NewSalePage.selectPaymentMode("a_cuenta") |
| `payment-mode-debe_todo` | Button debe | NewSalePage.selectPaymentMode("debe_todo") |

### Selector de Producto

| Selector | Componente | Uso |
|----------|------------|-----|
| `variant-selector-button` | Button outline abrir selector | NewSalePage.selectProductAndVariant() |
| `select-product-button` | Button naranja abrir selector | Alternativa |
| `variant-selector-modal` | Drawer/Modal selector | Esperar visible |
| `product-option-{id}` | Card de producto | NewSalePage.selectProductAndVariant() |
| `product-option-name` | Nombre de producto | Filtrar por texto |
| `variant-option-{id}` | Card de variante | NewSalePage.selectProductAndVariant() |
| `variant-option-name` | Nombre de variante | Filtrar por texto |
| `variant-selector-confirm` | Button "Agregar al carrito" | Confirmar selección |

### Calculadora

| Selector | Componente | Uso |
|----------|------------|-----|
| `calculator-section` | Section calculadora | Verificación |
| `calculator-empty-state` | Estado vacío | Verificación |
| `calculator-form` | Form calculadora | Verificación |
| `calculator-total-amount` | Input monto total | NewSalePage.enterTotalAmount() |
| `calculator-packs` | Input packs | NewSalePage.enterPacks() (productos unidad) |
| `calculator-units` | Input unidades | NewSalePage.enterUnits() |
| `calculator-kilos` | Input kilos | NewSalePage.enterKgWeight() (productos kg) |
| `calculator-tara` | Input tara | Opcional para kg |
| `calculator-price-per-kg` | Input precio/kg | Productos kg |
| `calculator-net-weight` | Peso neto calculado | Verificación |
| `selected-product-card` | Card producto seleccionado | Verificación |
| `selected-product-name` | Nombre producto | Verificación |
| `selected-variant-name` | Nombre variante | Verificación |
| `selected-variant-badge` | Badge variante | Verificación |

### Acciones

| Selector | Componente | Uso |
|----------|------------|-----|
| `add-to-cart-button` | Button "Agregar al Carrito" | NewSalePage.addToCart() |
| `calculator-reset-button` | Button limpiar | - |
| `another-product-button` | Button otro producto | - |
| `change-product-button` | Button cambiar producto | - |
| `submit-sale-button` | Button "Completar Venta" | NewSalePage.completeSale() |
| `submit-sale-container` | Container del button | - |

## Compras

| Selector | Componente | Uso |
|----------|------------|-----|
| `purchase-variant-selector-button` | Button outline selector | NewPurchasePage.selectProductAndVariant() |
| `purchase-select-product-button` | Button naranja selector | Alternativa |
| `supplier-selector-trigger` | Button abrir proveedores | NewPurchasePage.selectSupplier() |
| `purchase-add-to-cart-button` | Button agregar | NewPurchasePage.addToCart() |
| `save-purchase-button` | Button guardar compra | NewPurchasePage.savePurchase() |

## Cobros

| Selector | Componente | Uso |
|----------|------------|-----|
| `cliente-deuda-row-{id}` | Row de cliente con deuda | CobrosPage.goto() |

## Agregar Nuevo Selector

Para agregar un nuevo `data-testid`:

1. Agregar atributo al componente React:
   ```tsx
   <Button data-testid="mi-nuevo-button">Click</Button>
   ```

2. Actualizar esta referencia

3. Usar en el test:
   ```typescript
   await page.getByTestId("mi-nuevo-button").click();
   ```

## Convenciones de Nombres

- Usar `kebab-case` para los nombres
- Prefijo del componente: `product-`, `calculator-`, etc.
- Sufijo del tipo: `-input`, `-button`, `-select`, `-card`
- IDs dinámicos: `{nombre}-{id}` (ej: `product-option-${id}`)
