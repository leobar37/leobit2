import type { Page, Locator } from "@playwright/test";

export class MobileCorePage {
  readonly page: Page;
  readonly shellRoot: Locator;
  readonly shellHeader: Locator;
  readonly shellContent: Locator;
  readonly shellFooter: Locator;
  readonly fixedFooter: Locator;
  readonly floatingActions: Locator;
  readonly bottomNav: Locator;
  readonly themeToggle: Locator;
  readonly slotHostHeaderLeft: Locator;
  readonly slotHostHeaderCenter: Locator;
  readonly slotHostHeaderRight: Locator;
  readonly slotHostFooter: Locator;
  readonly slotHostFloating: Locator;

  constructor(page: Page) {
    this.page = page;
    this.shellRoot = page.getByTestId("mobile-shell-root");
    this.shellHeader = page.getByTestId("mobile-shell-header");
    this.shellContent = page.getByTestId("mobile-shell-content");
    this.shellFooter = page.getByTestId("mobile-shell-footer");
    this.fixedFooter = page.getByTestId("mobile-fixed-footer");
    this.floatingActions = page.getByTestId("mobile-floating-actions");
    this.bottomNav = page.getByTestId("mobile-bottom-nav");
    this.themeToggle = page.getByTestId("theme-toggle");
    this.slotHostHeaderLeft = page.getByTestId("mobile-slot-host-header:left");
    this.slotHostHeaderCenter = page.getByTestId("mobile-slot-host-header:center");
    this.slotHostHeaderRight = page.getByTestId("mobile-slot-host-header:right");
    this.slotHostFooter = page.getByTestId("mobile-slot-host-footer");
    this.slotHostFloating = page.getByTestId("mobile-slot-host-floating");
  }

  async expectShellVisible(): Promise<void> {
    await this.shellRoot.waitFor({ state: "visible" });
  }

  async expectHeaderVisible(): Promise<void> {
    await this.shellHeader.waitFor({ state: "visible" });
  }

  async expectContentVisible(): Promise<void> {
    await this.shellContent.waitFor({ state: "visible" });
  }

  async expectBottomNavVisible(): Promise<void> {
    await this.bottomNav.waitFor({ state: "visible" });
  }

  async expectBottomNavHidden(): Promise<void> {
    await this.bottomNav.waitFor({ state: "hidden" });
  }

  async expectFixedFooterVisible(): Promise<void> {
    await this.fixedFooter.waitFor({ state: "visible" });
  }

  async expectFloatingActionsVisible(): Promise<void> {
    await this.floatingActions.waitFor({ state: "visible" });
  }

  async expectThemeToggleVisible(): Promise<void> {
    await this.themeToggle.waitFor({ state: "visible" });
  }

  async expectFooterDoesNotOverlapNav(): Promise<void> {
    const footerBox = await this.fixedFooter.boundingBox();
    const navBox = await this.bottomNav.boundingBox();

    if (!footerBox || !navBox) {
      throw new Error("Could not measure footer or nav bounding boxes");
    }

    const footerBottom = footerBox.y + footerBox.height;
    const hasOverlap = footerBottom > navBox.y;

    if (hasOverlap) {
      throw new Error(
        `Fixed footer overlaps bottom nav: footer bottom=${footerBottom}, nav top=${navBox.y}`
      );
    }
  }

  async expectFloatingActionsAboveNav(): Promise<void> {
    const fabBox = await this.floatingActions.boundingBox();
    const navBox = await this.bottomNav.boundingBox();

    if (!fabBox || !navBox) {
      throw new Error("Could not measure FAB or nav bounding boxes");
    }

    const fabBottom = fabBox.y + fabBox.height;
    if (fabBottom > navBox.y) {
      throw new Error(
        `Floating actions overlap bottom nav: FAB bottom=${fabBottom}, nav top=${navBox.y}`
      );
    }
  }

  async expectInViewport(locator: Locator): Promise<void> {
    const box = await locator.boundingBox();
    const viewport = this.page.viewportSize();

    if (!box || !viewport) {
      throw new Error("Could not measure element or viewport");
    }

    const isInViewport =
      box.x >= 0 &&
      box.y >= 0 &&
      box.x + box.width <= viewport.width &&
      box.y + box.height <= viewport.height;

    if (!isInViewport) {
      throw new Error(
        `Element not fully in viewport: ${JSON.stringify(box)} vs viewport ${JSON.stringify(viewport)}`
      );
    }
  }

  async getCurrentTheme(): Promise<string> {
    const html = this.page.locator("html");
    const classList = await html.getAttribute("class");
    const dataTheme = await html.getAttribute("data-theme");

    if (classList?.includes("dark")) return "dark";
    if (dataTheme) return dataTheme;
    return "light";
  }

  async getPersistedThemeMode(): Promise<string | null> {
    return this.page.evaluate(() => {
      try {
        return localStorage.getItem("avileo-theme");
      } catch {
        return null;
      }
    });
  }

  async cycleTheme(): Promise<void> {
    await this.themeToggle.click();
    await this.page.waitForTimeout(300);
  }

  async getSlotTargetCount(slotHost: Locator): Promise<number> {
    return slotHost.locator('[data-mobile-slot-target]').count();
  }

  async expectSlotEmpty(slotHost: Locator): Promise<void> {
    const count = await this.getSlotTargetCount(slotHost);
    if (count !== 0) {
      throw new Error(`Expected slot to be empty but found ${count} targets`);
    }
  }
}
