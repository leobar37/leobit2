# Caso de Test: Flujo de Vendedor

**ID:** TC-VENDEDOR-001  
**Nivel:** E2E  
**Actor:** Vendedor del sistema

## Objetivo

Verificar que un vendedor puede crear ventas a crédito y al contado, registrar cobros, y verificar deudas.

## Precondiciones

- Base de datos reseteada con seed E2E
- Usuario autenticado como vendedor
- Clientes pre-creados: Maria Garcia, Juan Perez
- Productos pre-creados: Huevos, Menudencias

## Datos de Entrada

### Venta a Crédito
| Campo | Valor |
|-------|-------|
| Cliente | `Maria Garcia` |
| Tipo de Cobro | `debe_todo` |
| Producto | `Huevos` |
| Variante | `Unidad` |
| Total | `50` |
| Packs | `1` |

### Abono
| Campo | Valor |
|-------|-------|
| Cliente | `Maria Garcia` |
| Monto | `30` |
| Método | `efectivo` |

### Venta al Contado
| Campo | Valor |
|-------|-------|
| Cliente | `Juan Perez` |
| Tipo de Cobro | `pago_total` |
| Producto | `Menudencias` |
| Variante | `Mollejas` |
| Total | `100` |
| Kilos | `7.5` |

## Pasos del Test

### 1. Login
- Navegar a `/login`
- Ingresar credenciales E2E
- Verificar redirección a `/dashboard`

### 2. Crear Venta a Crédito
- Navegar a `/ventas/nueva`
- Seleccionar cliente: Maria Garcia
- Seleccionar tipo de cobro: Debe
- Seleccionar producto: Huevos - Unidad
- Ingresar total: S/ 50
- Ingresar packs: 1
- Agregar al carrito
- Completar venta

### 3. Verificar Deuda
- Navegar a `/cobros`
- Buscar cliente: Maria Garcia
- Verificar deuda: S/ 50.00

### 4. Registrar Abono
- Click en fila de deuda de Maria Garcia
- Ingresar monto: S/ 30
- Seleccionar método: Efectivo
- Confirmar abono

### 5. Verificar Saldo Actualizado
- Volver a `/cobros`
- Verificar saldo: S/ 20.00

### 6. Crear Venta al Contado
- Navegar a `/ventas/nueva`
- Seleccionar cliente: Juan Perez
- Seleccionar tipo de cobro: Pago total
- Seleccionar producto: Menudencias - Mollejas
- Ingresar total: S/ 100
- Ingresar kilos: 7.5
- Agregar al carrito
- Completar venta

## Resultados Esperados

| Paso | Resultado |
|------|-----------|
| 1 | Login exitoso |
| 2 | Venta creada, deuda registrada |
| 3 | Deuda visible en cobros: S/ 50 |
| 4 | Abono registrado correctamente |
| 5 | Saldo actualizado: S/ 20 |
| 6 | Venta completada, sin deuda |

## Selectores Utilizados

```typescript
// Cliente
customer-select-button, customer-search-input
customer-list, customer-option-{id}

// Tipo de Cobro
payment-mode-pago_total, payment-mode-a_cuenta, payment-mode-debe_todo

// Producto
variant-selector-button, variant-selector-modal
product-option-{id}, variant-option-{id}, variant-selector-confirm

// Calculadora
calculator-total-amount, calculator-packs, calculator-kilos
add-to-cart-button, submit-sale-button

// Cobros
cliente-deuda-row-{id}
```

## Código del Test

```typescript
// packages/app/e2e/tests/flujo-vendedor.spec.ts
test("Sesión de vendedor - flujo completo", async ({ page }) => {
  const results = [];

  // PASO 1: Login
  const loginPage = new LoginPage(page);
  await loginPage.goto();
  await loginPage.login();

  // PASO 2: Venta a crédito
  const newSalePage = new NewSalePage(page);
  await newSalePage.goto();
  await newSalePage.selectCustomer("Maria Garcia");
  await newSalePage.selectPaymentMode("debe_todo");
  await newSalePage.selectProductAndVariant("Huevos", "Unidad");
  await newSalePage.enterTotalAmount("50");
  await newSalePage.enterPacks("1");
  await newSalePage.addToCart();
  await newSalePage.completeSale();

  // PASO 3: Verificar deuda
  await page.goto("/cobros");
  await expect(page.getByText("Maria Garcia")).toBeVisible();

  // PASO 4: Registrar abono
  const cobrosPage = new CobrosPage(page);
  await cobrosPage.registerAbono("30", "efectivo");

  // PASO 5: Verificar saldo
  await cobrosPage.goto();

  // PASO 6: Venta al contado
  await newSalePage.goto();
  await newSalePage.selectCustomer("Juan Perez");
  await newSalePage.selectPaymentMode("pago_total");
  await newSalePage.selectProductAndVariant("Menudencias", "Mollejas");
  await newSalePage.enterTotalAmount("100");
  await newSalePage.enterKgWeight("7.5");
  await newSalePage.addToCart();
  await newSalePage.completeSale();
});
```

## Notas

- **Productos por Unidad** (Huevos): Usan `enterPacks()` o `enterUnits()`
- **Productos por KG** (Menudencias): Usan `enterKgWeight()`
- El tipo de cobro `debe_todo` crea deuda total
- El tipo de cobro `pago_total` no crea deuda
- Los abonos reducen la deuda del cliente

## Diferencias Producto Unidad vs KG

| Aspecto | Unidad (Huevos) | KG (Menudencias) |
|---------|-----------------|------------------|
| Campos | Packs, Unidades | Kilos, Tara |
| Calculadora | `UnitCalculatorForm` | `KgCalculatorForm` |
| Selector | `calculator-packs` | `calculator-kilos` |
| Unidad | unidad | kg |
