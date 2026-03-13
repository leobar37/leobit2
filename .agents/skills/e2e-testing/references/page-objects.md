# Page Objects Reference

Lista de Page Objects disponibles para E2E testing en Avileo.

## LoginPage

**Archivo:** `packages/app/e2e/page-objects/LoginPage.ts`

### Métodos

| Método | Parámetros | Descripción |
|--------|------------|-------------|
| `goto()` | - | Navega a `/login` |
| `login(email?, password?)` | `email?: string`, `password?: string` | Realiza login con credenciales E2E por defecto |
| `expectLoggedIn()` | - | Verifica redirección a `/dashboard` |

### Ejemplo

```typescript
const loginPage = new LoginPage(page);
await loginPage.goto();
await loginPage.login(); // Usa credenciales E2E por defecto
```

---

## NewSalePage

**Archivo:** `packages/app/e2e/page-objects/NewSalePage.ts`

### Métodos

| Método | Parámetros | Descripción |
|--------|------------|-------------|
| `goto()` | - | Navega a `/ventas/nueva` |
| `selectCustomer(name)` | `name: string` | Selecciona cliente del drawer |
| `selectPaymentMode(mode)` | `mode: "pago_total" \| "a_cuenta" \| "debe_todo"` | Selecciona tipo de cobro |
| `selectProductAndVariant(product, variant)` | `product: string`, `variant: string` | Abre selector y elige producto/variante |
| `enterTotalAmount(amount)` | `amount: string` | Ingresa monto total |
| `enterPacks(packs)` | `packs: string` | Ingresa cantidad de packs (productos unidad) |
| `enterKgWeight(kg)` | `kg: string` | Ingresa peso en kg (productos kg) |
| `addToCart()` | - | Click en "Agregar al Carrito" |
| `completeSale()` | - | Click en "Completar Venta" |
| `expectSaleCompleted()` | - | Espera redirección a `/dashboard` |

### Ejemplo

```typescript
const newSalePage = new NewSalePage(page);
await newSalePage.goto();
await newSalePage.selectCustomer("Maria Garcia");
await newSalePage.selectPaymentMode("debe_todo");
await newSalePage.selectProductAndVariant("Huevos", "Unidad");
await newSalePage.enterTotalAmount("50");
await newSalePage.enterPacks("1");
await newSalePage.addToCart();
await newSalePage.completeSale();
```

---

## NewProductPage

**Archivo:** `packages/app/e2e/page-objects/NewProductPage.ts`

### Métodos

| Método | Parámetros | Descripción |
|--------|------------|-------------|
| `goto()` | - | Navega a `/productos/nuevo` |
| `fillForm(data)` | `{ name, type, unit, basePrice }` | Llena formulario de producto |
| `save()` | - | Click en "Guardar Producto" |
| `expectSaved()` | - | Espera redirección a `/productos` |

### Ejemplo

```typescript
const newProductPage = new NewProductPage(page);
await newProductPage.goto();
await newProductPage.fillForm({
  name: "Pollo Test",
  type: "pollo",
  unit: "kg",
  basePrice: "25.00"
});
await newProductPage.save();
```

---

## ProductDetailPage

**Archivo:** `packages/app/e2e/page-objects/ProductDetailPage.ts`

### Métodos

| Método | Parámetros | Descripción |
|--------|------------|-------------|
| `goto(productId)` | `productId: string` | Navega a `/productos/${id}` |
| `addVariant(data)` | `{ name, sku, unitQuantity, price }` | Abre modal y crea variante |
| `expectVariantSaved(name)` | `name: string` | Verifica variante en lista |

### Ejemplo

```typescript
const productDetailPage = new ProductDetailPage(page);
await productDetailPage.goto(productId);
await productDetailPage.addVariant({
  name: "Entero",
  sku: "TEST-001",
  unitQuantity: "2.5",
  price: "62.50"
});
```

---

## NewPurchasePage

**Archivo:** `packages/app/e2e/page-objects/NewPurchasePage.ts`

### Métodos

| Método | Parámetros | Descripción |
|--------|------------|-------------|
| `goto()` | - | Navega a `/compras/nueva` |
| `selectSupplier(name)` | `name: string` | Selecciona proveedor |
| `fillInvoiceNumber(number)` | `number: string` | Ingresa número de factura |
| `selectProductAndVariant(product, variant)` | `product: string`, `variant: string` | Selecciona producto/variante |
| `enterQuantityAndCost(qty, cost)` | `qty: string`, `cost: string` | Ingresa cantidad y costo |
| `addToCart()` | - | Agrega item al carrito |
| `savePurchase()` | - | Guarda la compra |
| `expectPurchaseSaved()` | - | Espera redirección a `/compras` |

### Ejemplo

```typescript
const newPurchasePage = new NewPurchasePage(page);
await newPurchasePage.goto();
await newPurchasePage.selectSupplier("Avícola El Buen Sabor");
await newPurchasePage.selectProductAndVariant("Pollo Test", "Entero");
await newPurchasePage.addToCart();
await newPurchasePage.savePurchase();
```

---

## CobrosPage

**Archivo:** `packages/app/e2e/page-objects/CobrosPage.ts`

### Métodos

| Método | Parámetros | Descripción |
|--------|------------|-------------|
| `goto()` | - | Navega a `/cobros` |
| `registerAbono(amount, method)` | `amount: string`, `method: string` | Registra abono para cliente seleccionado |
| `expectAbonoRegistered()` | - | Verifica mensaje de éxito |

### Ejemplo

```typescript
const cobrosPage = new CobrosPage(page);
await cobrosPage.goto();
await page.click("[data-testid^='cliente-deuda-row-']");
await cobrosPage.registerAbono("30", "efectivo");
```

---

## Crear Nuevo Page Object

Para crear un nuevo page object:

1. Crear archivo en `packages/app/e2e/page-objects/{Nombre}Page.ts`
2. Extender la clase base con `Page` de Playwright
3. Definir selectores en el constructor
4. Implementar métodos de acción
5. Agregar a esta referencia

### Template

```typescript
import type { Page } from "@playwright/test";

export class {Nombre}Page {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto("/ruta");
  }

  async action() {
    await this.page.getByTestId("selector").click();
  }
}
```
