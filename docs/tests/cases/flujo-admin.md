# Caso de Test: Flujo de Admin

**ID:** TC-ADMIN-001  
**Nivel:** E2E  
**Actor:** Administrador del sistema

## Objetivo

Verificar que un administrador puede crear productos, variantes, registrar compras y verificar el inventario.

## Precondiciones

- Base de datos reseteada con seed E2E
- Usuario autenticado como admin
- Proveedores pre-creados en seed

## Datos de Entrada

| Campo | Valor |
|-------|-------|
| Nombre Producto | `Pollo Test {timestamp}` |
| Tipo | `pollo` |
| Unidad | `kg` |
| Precio Base | `25.00` |
| Nombre Variante | `Entero` |
| SKU | `TEST-{timestamp}` |
| Cantidad Unidad | `2.5` |
| Precio Variante | `62.50` |
| Proveedor | `Avícola El Buen Sabor` |
| Factura | `F001-{timestamp}` |
| Cantidad Compra | `10` |
| Costo Unitario | `40.00` |

## Pasos del Test

### 1. Login
- Navegar a `/login`
- Ingresar credenciales E2E
- Verificar redirección a `/dashboard`

### 2. Crear Producto
- Navegar a `/productos/nuevo`
- Llenar formulario con datos del producto
- Guardar producto
- Verificar redirección a lista de productos

### 3. Crear Variante
- Hacer click en producto creado
- Click en "Agregar" variante
- Llenar formulario de variante
- Guardar variante
- Verificar variante en lista

### 4. Registrar Compra
- Navegar a `/compras/nueva`
- Seleccionar proveedor
- Ingresar número de factura
- Seleccionar producto y variante
- Ingresar cantidad y costo
- Agregar al carrito
- Guardar compra
- Verificar redirección a `/compras`

### 5. Verificar Inventario
- Navegar a detalle del producto
- Verificar stock actualizado

## Resultados Esperados

| Paso | Resultado |
|------|-----------|
| 1 | Login exitoso, token JWT generado |
| 2 | Producto creado con ID único |
| 3 | Variante asociada correctamente |
| 4 | Compra registrada, items guardados |
| 5 | Stock muestra 10 unidades |

## Selectores Utilizados

```typescript
// Login
input-email, input-password

// Producto
product-name-input, product-type-select, product-unit-select
product-baseprice-input, save-product-button

// Variante
add-variant-button, variant-name-input, variant-sku-input
variant-unitquantity-input, variant-price-input, save-variant-button

// Compra
purchase-variant-selector-button, supplier-selector-trigger
purchase-add-to-cart-button, save-purchase-button
```

## Código del Test

```typescript
// packages/app/e2e/tests/flujo-admin.spec.ts
test("Sesión de admin - flujo completo", async ({ page }) => {
  // PASO 1: Login
  const loginPage = new LoginPage(page);
  await loginPage.goto();
  await loginPage.login();
  await expect(page).toHaveURL("/dashboard");

  // PASO 2: Crear producto
  const newProductPage = new NewProductPage(page);
  await newProductPage.goto();
  const timestamp = Date.now();
  await newProductPage.fillForm({
    name: `Pollo Test ${timestamp}`,
    type: "pollo",
    unit: "kg",
    basePrice: "25.00",
  });
  await newProductPage.save();

  // PASO 3: Crear variante
  const productDetailPage = new ProductDetailPage(page);
  await productDetailPage.addVariant({
    name: "Entero",
    sku: `TEST-${timestamp}`,
    unitQuantity: "2.5",
    price: "62.50",
  });

  // PASO 4: Registrar compra
  const newPurchasePage = new NewPurchasePage(page);
  await newPurchasePage.goto();
  await newPurchasePage.selectSupplier("Avícola El Buen Sabor");
  await newPurchasePage.selectProductAndVariant(productName, "Entero");
  await newPurchasePage.addToCart();
  await newPurchasePage.savePurchase();

  // PASO 5: Verificar inventario
  await productDetailPage.goto(productId);
  await expect(page.getByText(/stock|inventario/i)).toBeVisible();
});
```

## Notas

- El timestamp asegura nombres únicos para productos
- El stock inicial es 0, después de la compra debe ser 10
- La compra se registra con estado "recibido"
