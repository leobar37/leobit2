import { test, expect } from "@playwright/test";
import { CobrosPage } from "../page-objects/CobrosPage";

test.describe("Abono/Payment Registration", () => {
  test("register abono and verify updated debt", async ({ page }) => {
    const cobrosPage = new CobrosPage(page);
    await cobrosPage.goto();

    // Select customer with debt (Maria Garcia from previous test)
    // Note: In real scenario, we'd need the actual customer ID
    // For now, click on the first debtor card
    await page.click("[data-testid^='cliente-deuda-row-']");

    // Register partial payment of 40
    await cobrosPage.registerAbono("40", "efectivo");
    await cobrosPage.expectAbonoRegistered();

    // Go back to cobros and verify remaining debt
    await cobrosPage.goto();
    // Should show remaining debt of 60 (100 - 40)
    await expect(page.getByText(/S\/\s*60\.00/)).toBeVisible();
  });

  test("register full payment and verify zero debt", async ({ page }) => {
    const cobrosPage = new CobrosPage(page);
    await cobrosPage.goto();

    // Click on debtor
    await page.click("[data-testid^='cliente-deuda-row-']");

    // Click "Todo (liquidar)" button to pay full amount
    await page.click("text=Todo (liquidar)");
    await cobrosPage.saveAbonoButton.click();
    await cobrosPage.expectAbonoRegistered();

    // Verify no more debtors
    await cobrosPage.goto();
    await expect(page.getByText("¡Todas las cuentas al día!")).toBeVisible();
  });
});
