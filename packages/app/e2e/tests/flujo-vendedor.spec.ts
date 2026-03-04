import { test, expect } from "@playwright/test";
import { LoginPage } from "../page-objects/LoginPage";
import { NewSalePage } from "../page-objects/NewSalePage";
import { CobrosPage } from "../page-objects/CobrosPage";

test("Sesión de vendedor - flujo completo", async ({ page }) => {
  const results: { step: string; status: "✅" | "❌"; error?: string }[] = [];

  // PASO 1: Login
  console.log("🔐 PASO 1: Iniciando sesión...");
  const loginPage = new LoginPage(page);
  await loginPage.goto();
  try {
    await loginPage.login();
    await expect(page).toHaveURL("/dashboard");
    results.push({ step: "Login", status: "✅" });
    console.log("✅ Login exitoso\n");
  } catch (error: any) {
    results.push({ step: "Login", status: "❌", error: error.message });
    throw error;
  }

  // PASO 2: Crear venta a crédito
  console.log("💰 PASO 2: Creando venta a crédito...");
  const newSalePage = new NewSalePage(page);
  try {
    await newSalePage.goto();
    await newSalePage.selectCustomer("Maria Garcia");
    await newSalePage.selectPaymentMode("debe_todo");
    await newSalePage.selectProductAndVariant("Huevos", "Unidad");
    await newSalePage.enterTotalAmount("50");
    await newSalePage.enterPacks("1");
    await newSalePage.addToCart();
    await newSalePage.completeSale();
    await newSalePage.expectSaleCompleted();
    results.push({ step: "Venta crédito", status: "✅" });
    console.log("✅ Venta a crédito creada\n");
  } catch (error: any) {
    results.push({ step: "Venta crédito", status: "❌", error: error.message });
    throw error;
  }

  // PASO 3: Verificar deuda en cobros
  console.log("📋 PASO 3: Verificando deuda...");
  try {
    await page.goto("/cobros");
    await expect(page.getByText("Maria Garcia")).toBeVisible();
    await expect(page.locator('[data-testid^="cliente-deuda-row-"]').getByText(/S\/\s*50\.00/)).toBeVisible();
    results.push({ step: "Verificar deuda", status: "✅" });
    console.log("✅ Deuda verificada\n");
  } catch (error: any) {
    results.push({ step: "Verificar deuda", status: "❌", error: error.message });
    throw error;
  }

  // PASO 4: Registrar abono
  console.log("💵 PASO 4: Registrando abono...");
  const cobrosPage = new CobrosPage(page);
  try {
    await cobrosPage.goto();
    await page.click("[data-testid^='cliente-deuda-row-']");
    await cobrosPage.registerAbono("30", "efectivo");
    await cobrosPage.expectAbonoRegistered();
    results.push({ step: "Registrar abono", status: "✅" });
    console.log("✅ Abono registrado\n");
  } catch (error: any) {
    results.push({ step: "Registrar abono", status: "❌", error: error.message });
    throw error;
  }

  // PASO 5: Verificar saldo actualizado
  console.log("📊 PASO 5: Verificando saldo...");
  try {
    await cobrosPage.goto();
    await expect(page.locator('[data-testid^="cliente-deuda-row-"]').getByText(/S\/\s*20\.00/)).toBeVisible();
    results.push({ step: "Verificar saldo", status: "✅" });
    console.log("✅ Saldo actualizado\n");
  } catch (error: any) {
    results.push({ step: "Verificar saldo", status: "❌", error: error.message });
    throw error;
  }

  // PASO 6: Crear venta al contado
  console.log("💵 PASO 6: Creando venta al contado...");
  try {
    await newSalePage.goto();
    await newSalePage.selectCustomer("Juan Perez");
    await newSalePage.selectPaymentMode("pago_total");
    await newSalePage.selectProductAndVariant("Menudencias", "Mollejas");
    await newSalePage.enterTotalAmount("100");
    await newSalePage.enterKgWeight("7.5");
    await newSalePage.addToCart();
    await newSalePage.completeSale();
    await newSalePage.expectSaleCompleted();
    results.push({ step: "Venta contado", status: "✅" });
    console.log("✅ Venta al contado creada\n");
  } catch (error: any) {
    results.push({ step: "Venta contado", status: "❌", error: error.message });
    throw error;
  }

  // REPORTE FINAL
  console.log("\n" + "=".repeat(50));
  console.log("📊 REPORTE FINAL - FLUJO VENDEDOR");
  console.log("=".repeat(50));
  results.forEach((r) => {
    console.log(`${r.status} ${r.step}`);
    if (r.error) console.log(`   Error: ${r.error}`);
  });
  console.log("=".repeat(50));
  const passed = results.filter((r) => r.status === "✅").length;
  const total = results.length;
  console.log(`Total: ${passed}/${total} pasos exitosos`);
  if (passed === total) {
    console.log("🎉 TODOS LOS PASOS COMPLETADOS EXITOSAMENTE");
  } else {
    console.log("⚠️  ALGUNOS PASOS FALLARON");
  }
  console.log("=".repeat(50) + "\n");
});
