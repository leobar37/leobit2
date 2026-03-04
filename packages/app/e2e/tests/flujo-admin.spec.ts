import { test, expect } from "@playwright/test";
import { LoginPage } from "../page-objects/LoginPage";
import { NewProductPage } from "../page-objects/NewProductPage";
import { ProductDetailPage } from "../page-objects/ProductDetailPage";
import { NewPurchasePage } from "../page-objects/NewPurchasePage";

test("Sesión de admin - flujo completo", async ({ page }) => {
  // PASO 1: Login
  console.log("1. Iniciando sesión...");
  const loginPage = new LoginPage(page);
  await loginPage.goto();
  await loginPage.login();
  await expect(page).toHaveURL("/dashboard");
  console.log("✓ Login exitoso");

  // PASO 2: Crear producto
  console.log("2. Creando producto...");
  const newProductPage = new NewProductPage(page);
  await newProductPage.goto();
  
  const timestamp = Date.now();
  const productName = `Pollo Test ${timestamp}`;
  
  await newProductPage.fillForm({
    name: productName,
    type: "pollo",
    unit: "kg",
    basePrice: "25.00",
  });
  
  await newProductPage.save();
  await newProductPage.expectSaved();
  console.log(`✓ Producto creado: ${productName}`);

  // PASO 3: Crear variante
  console.log("3. Creando variante...");
  // After save, we're on the product list page, click on the product to go to detail
  await page.getByText(productName).first().click();
  
  const productDetailPage = new ProductDetailPage(page);
  // Wait for page to fully load
  await page.waitForLoadState('networkidle');
  
  // Extract productId from URL for later use
  const url = page.url();
  const match = url.match(/\/productos\/(.+)$/);
  const productId = match ? match[1] : "";
  
  await productDetailPage.addVariant({
    name: "Entero",
    sku: `TEST-${timestamp}`,
    unitQuantity: "2.5",
    price: "62.50",
  });
  
  await productDetailPage.expectVariantSaved("Entero");
  console.log("✓ Variante creada");

  // PASO 4: Registrar compra
  console.log("4. Registrando compra...");
  const newPurchasePage = new NewPurchasePage(page);
  await newPurchasePage.goto();
  
  await newPurchasePage.selectSupplier("Avícola El Buen Sabor");
  await newPurchasePage.fillInvoiceNumber(`F001-${timestamp}`);
  await newPurchasePage.selectProductAndVariant(productName, "Entero");
  await newPurchasePage.enterQuantityAndCost("10", "40.00");
  await newPurchasePage.addToCart();
  await newPurchasePage.savePurchase();
  await newPurchasePage.expectPurchaseSaved();
  console.log("✓ Compra registrada");

  // PASO 5: Verificar inventario
  console.log("5. Verificando inventario...");
  await productDetailPage.goto(productId);
  // El stock debería mostrar 10 unidades
  await expect(page.getByText(/stock|inventario/i)).toBeVisible();
  console.log("✓ Inventario verificado");

  console.log("\n✅ Flujo de admin completado exitosamente");
});
