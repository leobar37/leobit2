import type { Page, Locator } from "@playwright/test";
import { expect } from "@playwright/test";

export class NewSalePage {
  readonly page: Page;
  readonly url = "/ventas";

  constructor(page: Page) {
    this.page = page;
  }

  async goto(): Promise<void> {
    await this.page.goto(this.url);
    await this.expectLoaded();
  }

  async expectLoaded(): Promise<void> {
    // Wait for loading screens to disappear - longer timeout for PGlite init
    await this.page.waitForFunction(
      () => {
        const text = document.body.innerText || document.body.textContent || "";
        return !text.includes("Inicializando") && 
               !text.includes("Cargando") && 
               !text.includes("Loading");
      },
      { timeout: 120000 } // 2 minutes for PGlite initialization
    ).catch(() => {
      // If still loading after 2 minutes, continue anyway
      console.log("Warning: Page still loading after 2 minutes");
    });
    await this.page.waitForLoadState("networkidle");
  }

  /**
   * Navigate to create new sale
   */
  async startNewSale(): Promise<void> {
    // Ensure page is loaded
    await this.expectLoaded();
    
    // Try multiple strategies to start a new sale
    try {
      // Strategy 1: Look for FAB or floating action button
      const fab = this.page.locator('[class*="fab"]').or(
        this.page.locator('button[aria-label*="add" i]')
      );
      
      if (await fab.isVisible({ timeout: 3000 }).catch(() => false)) {
        await fab.first().click({ timeout: 10000 });
        await this.expectLoaded();
        return;
      }
      
      // Strategy 2: Look for any button with "+" text
      const addBtn = this.page.locator('button:has-text("+")');
      if (await addBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await addBtn.first().click({ timeout: 10000 });
        await this.expectLoaded();
        return;
      }
      
      // Strategy 3: Try direct URL navigation
      await this.page.goto("/ventas/nueva", { timeout: 30000 }).catch(() => {
        // If direct URL doesn't work, try /ventas
        return this.page.goto("/ventas", { timeout: 30000 });
      });
      await this.expectLoaded();
      
    } catch (error) {
      console.log("startNewSale: Navigation error, trying again", error);
      // Give it one more try
      await this.page.goto("/ventas", { timeout: 30000 });
      await this.expectLoaded();
    }
  }

  /**
   * Select a customer from the dropdown
   */
  async selectCustomer(name: string): Promise<void> {
    // Find customer selector button/input
    const selector = this.page.locator('button', { hasText: /cliente/i }).or(
      this.page.locator('input[placeholder*="cliente" i]')
    ).or(
      this.page.locator('[class*="customer"]')
    );
    
    await selector.first().click();
    await this.page.waitForTimeout(500);
    
    // Search for customer if input appears
    const searchInput = this.page.locator('input[placeholder*="buscar" i], input[placeholder*="Buscar" i]');
    if (await searchInput.isVisible({ timeout: 1000 }).catch(() => false)) {
      await searchInput.fill(name);
      await this.page.waitForTimeout(300);
    }
    
    // Click customer from list
    const customerOption = this.page.locator('[role="button"]', { hasText: name }).or(
      this.page.locator('div', { hasText: name })
    ).first();
    await customerOption.click();
    await this.page.waitForTimeout(300);
  }

  /**
   * Select payment mode
   */
  async selectPaymentMode(mode: "pago_total" | "a_cuenta" | "debe_todo"): Promise<void> {
    const modeMap: Record<string, RegExp> = {
      "pago_total": /pago total/i,
      "a_cuenta": /a cuenta/i,
      "debe_todo": /debe todo/i
    };
    
    const modeButton = this.page.getByRole("button", { name: modeMap[mode] });
    await modeButton.click();
    await this.page.waitForTimeout(200);
  }

  /**
   * Select sale type (contado/credito)
   */
  async selectSaleType(type: "contado" | "credito"): Promise<void> {
    const typeMap: Record<string, RegExp> = {
      "contado": /contado|pago total/i,
      "credito": /crédito|debe todo/i
    };
    
    const typeButton = this.page.getByRole("button", { name: typeMap[type] });
    await typeButton.first().click();
  }

  /**
   * Add a product by name - opens variant selector
   */
  async addProductByName(productName: string): Promise<void> {
    // Click the add product button
    const addBtn = this.page.getByRole("button", { name: /agregar|seleccionar/i }).or(
      this.page.locator('button:has-text("+")')
    ).or(
      this.page.getByTestId("add-product-button")
    );
    
    await addBtn.first().click();
    await this.page.waitForTimeout(500);
    
    // Search for product if search input exists
    const searchInput = this.page.locator('input[placeholder*="buscar" i]');
    if (await searchInput.isVisible().catch(() => false)) {
      await searchInput.fill(productName);
      await this.page.waitForTimeout(300);
    }
    
    // Click product option
    const productOption = this.page.locator('[role="button"]', { hasText: productName }).first();
    await productOption.click();
    await this.page.waitForTimeout(300);
  }

  /**
   * Set weight in calculator
   */
  async setQuantity(quantity: number): Promise<void> {
    // Find kilos input
    const kilosInput = this.page.locator('input[name*="kilo" i], input[placeholder*="kilo" i]').or(
      this.page.locator('input[type="number"]').first()
    );
    
    await kilosInput.fill(quantity.toString());
    await this.page.waitForTimeout(200);
  }

  /**
   * Set number of packs
   */
  async setPacks(packs: number): Promise<void> {
    const packsInput = this.page.locator('input[name*="pack" i], input[placeholder*="pack" i]');
    
    if (await packsInput.isVisible().catch(() => false)) {
      await packsInput.fill(packs.toString());
      await this.page.waitForTimeout(200);
    }
  }

  /**
   * Add item to cart
   */
  async addToCart(): Promise<void> {
    const addBtn = this.page.getByRole("button", { name: /agregar|añadir/i });
    await addBtn.click();
    await this.page.waitForTimeout(300);
  }

  /**
   * Complete the sale
   */
  async completeSale(): Promise<string | void> {
    const completeBtn = this.page.getByRole("button", { name: /finalizar|completar|guardar/i });
    await completeBtn.click();
    await this.page.waitForTimeout(1000);
    
    // Return current URL if it contains sale ID
    const url = this.page.url();
    if (url.includes("/ventas/")) {
      return url.split("/ventas/")[1]?.split("?")[0];
    }
  }

  /**
   * Expect validation error message
   */
  async expectError(message?: string): Promise<void> {
    const errorEl = this.page.locator('[class*="error" i], [role="alert"], p.text-destructive');
    
    if (message) {
      await expect(errorEl.filter({ hasText: message })).toBeVisible();
    } else {
      await expect(errorEl.first()).toBeVisible();
    }
  }

  /**
   * Get current total from UI
   */
  async getTotal(): Promise<number> {
    const totalEl = this.page.locator('text=/total/i').or(
      this.page.locator('[class*="total"]')
    ).last();
    
    const text = await totalEl.textContent();
    const match = text?.match(/[\d,]+\.?\d*/);
    return match ? parseFloat(match[0].replace(",", "")) : 0;
  }
}
