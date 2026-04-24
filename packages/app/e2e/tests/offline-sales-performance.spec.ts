import { test, expect } from "@playwright/test";

function extractPerfMs(line: string): number | null {
  const match = line.match(/totalMs[":\s]+(\d+(?:\.\d+)?)/);
  return match ? parseFloat(match[1]) : null;
}

test.describe("Offline Sales Performance Baseline", () => {
  test("captures create draft timing logs", async ({ page }) => {
    const perfLogs: string[] = [];

    page.on("console", (msg) => {
      const text = msg.text();
      if (text.includes("[Perf]")) {
        perfLogs.push(text);
      }
    });

    await page.goto("/ventas");
    await page.waitForLoadState("networkidle");

    const createButton = page.locator('button:has([data-testid="lucide-plus"])').first();
    await createButton.click();

    await page.getByRole("button", { name: "Venta directa" }).click();
    await page.waitForTimeout(1000);

    const hasCreatePerf = perfLogs.some((line) => line.includes("[Perf][useCreateDraftSale]"));
    const hasServicePerf = perfLogs.some((line) => line.includes("[Perf][SaleService] createDraft"));

    expect(hasCreatePerf || hasServicePerf).toBeTruthy();
  });

  test("create draft completes under 500ms", async ({ page }) => {
    const perfLogs: string[] = [];

    page.on("console", (msg) => {
      const text = msg.text();
      if (text.includes("[Perf][SaleService] createDraft")) {
        perfLogs.push(text);
      }
    });

    await page.goto("/ventas");
    await page.waitForLoadState("networkidle");

    const createButton = page.locator('button:has([data-testid="lucide-plus"])').first();
    await createButton.click();

    await page.getByRole("button", { name: "Venta directa" }).click();
    await page.waitForTimeout(2000);

    expect(perfLogs.length).toBeGreaterThanOrEqual(1);

    const totalMs = extractPerfMs(perfLogs[0]);
    expect(totalMs).not.toBeNull();
    expect(totalMs!).toBeLessThan(500);
  });

  test("sales list page loads with perf instrumentation", async ({ page }) => {
    const perfLogs: string[] = [];

    page.on("console", (msg) => {
      const text = msg.text();
      if (text.includes("[Perf][SaleService] findPageByBusiness")) {
        perfLogs.push(text);
      }
    });

    await page.goto("/ventas");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);

    const hasListPerf = perfLogs.length > 0;
    expect(hasListPerf).toBeTruthy();
  });

  test("sync queue emits enqueue perf logs", async ({ page }) => {
    const perfLogs: string[] = [];

    page.on("console", (msg) => {
      const text = msg.text();
      if (text.includes("[Perf][SyncQueue]")) {
        perfLogs.push(text);
      }
    });

    await page.goto("/ventas");
    await page.waitForLoadState("networkidle");

    const createButton = page.locator('button:has([data-testid="lucide-plus"])').first();
    await createButton.click();

    await page.getByRole("button", { name: "Venta directa" }).click();
    await page.waitForTimeout(2000);

    const hasEnqueuePerf = perfLogs.some(
      (line) => line.includes("enqueue")
    );
    expect(hasEnqueuePerf).toBeTruthy();
  });

  test("editor page tracks lifetime perf", async ({ page }) => {
    const perfLogs: string[] = [];

    page.on("console", (msg) => {
      const text = msg.text();
      if (text.includes("[Perf][SaleEditorPage] lifetime")) {
        perfLogs.push(text);
      }
    });

    await page.goto("/ventas");
    await page.waitForLoadState("networkidle");

    const createButton = page.locator('button:has([data-testid="lucide-plus"])').first();
    await createButton.click();

    await page.getByRole("button", { name: "Venta directa" }).click();
    await page.waitForTimeout(1500);

    await page.goto("/ventas");
    await page.waitForTimeout(1000);

    const hasLifetime = perfLogs.length > 0;
    expect(hasLifetime).toBeTruthy();
  });
});
