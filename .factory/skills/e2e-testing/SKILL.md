---
name: e2e-testing
description: E2E testing with Playwright for Avileo. Use when creating, updating, or debugging end-to-end tests. Covers page objects, selectors, seed data, and test execution patterns.
triggers:
  - e2e test
  - playwright
  - page object
  - test selector
  - data-testid
  - flujo test
  - test case
  - seed e2e
---

# E2E Testing Skill

This skill provides guidance and patterns for E2E testing in the Avileo project using Playwright.

## When to Use

- Creating new E2E tests
- Updating existing test flows
- Debugging failing tests
- Adding data-testid selectors to components
- Understanding the test architecture

## Quick Commands

```bash
# Run all E2E tests
bun run test:e2e

# Run with browser visible
cd packages/app && bun run test:e2e --headed

# Run specific test file
cd packages/app && bun run test:e2e flujo-admin

# View report
cd packages/app && bun run test:e2e:report
```

## Architecture Overview

### Test Structure

```
packages/app/e2e/
├── tests/                    # Test files
│   ├── flujo-admin.spec.ts
│   └── flujo-vendedor.spec.ts
├── page-objects/             # Page Object classes
│   ├── LoginPage.ts
│   ├── NewSalePage.ts
│   ├── NewProductPage.ts
│   └── ...
└── fixtures/                 # Test data
```

### Execution Flow

1. **DB Reset** - `bun run db:reset` limpia y seedea la DB
2. **Servers** - Backend (port 3000) + Frontend (port 5173)
3. **Tests** - Playwright ejecuta los tests
4. **Cleanup** - Servidores detenidos

## Page Objects Pattern

Los tests usan el patrón Page Object para encapsular selectores y acciones:

```typescript
// Ejemplo: NewSalePage.ts
export class NewSalePage {
  constructor(private page: Page) {}

  async selectCustomer(name: string) {
    await this.page.getByTestId("customer-select-button").click();
    await this.page.getByTestId("customer-search-input").fill(name);
    await this.page.getByTestId("customer-list").getByText(name).first().click();
  }

  async selectProductAndVariant(product: string, variant: string) {
    await this.page.getByTestId('variant-selector-button').click();
    await this.page.locator('[data-testid="product-option-name"]')
      .filter({ hasText: product }).first().click();
    await this.page.locator('[data-testid="variant-option-name"]')
      .filter({ hasText: variant }).first().click();
    await this.page.getByTestId('variant-selector-confirm').click();
  }
}
```

## Selectores Data-TestId

Todos los componentes UI deben tener `data-testid` para testing:

```tsx
// Componente React
<Button data-testid="save-product-button" onClick={handleSave}>
  Guardar Producto
</Button>

// Test Playwright
await page.getByTestId("save-product-button").click();
```

## Flujos de Test Existentes

### TC-ADMIN-001: Flujo de Admin
- Login → Crear producto → Crear variante → Registrar compra → Verificar inventario

### TC-VENDEDOR-001: Flujo de Vendedor
- Login → Venta crédito → Verificar deuda → Registrar abono → Verificar saldo → Venta contado

## Agregar Nuevo Caso de Test

1. **Crear archivo de test** en `packages/app/e2e/tests/`
2. **Usar page objects** existentes o crear nuevos
3. **Agregar data-testid** a componentes si es necesario
4. **Documentar** en `docs/tests/cases/`

## Referencias

- [Page Objects](./references/page-objects.md) - Lista de page objects disponibles
- [Selectors](./references/selectors.md) - Selectores data-testid por componente
- [Seed Data](./references/seed-data.md) - Datos del seed E2E

## Solución de Problemas

### Overlay data-react-grab
Se deshabilita automáticamente con `VITE_E2E_MODE=true` en el script de tests.

### Tests flaky
- Agregar `waitForTimeout` después de clicks en modales
- Usar `waitForSelector` con estado 'visible'/'hidden'
- Verificar que el elemento esté enabled antes de click

### Selectores no encontrados
- Verificar que el componente tenga el `data-testid`
- Usar el panel de Playwright para inspeccionar el DOM
- Revisar si el modal/drawer está abierto
