# E2E Testing Plan: Sales & Orders Feature

> **Document Type**: Technical Implementation Plan  
> **Scope**: End-to-end testing for sales (ventas) and orders (pedidos) flows  
> **Target**: 70+ test cases with MSW mock infrastructure for 1000+ records  
> **Created**: 2026-04-10

---

## 1. Overview

### 1.1 Objective

Create a comprehensive E2E testing suite covering all sales and orders flows in the Avileo application, with:

- **70+ test cases** organized by functional category
- **MSW mock infrastructure** supporting 1000+ records without database dependency
- **Reusable patterns** documented for future E2E test development
- **Phase-by-phase execution** guide for incremental implementation

### 1.2 Current State Analysis

**Existing Infrastructure:**

| Component | Status | Location |
|-----------|--------|----------|
| Playwright Config | ✅ Exists | `packages/app/playwright.config.ts` |
| MSW Handlers | ✅ Exists | `packages/app/e2e/mocks/handlers.ts` |
| Page Objects | ✅ Partial | `packages/app/e2e/page-objects/` |
| Test Data | ✅ Exists | `packages/app/e2e/fixtures/test-data.ts` |
| Existing Tests | ✅ ~12 specs | `packages/app/e2e/tests/*.spec.ts` |

**Existing Page Objects:**

- `NewSalePage.ts` - Sale creation flow
- `NewOrderPage.ts` - Order creation flow
- `OrderDetailPage.ts` - Order lifecycle management
- `OrdersListPage.ts` - Order listing and search
- `LoginPage.ts` - Authentication
- `CobrosPage.ts` - Payment collection
- `RegisterPage.ts` - User registration
- `NewProductPage.ts` - Product creation
- `NewPurchasePage.ts` - Purchase creation
- `ProductDetailPage.ts` - Product management

### 1.3 Test Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     E2E Test Architecture                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐       │
│  │  Test Specs  │───▶│ Page Objects │───▶│  MSW Mocks   │       │
│  │  (70+ tests) │    │ (Abstractions)│    │ (1000+ recs) │       │
│  └──────────────┘    └──────────────┘    └──────────────┘       │
│         │                   │                   │               │
│         ▼                   ▼                   ▼               │
│  ┌──────────────────────────────────────────────────────┐      │
│  │              Playwright + Mobile Viewport             │      │
│  │              (390x844 - iPhone 14)                    │      │
│  └──────────────────────────────────────────────────────┘      │
│                              │                                  │
│                              ▼                                  │
│  ┌──────────────────────────────────────────────────────┐      │
│  │              React Router v7 Application              │      │
│  └──────────────────────────────────────────────────────┘      │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. Test Case Matrix (70+ Cases)

### 2.1 FLUJO DE VENTA DIRECTA (25 cases)

#### Venta al Contado (5 cases)

| ID | Test Case | Priority | Page Objects |
|----|-----------|----------|--------------|
| SALE-CASH-001 | Venta simple con un producto | P0 | NewSalePage |
| SALE-CASH-002 | Venta con múltiples productos | P0 | NewSalePage |
| SALE-CASH-003 | Venta con tara/peso (kg) | P0 | NewSalePage |
| SALE-CASH-004 | Venta con producto por unidades (packs) | P1 | NewSalePage |
| SALE-CASH-005 | Venta con descuento aplicado | P1 | NewSalePage |

#### Venta a Crédito (5 cases)

| ID | Test Case | Priority | Page Objects |
|----|-----------|----------|--------------|
| SALE-CRED-001 | Crédito sin abono (debe todo) | P0 | NewSalePage, CobrosPage |
| SALE-CRED-002 | Crédito con abono parcial (a cuenta) | P0 | NewSalePage, CobrosPage |
| SALE-CRED-003 | Crédito con abono total (pago total) | P1 | NewSalePage, CobrosPage |
| SALE-CRED-004 | Validación: crédito sin cliente muestra error | P0 | NewSalePage |
| SALE-CRED-005 | Verificar deuda en página de cobros | P1 | CobrosPage |

#### Venta con Distribución (2 cases)

| ID | Test Case | Priority | Page Objects |
|----|-----------|----------|--------------|
| SALE-DIST-001 | Crear venta desde distribución asignada | P1 | NewSalePage |
| SALE-DIST-002 | Validar stock disponible en distribución | P2 | NewSalePage |

#### Venta desde Visita (2 cases)

| ID | Test Case | Priority | Page Objects |
|----|-----------|----------|--------------|
| SALE-VIS-001 | Crear venta desde visita programada | P1 | NewSalePage |
| SALE-VIS-002 | Verificar vinculación visita-venta | P2 | NewSalePage |

#### Borrador de Venta (3 cases)

| ID | Test Case | Priority | Page Objects |
|----|-----------|----------|--------------|
| SALE-DRAFT-001 | Guardar venta como borrador | P1 | NewSalePage |
| SALE-DRAFT-002 | Recuperar y completar borrador | P1 | NewSalePage |
| SALE-DRAFT-003 | Cancelar borrador de venta | P2 | NewSalePage |

#### Validaciones de Venta (8 cases)

| ID | Test Case | Priority | Page Objects |
|----|-----------|----------|--------------|
| SALE-VAL-001 | Error: venta sin productos | P0 | NewSalePage |
| SALE-VAL-002 | Error: total igual a 0 | P0 | NewSalePage |
| SALE-VAL-003 | Error: total no coincide con suma de items | P1 | NewSalePage |
| SALE-VAL-004 | Error: crédito sin seleccionar cliente | P0 | NewSalePage |
| SALE-VAL-005 | Error: contado con monto diferente al total | P1 | NewSalePage |
| SALE-VAL-006 | Error: crédito con abono mayor al total | P1 | NewSalePage |
| SALE-VAL-007 | Error: producto sin variante seleccionada | P1 | NewSalePage |
| SALE-VAL-008 | Error: cantidad excede stock disponible | P2 | NewSalePage |

### 2.2 GESTIÓN DE ITEMS EN VENTA (6 cases)

| ID | Test Case | Priority | Page Objects |
|----|-----------|----------|--------------|
| ITEM-001 | Agregar item al carrito | P0 | NewSalePage |
| ITEM-002 | Actualizar cantidad de item | P0 | NewSalePage |
| ITEM-003 | Actualizar precio unitario de item | P1 | NewSalePage |
| ITEM-004 | Eliminar item del carrito | P0 | NewSalePage |
| ITEM-005 | Eliminar último item (carrito vacío) | P1 | NewSalePage |
| ITEM-006 | Agregar mismo producto con variante diferente | P1 | NewSalePage |

### 2.3 CANCELACIÓN DE VENTAS (6 cases)

| ID | Test Case | Priority | Page Objects |
|----|-----------|----------|--------------|
| CANCEL-001 | Cancelar venta al contado | P1 | SalesListPage, SaleDetailPage |
| CANCEL-002 | Cancelar venta a crédito | P1 | SalesListPage, SaleDetailPage |
| CANCEL-003 | Cancelar con reembolso en efectivo | P1 | SaleDetailPage |
| CANCEL-004 | Cancelar con reembolso Yape/Plin | P2 | SaleDetailPage |
| CANCEL-005 | Cancelar con reembolso a saldo | P2 | SaleDetailPage |
| CANCEL-006 | Cancelar sin reembolso | P2 | SaleDetailPage |

### 2.4 ACTUALIZACIÓN DE VENTAS (5 cases)

| ID | Test Case | Priority | Page Objects |
|----|-----------|----------|--------------|
| UPDATE-001 | Cambiar cliente de venta | P2 | SaleDetailPage |
| UPDATE-002 | Cambiar tipo de venta (contado/crédito) | P2 | SaleDetailPage |
| UPDATE-003 | Cambiar modo de pago | P2 | SaleDetailPage |
| UPDATE-004 | Actualizar montos de venta | P2 | SaleDetailPage |
| UPDATE-005 | No permitir editar venta entregada | P2 | SaleDetailPage |

### 2.5 TOKENS DE VENTA PÚBLICA (4 cases)

| ID | Test Case | Priority | Page Objects |
|----|-----------|----------|--------------|
| TOKEN-001 | Generar token de venta pública | P2 | SaleDetailPage |
| TOKEN-002 | Regenerar token existente | P2 | SaleDetailPage |
| TOKEN-003 | Activar/desactivar token | P2 | SaleDetailPage |
| TOKEN-004 | Obtener venta por token público | P2 | PublicSalePage |

### 2.6 LISTADOS Y ESTADÍSTICAS DE VENTAS (6 cases)

| ID | Test Case | Priority | Page Objects |
|----|-----------|----------|--------------|
| LIST-001 | Paginación de ventas | P1 | SalesListPage |
| LIST-002 | Filtro por fechas | P1 | SalesListPage |
| LIST-003 | Filtro por tipo (contado/crédito) | P1 | SalesListPage |
| LIST-004 | Ver detalle de venta | P0 | SaleDetailPage |
| LIST-005 | Ver items de venta | P0 | SaleDetailPage |
| LIST-006 | Estadísticas del día en dashboard | P1 | DashboardPage |

### 2.7 FLUJO DE PEDIDOS - CREACIÓN (8 cases)

| ID | Test Case | Priority | Page Objects |
|----|-----------|----------|--------------|
| ORDER-CREATE-001 | Crear pedido a crédito sin fecha (error) | P1 | NewOrderPage |
| ORDER-CREATE-002 | Crear pedido con fecha futura | P0 | NewOrderPage |
| ORDER-CREATE-003 | Crear pedido con fecha hoy | P0 | NewOrderPage |
| ORDER-CREATE-004 | Crear pedido al contado | P0 | NewOrderPage |
| ORDER-CREATE-005 | Crear pedido con múltiples productos | P1 | NewOrderPage |
| ORDER-CREATE-006 | Crear pedido con precios cotizados | P1 | NewOrderPage |
| ORDER-CREATE-007 | Crear pedido con fecha de orden específica | P2 | NewOrderPage |
| ORDER-CREATE-008 | Crear pedido con comprobante de adelanto | P2 | NewOrderPage |

### 2.8 VALIDACIONES DE PEDIDOS (3 cases)

| ID | Test Case | Priority | Page Objects |
|----|-----------|----------|--------------|
| ORDER-VAL-001 | Error: fecha pasada no permitida | P1 | NewOrderPage |
| ORDER-VAL-002 | Error: fecha inválida | P1 | NewOrderPage |
| ORDER-VAL-003 | Error: cliente requerido | P0 | NewOrderPage |

### 2.9 CICLO DE VIDA DE PEDIDOS (10 cases)

| ID | Test Case | Priority | Page Objects |
|----|-----------|----------|--------------|
| ORDER-LIFE-001 | Confirmar pedido en borrador | P0 | OrderDetailPage |
| ORDER-LIFE-002 | Confirmar con versión base específica | P2 | OrderDetailPage |
| ORDER-LIFE-003 | Error: confirmar pedido ya confirmado | P1 | OrderDetailPage |
| ORDER-LIFE-004 | Entregar pedido confirmado | P0 | OrderDetailPage |
| ORDER-LIFE-005 | Entregar con ajustes de cantidad | P1 | OrderDetailPage |
| ORDER-LIFE-006 | Entregar con ajustes de precio | P1 | OrderDetailPage |
| ORDER-LIFE-007 | Entrega parcial de items | P1 | OrderDetailPage |
| ORDER-LIFE-008 | Cancelar pedido en borrador | P1 | OrderDetailPage |
| ORDER-LIFE-009 | Cancelar pedido confirmado | P1 | OrderDetailPage |
| ORDER-LIFE-010 | Error: cancelar pedido entregado | P1 | OrderDetailPage |

### 2.10 GESTIÓN DE ITEMS EN PEDIDOS (5 cases)

| ID | Test Case | Priority | Page Objects |
|----|-----------|----------|--------------|
| ORDER-ITEM-001 | Agregar item a pedido existente | P1 | OrderDetailPage |
| ORDER-ITEM-002 | Modificar cantidad ordenada | P1 | OrderDetailPage |
| ORDER-ITEM-003 | Modificar precio cotizado | P1 | OrderDetailPage |
| ORDER-ITEM-004 | Marcar item como modificado | P2 | OrderDetailPage |
| ORDER-ITEM-005 | Eliminar item de pedido | P1 | OrderDetailPage |

### 2.11 VERSIONADO DE PEDIDOS (3 cases)

| ID | Test Case | Priority | Page Objects |
|----|-----------|----------|--------------|
| ORDER-VER-001 | Snapshot al confirmar | P2 | OrderDetailPage |
| ORDER-VER-002 | Snapshot al entregar | P2 | OrderDetailPage |
| ORDER-VER-003 | Incremento de versión en cambios | P2 | OrderDetailPage |

### 2.12 PERMISOS EN PEDIDOS (2 cases)

| ID | Test Case | Priority | Page Objects |
|----|-----------|----------|--------------|
| ORDER-PERM-001 | Permitir edición de cliente | P2 | OrderDetailPage |
| ORDER-PERM-002 | Bloquear edición de cliente | P2 | OrderDetailPage |

### 2.13 TESTS DE VOLUMEN (12 cases)

#### Generación de Mocks (4 cases)

| ID | Test Case | Priority | Description |
|----|-----------|----------|-------------|
| VOL-MOCK-001 | Generar 1000 clientes mock | P1 | MSW handler |
| VOL-MOCK-002 | Generar 100 productos mock | P1 | MSW handler |
| VOL-MOCK-003 | Generar 500 ventas mock | P1 | MSW handler |
| VOL-MOCK-004 | Generar 200 pedidos mock | P1 | MSW handler |

#### Performance de Listados (4 cases)

| ID | Test Case | Priority | Page Objects |
|----|-----------|----------|--------------|
| VOL-PERF-001 | Cargar listado con 1000 registros | P1 | SalesListPage, OrdersListPage |
| VOL-PERF-002 | Scroll infinito rendimiento | P1 | SalesListPage, OrdersListPage |
| VOL-PERF-003 | Búsqueda en 1000 registros | P1 | SalesListPage, OrdersListPage |
| VOL-PERF-004 | Filtro por fechas en volumen | P1 | SalesListPage, OrdersListPage |

#### Performance de Operaciones (4 cases)

| ID | Test Case | Priority | Page Objects |
|----|-----------|----------|--------------|
| VOL-OP-001 | Crear venta con carga alta | P2 | NewSalePage |
| VOL-OP-002 | Confirmar pedido con carga alta | P2 | OrderDetailPage |
| VOL-OP-003 | Cancelar con carga alta | P2 | OrderDetailPage |
| VOL-OP-004 | Agregar item con carga alta | P2 | NewSalePage, OrderDetailPage |

### 2.14 TESTS DE SINCRONIZACIÓN (6 cases)

| ID | Test Case | Priority | Description |
|----|-----------|----------|-------------|
| SYNC-001 | 1000 operaciones pendientes | P1 | MSW + IndexedDB |
| SYNC-002 | Sincronización con conflictos | P1 | MSW handler |
| SYNC-003 | Verificación en IndexedDB | P1 | Browser storage |
| SYNC-004 | Reintento de operaciones fallidas | P1 | Sync engine |
| SYNC-005 | Resolución de conflictos offline | P2 | Conflict UI |
| SYNC-006 | Sync en segundo plano | P2 | Background sync |

### 2.15 TESTS DE INTEGRACIÓN E2E (8 cases)

| ID | Test Case | Priority | Description |
|----|-----------|----------|-------------|
| E2E-001 | Flujo completo: venta contado | P0 | Login → Venta → Verificación |
| E2E-002 | Flujo completo: venta crédito | P0 | Login → Venta → Cobro → Verificación |
| E2E-003 | Flujo: pedido → venta | P0 | Pedido → Confirmar → Entregar → Venta |
| E2E-004 | Flujo: visita → pedido → venta | P1 | Visita → Pedido → Venta |
| E2E-005 | Flujo: distribución → ventas | P1 | Distribución → Múltiples ventas |
| E2E-006 | Escenario borde: 0 items | P1 | Validaciones |
| E2E-007 | Escenario borde: 50+ items | P2 | Performance |
| E2E-008 | Escenario borde: fecha lejana | P2 | Validaciones |

---

## 3. File Impact Analysis

### 3.1 New Files to Create (18 files)

| File Path | Type | Purpose | Lines Est. |
|-----------|------|---------|------------|
| `e2e/mocks/volume-data.ts` | New | Generators for 1000+ mock records | 400 |
| `e2e/mocks/volume-handlers.ts` | New | MSW handlers for volume testing | 300 |
| `e2e/mocks/sync-handlers.ts` | New | MSW handlers for sync scenarios | 250 |
| `e2e/mocks/factories/customer.factory.ts` | New | Customer mock factory | 150 |
| `e2e/mocks/factories/product.factory.ts` | New | Product mock factory | 150 |
| `e2e/mocks/factories/sale.factory.ts` | New | Sale mock factory | 200 |
| `e2e/mocks/factories/order.factory.ts` | New | Order mock factory | 200 |
| `e2e/page-objects/SalesListPage.ts` | New | Sales listing page object | 120 |
| `e2e/page-objects/SaleDetailPage.ts` | New | Sale detail page object | 180 |
| `e2e/page-objects/DashboardPage.ts` | New | Dashboard page object | 80 |
| `e2e/page-objects/PublicSalePage.ts` | New | Public token sale page | 60 |
| `e2e/tests/sales-cash.spec.ts` | New | Cash sale test suite | 200 |
| `e2e/tests/sales-credit.spec.ts` | New | Credit sale test suite | 250 |
| `e2e/tests/sales-validations.spec.ts` | New | Sale validation tests | 300 |
| `e2e/tests/sales-cancellation.spec.ts` | New | Sale cancellation tests | 200 |
| `e2e/tests/orders-creation.spec.ts` | New | Order creation test suite | 250 |
| `e2e/tests/orders-lifecycle.spec.ts` | New | Order lifecycle test suite | 350 |
| `e2e/tests/volume-performance.spec.ts` | New | Volume & performance tests | 300 |

### 3.2 Files to Modify (8 files)

| File Path | Change Type | Description |
|-----------|-------------|-------------|
| `e2e/mocks/handlers.ts` | Extend | Add volume and sync endpoints |
| `e2e/page-objects/NewSalePage.ts` | Extend | Add missing methods for validations |
| `e2e/page-objects/NewOrderPage.ts` | Extend | Add missing methods for items |
| `e2e/page-objects/OrderDetailPage.ts` | Extend | Add token and permission methods |
| `e2e/fixtures/test-data.ts` | Extend | Add volume test data constants |
| `e2e/fixtures/seed-helper.ts` | Extend | Add volume seed utilities |
| `playwright.config.ts` | Modify | Add volume test project config |
| `package.json` | Modify | Add test:volume script |

### 3.3 File Dependencies Graph

```
e2e/tests/*.spec.ts
    ├── e2e/page-objects/*.ts
    │   └── e2e/fixtures/test-data.ts
    │       └── e2e/fixtures/seed-helper.ts
    ├── e2e/mocks/handlers.ts
    │   ├── e2e/mocks/volume-data.ts
    │   ├── e2e/mocks/volume-handlers.ts
    │   └── e2e/mocks/sync-handlers.ts
    │       └── e2e/mocks/factories/*.ts
    └── playwright.config.ts
```

---

## 4. MSW Mock Infrastructure for 1000+ Records

### 4.1 Volume Data Architecture

```typescript
// e2e/mocks/volume-data.ts
export interface VolumeDataStore {
  customers: Customer[];      // 1000 records
  products: Product[];        // 100 records
  variants: ProductVariant[]; // 200 records (2 per product)
  sales: Sale[];              // 500 records
  orders: Order[];            // 200 records
  syncOperations: SyncOp[];   // 1000+ operations
}

// Singleton store for test isolation
class VolumeDataStore {
  private static instance: VolumeDataStore;
  private data: VolumeData;
  
  static getInstance(): VolumeDataStore {
    if (!VolumeDataStore.instance) {
      VolumeDataStore.instance = new VolumeDataStore();
    }
    return VolumeDataStore.instance;
  }
  
  generate(counts: GenerationCounts): void {
    this.data.customers = generateCustomers(counts.customers);
    this.data.products = generateProducts(counts.products);
    this.data.variants = generateVariants(this.data.products);
    this.data.sales = generateSales(counts.sales, this.data.customers);
    this.data.orders = generateOrders(counts.orders, this.data.customers);
  }
  
  reset(): void {
    this.data = { customers: [], products: [], variants: [], sales: [], orders: [], syncOperations: [] };
  }
}
```

### 4.2 Factory Pattern for Mock Generation

```typescript
// e2e/mocks/factories/customer.factory.ts
import { faker } from '@faker-js/faker/locale/es';

export function generateCustomers(count: number): Customer[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `cust-vol-${i}`,
    name: faker.person.fullName(),
    dni: faker.string.numeric(8),
    phone: `+51 9${faker.string.numeric(8)}`,
    address: faker.location.streetAddress(),
    businessId: 'biz-1',
    createdAt: faker.date.past().toISOString(),
    updatedAt: faker.date.recent().toISOString(),
    syncStatus: 'synced' as const,
  }));
}

// e2e/mocks/factories/sale.factory.ts
export function generateSales(
  count: number, 
  customers: Customer[],
  options?: { withItems?: boolean; dateRange?: DateRange }
): Sale[] {
  return Array.from({ length: count }, (_, i) => {
    const customer = customers[i % customers.length];
    const isCredit = Math.random() > 0.5;
    const total = parseFloat(faker.commerce.price({ min: 50, max: 500 }));
    
    return {
      id: `sale-vol-${i}`,
      businessId: 'biz-1',
      customerId: customer.id,
      sellerId: 'biz-user-1',
      saleType: isCredit ? 'credito' : 'contado',
      totalAmount: total.toFixed(2),
      amountPaid: isCredit ? '0' : total.toFixed(2),
      balanceDue: isCredit ? total.toFixed(2) : '0',
      syncStatus: 'synced',
      saleDate: faker.date.recent({ days: 30 }).toISOString(),
      items: options?.withItems ? generateSaleItems(1 + Math.floor(Math.random() * 3)) : [],
    };
  });
}
```

### 4.3 Pagination Support in Handlers

```typescript
// e2e/mocks/volume-handlers.ts
http.get('/api/sales', ({ request }) => {
  const url = new URL(request.url);
  const limit = parseInt(url.searchParams.get('limit') || '20');
  const offset = parseInt(url.searchParams.get('offset') || '0');
  const startDate = url.searchParams.get('startDate');
  const endDate = url.searchParams.get('endDate');
  const saleType = url.searchParams.get('saleType');
  
  let sales = store.getSales();
  
  // Apply filters
  if (startDate) sales = sales.filter(s => s.saleDate >= startDate);
  if (endDate) sales = sales.filter(s => s.saleDate <= endDate);
  if (saleType) sales = sales.filter(s => s.saleType === saleType);
  
  // Apply pagination
  const paginated = sales.slice(offset, offset + limit);
  
  return HttpResponse.json({
    success: true,
    data: paginated,
    meta: {
      total: sales.length,
      limit,
      offset,
      hasMore: offset + limit < sales.length,
    },
  });
});
```

### 4.4 Sync Operation Handlers

```typescript
// e2e/mocks/sync-handlers.ts
http.post('/api/sync/batch', async ({ request }) => {
  const body = await request.json() as SyncBatchRequest;
  const results: SyncResult[] = [];
  
  for (const op of body.operations) {
    // Simulate processing delay for volume testing
    if (body.operations.length > 100) {
      await delay(10);
    }
    
    // Simulate random conflicts for testing
    const hasConflict = Math.random() < 0.05; // 5% conflict rate
    
    if (hasConflict) {
      results.push({
        idempotencyKey: op.idempotencyKey,
        success: false,
        conflict: generateConflict(op),
      });
    } else {
      results.push({
        idempotencyKey: op.idempotencyKey,
        success: true,
        serverVersion: op.localVersion + 1,
      });
    }
  }
  
  return HttpResponse.json({
    success: true,
    data: { results, processedAt: new Date().toISOString() },
  });
});
```

---

## 5. Reusable Patterns for Future E2E Tests

### 5.1 Page Object Pattern (Standardized)

```typescript
// Pattern: All page objects must follow this structure
export class BasePage {
  constructor(
    protected page: Page,
    protected readonly url: string
  ) {}
  
  async goto(): Promise<void> {
    await this.page.goto(this.url);
  }
  
  async expectLoaded(): Promise<void> {
    // Override in subclasses
  }
}

export class EntityListPage extends BasePage {
  readonly searchInput: Locator;
  readonly addButton: Locator;
  readonly itemsList: Locator;
  
  constructor(page: Page, url: string) {
    super(page, url);
    this.searchInput = page.getByTestId('search-input');
    this.addButton = page.getByTestId('add-button');
    this.itemsList = page.getByTestId('items-list');
  }
  
  async search(query: string): Promise<void> {
    await this.searchInput.fill(query);
    await this.page.waitForTimeout(300); // Debounce
  }
  
  async clickAdd(): Promise<void> {
    await this.addButton.click();
  }
  
  async getItemByName(name: string): Promise<Locator> {
    return this.itemsList.filter({ hasText: name });
  }
}
```

### 5.2 Test Data Builder Pattern

```typescript
// Pattern: Fluent builder for complex test data
export class SaleBuilder {
  private sale: Partial<NewSale> = {
    saleType: 'contado',
    items: [],
  };
  
  withCustomer(customerId: string): this {
    this.sale.customerId = customerId;
    return this;
  }
  
  withType(type: 'contado' | 'credito'): this {
    this.sale.saleType = type;
    return this;
  }
  
  withItem(item: SaleItemInput): this {
    this.sale.items = [...(this.sale.items || []), item];
    this.recalculateTotal();
    return this;
  }
  
  withPayment(mode: PaymentMode, amount?: number): this {
    this.sale.paymentMode = mode;
    if (amount) this.sale.amountPaid = amount.toString();
    return this;
  }
  
  build(): NewSale {
    return this.sale as NewSale;
  }
  
  private recalculateTotal(): void {
    const total = this.sale.items?.reduce((sum, item) => sum + item.subtotal, 0) || 0;
    this.sale.totalAmount = total.toFixed(2);
  }
}

// Usage in tests:
const sale = new SaleBuilder()
  .withCustomer('cust-1')
  .withType('credito')
  .withItem({ productId: 'p1', variantId: 'v1', quantity: 2, subtotal: 100 })
  .withPayment('debe_todo')
  .build();
```

### 5.3 Test Fixture Pattern

```typescript
// Pattern: Reusable test fixtures with setup/teardown
export interface TestFixture<T> {
  setup(): Promise<T>;
  teardown(data: T): Promise<void>;
}

export class SaleFixture implements TestFixture<Sale> {
  async setup(): Promise<Sale> {
    // Create sale via API or UI
    const sale = await createTestSale();
    return sale;
  }
  
  async teardown(sale: Sale): Promise<void> {
    // Cleanup: cancel or delete sale
    await cancelTestSale(sale.id);
  }
}

// Usage in tests:
test.describe('Sale Tests', () => {
  let sale: Sale;
  const fixture = new SaleFixture();
  
  test.beforeEach(async () => {
    sale = await fixture.setup();
  });
  
  test.afterEach(async () => {
    await fixture.teardown(sale);
  });
});
```

### 5.4 MSW Scenario Helpers

```typescript
// Pattern: Predefined scenarios for consistent testing
export const scenarios = {
  // Volume scenarios
  volume: {
    light: { customers: 10, products: 5, sales: 20, orders: 10 },
    medium: { customers: 100, products: 20, sales: 200, orders: 50 },
    heavy: { customers: 1000, products: 100, sales: 500, orders: 200 },
  },
  
  // Sync scenarios
  sync: {
    clean: { pending: 0, conflicts: 0 },
    pending: { pending: 50, conflicts: 0 },
    conflicts: { pending: 50, conflicts: 10 },
    heavy: { pending: 1000, conflicts: 50 },
  },
  
  // Apply scenario to MSW store
  apply(scenario: keyof typeof scenarios.volume): void {
    const counts = scenarios.volume[scenario];
    volumeStore.generate(counts);
  },
};
```

### 5.5 Mobile Viewport Testing Pattern

```typescript
// Pattern: Mobile-first testing utilities
export const mobileViewport = {
  iphone14: { width: 390, height: 844 },
  iphoneSE: { width: 375, height: 667 },
  pixel5: { width: 393, height: 851 },
};

// Helper for mobile interactions
export class MobileHelpers {
  constructor(private page: Page) {}
  
  async swipeUp(): Promise<void> {
    await this.page.touchscreen.swipe({
      start: { x: 200, y: 600 },
      end: { x: 200, y: 200 },
    });
  }
  
  async tapAt(x: number, y: number): Promise<void> {
    await this.page.touchscreen.tap(x, y);
  }
  
  async waitForBottomSheet(): Promise<Locator> {
    const sheet = this.page.getByTestId('bottom-sheet');
    await sheet.waitFor({ state: 'visible' });
    return sheet;
  }
}
```

### 5.6 Assertion Patterns

```typescript
// Pattern: Custom assertions for common checks
export const assertions = {
  async expectToast(page: Page, message: string | RegExp): Promise<void> {
    const toast = page.getByTestId('toast');
    await toast.waitFor({ state: 'visible' });
    if (typeof message === 'string') {
      await expect(toast).toContainText(message);
    } else {
      await expect(toast).toContainText(message);
    }
  },
  
  async expectCurrency(page: Page, locator: Locator, amount: number): Promise<void> {
    const formatted = `S/ ${amount.toFixed(2)}`;
    await expect(locator).toContainText(formatted);
  },
  
  async expectSynced(page: Page, entityId: string): Promise<void> {
    const badge = page.locator(`[data-entity-id="${entityId}"] [data-testid="sync-badge"]`);
    await expect(badge).toHaveAttribute('data-status', 'synced');
  },
  
  async expectValidationError(page: Page, field: string, message?: string): Promise<void> {
    const error = page.locator(`[data-testid="${field}-error"]`);
    await error.waitFor({ state: 'visible' });
    if (message) {
      await expect(error).toContainText(message);
    }
  },
};
```

---

## 6. Phase-by-Phase Implementation Plan

### Phase 1: Foundation & Core Sales (Week 1)
**Goal**: Establish MSW infrastructure and implement core cash/credit sale tests

| Task | File(s) | Effort | Dependencies |
|------|---------|--------|--------------|
| 1.1 Create mock factories | `mocks/factories/*.ts` | 4h | None |
| 1.2 Extend MSW handlers | `mocks/handlers.ts`, `mocks/volume-data.ts` | 6h | 1.1 |
| 1.3 Create SalesListPage | `page-objects/SalesListPage.ts` | 3h | None |
| 1.4 Create SaleDetailPage | `page-objects/SaleDetailPage.ts` | 4h | None |
| 1.5 Implement cash sale tests | `tests/sales-cash.spec.ts` | 4h | 1.1-1.4 |
| 1.6 Implement credit sale tests | `tests/sales-credit.spec.ts` | 4h | 1.1-1.4 |
| 1.7 Extend NewSalePage | `page-objects/NewSalePage.ts` | 2h | None |

**Deliverables:**
- 10 test cases (SALE-CASH-001 to 005, SALE-CRED-001 to 005)
- Mock factory infrastructure
- Sales list/detail page objects

**Verification:**
```bash
bun run test:e2e sales-cash.spec.ts
bun run test:e2e sales-credit.spec.ts
```

### Phase 2: Sale Validations & Management (Week 1-2)
**Goal**: Complete sale validation tests and cancellation flows

| Task | File(s) | Effort | Dependencies |
|------|---------|--------|--------------|
| 2.1 Implement validation tests | `tests/sales-validations.spec.ts` | 6h | Phase 1 |
| 2.2 Implement cancellation tests | `tests/sales-cancellation.spec.ts` | 5h | Phase 1 |
| 2.3 Add update sale methods | `page-objects/SaleDetailPage.ts` | 3h | Phase 1 |
| 2.4 Create DashboardPage | `page-objects/DashboardPage.ts` | 2h | None |
| 2.5 Implement token tests | `tests/sales-tokens.spec.ts` | 4h | 2.3 |

**Deliverables:**
- 19 additional test cases (validations + cancellations + tokens)
- Dashboard page object
- Complete SaleDetailPage

**Verification:**
```bash
bun run test:e2e sales-validations.spec.ts
bun run test:e2e sales-cancellation.spec.ts
```

### Phase 3: Order Creation & Lifecycle (Week 2)
**Goal**: Implement complete order flow tests

| Task | File(s) | Effort | Dependencies |
|------|---------|--------|--------------|
| 3.1 Extend NewOrderPage | `page-objects/NewOrderPage.ts` | 3h | None |
| 3.2 Extend OrderDetailPage | `page-objects/OrderDetailPage.ts` | 4h | None |
| 3.3 Implement order creation tests | `tests/orders-creation.spec.ts` | 5h | 3.1 |
| 3.4 Implement order lifecycle tests | `tests/orders-lifecycle.spec.ts` | 6h | 3.2 |
| 3.5 Create PublicSalePage | `page-objects/PublicSalePage.ts` | 2h | None |

**Deliverables:**
- 21 order test cases (creation + validations + lifecycle)
- Complete order page objects
- Public sale page object

**Verification:**
```bash
bun run test:e2e orders-creation.spec.ts
bun run test:e2e orders-lifecycle.spec.ts
```

### Phase 4: Volume & Performance (Week 3)
**Goal**: Implement MSW volume infrastructure and performance tests

| Task | File(s) | Effort | Dependencies |
|------|---------|--------|--------------|
| 4.1 Create volume handlers | `mocks/volume-handlers.ts` | 5h | Phase 1 |
| 4.2 Create sync handlers | `mocks/sync-handlers.ts` | 4h | Phase 1 |
| 4.3 Implement volume data generators | `mocks/volume-data.ts` | 4h | Phase 1 |
| 4.4 Implement volume tests | `tests/volume-performance.spec.ts` | 6h | 4.1-4.3 |
| 4.5 Add pagination support | `mocks/handlers.ts` | 3h | 4.1 |
| 4.6 Create volume test config | `playwright.config.ts` | 2h | None |

**Deliverables:**
- 12 volume test cases
- 6 sync test cases
- Volume MSW infrastructure
- Pagination support

**Verification:**
```bash
bun run test:e2e:volume
```

### Phase 5: Integration & E2E Flows (Week 3-4)
**Goal**: Complete end-to-end integration tests

| Task | File(s) | Effort | Dependencies |
|------|---------|--------|--------------|
| 5.1 Implement E2E flow tests | `tests/e2e-flows.spec.ts` | 6h | Phases 1-3 |
| 5.2 Add edge case tests | `tests/edge-cases.spec.ts` | 4h | Phases 1-3 |
| 5.3 Document reusable patterns | `e2e/PATTERNS.md` | 3h | All |
| 5.4 Create test utilities | `e2e/utils/index.ts` | 3h | All |
| 5.5 Final integration testing | All specs | 4h | All |

**Deliverables:**
- 8 E2E integration test cases
- Edge case coverage
- Pattern documentation
- Test utilities library

**Verification:**
```bash
bun run test:e2e
bun run test:e2e:full
```

### Timeline Summary

```
Week 1: [████] Phase 1 + Phase 2 start
        Days 1-2: Foundation (Phase 1)
        Days 3-5: Validations (Phase 2)

Week 2: [████] Phase 2 complete + Phase 3
        Days 1-2: Complete Phase 2
        Days 3-5: Orders (Phase 3)

Week 3: [████] Phase 4 + Phase 5 start
        Days 1-3: Volume (Phase 4)
        Days 4-5: Integration start (Phase 5)

Week 4: [████] Phase 5 complete
        Days 1-3: Complete integration
        Days 4-5: Documentation & polish
```

---

## 7. Commands for Execution

### 7.1 Development Commands

```bash
# Run all E2E tests
bun run test:e2e

# Run specific test file
bun run test:e2e sales-cash.spec.ts

# Run with headed browser (for debugging)
bun run test:e2e:headed

# Run with UI mode
bun run test:e2e:ui

# Run with debug mode
bun run test:e2e:debug
```

### 7.2 Volume Testing Commands

```bash
# Run volume tests only
bun run test:e2e:volume

# Run with heavy dataset (1000+ records)
VOLUME_SCENARIO=heavy bun run test:e2e:volume

# Run performance benchmarks
bun run test:e2e:perf
```

### 7.3 CI/CD Commands

```bash
# Full test suite for CI
bun run test:e2e:ci

# Smoke tests only (fast)
bun run test:e2e:smoke

# Regression tests
bun run test:e2e:regression
```

### 7.4 New Scripts to Add (package.json)

```json
{
  "scripts": {
    "test:e2e:volume": "playwright test --config=playwright.volume.config.ts",
    "test:e2e:perf": "playwright test --config=playwright.perf.config.ts",
    "test:e2e:ci": "playwright test --reporter=html,junit",
    "test:e2e:smoke": "playwright test --grep '@smoke'",
    "test:e2e:regression": "playwright test --grep '@regression'",
    "test:e2e:full": "playwright test --config=playwright.full.config.ts"
  }
}
```

---

## 8. Test Data Requirements

### 8.1 Static Test Data (Existing)

| Entity | Count | Location |
|--------|-------|----------|
| Customers | 5 | `fixtures/test-data.ts` |
| Products | 4 | `fixtures/test-data.ts` |
| Variants | 8 | `fixtures/test-data.ts` |

### 8.2 Volume Test Data (Generated)

| Entity | Light | Medium | Heavy |
|--------|-------|--------|-------|
| Customers | 10 | 100 | 1000 |
| Products | 5 | 20 | 100 |
| Variants | 10 | 40 | 200 |
| Sales | 20 | 200 | 500 |
| Orders | 10 | 50 | 200 |
| Sync Ops | 50 | 500 | 1000+ |

### 8.3 Test Data Scenarios

```typescript
// scenarios.ts
export const TEST_SCENARIOS = {
  // Sale scenarios
  cashSale: { paymentMode: 'pago_total', saleType: 'contado' },
  creditFull: { paymentMode: 'debe_todo', saleType: 'credito' },
  creditPartial: { paymentMode: 'a_cuenta', saleType: 'credito', amountPaid: 50 },
  
  // Order scenarios  
  draftOrder: { status: 'draft', hasItems: true },
  confirmedOrder: { status: 'confirmed', hasItems: true },
  deliveredOrder: { status: 'delivered', hasItems: true, hasSale: true },
  
  // Volume scenarios
  light: { customers: 10, products: 5, sales: 20, orders: 10 },
  medium: { customers: 100, products: 20, sales: 200, orders: 50 },
  heavy: { customers: 1000, products: 100, sales: 500, orders: 200 },
};
```

---

## 9. Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| MSW performance with 1000+ records | Medium | Implement pagination, lazy loading, indexed search |
| Test flakiness due to timing | High | Use explicit waits, avoid arbitrary timeouts |
| Mobile viewport inconsistencies | Medium | Standardize on iPhone 14 viewport (390x844) |
| Test data conflicts between runs | Medium | Reset MSW store before each test suite |
| Long test execution time | Medium | Parallelize volume tests, use smoke tests for CI |
| Maintenance overhead | Medium | Document patterns, use factories, keep DRY |

---

## 10. Success Criteria

- [ ] 70+ test cases implemented and passing
- [ ] MSW infrastructure supports 1000+ records
- [ ] All tests run in < 10 minutes (smoke) and < 30 minutes (full)
- [ ] Test coverage: Sales (100%), Orders (100%), Validations (100%)
- [ ] Pattern documentation complete
- [ ] CI/CD integration working
- [ ] Volume tests demonstrate < 2s list load time with 1000 records

---

## Appendix A: Test Case ID Reference

### Sale Tests (SALE-*)
- SALE-CASH-001 to 005: Cash sales
- SALE-CRED-001 to 005: Credit sales
- SALE-DIST-001 to 002: Distribution sales
- SALE-VIS-001 to 002: Visit sales
- SALE-DRAFT-001 to 003: Draft sales
- SALE-VAL-001 to 008: Validations

### Item Tests (ITEM-*)
- ITEM-001 to 006: Item management

### Cancellation Tests (CANCEL-*)
- CANCEL-001 to 006: Sale cancellation

### Update Tests (UPDATE-*)
- UPDATE-001 to 005: Sale updates

### Token Tests (TOKEN-*)
- TOKEN-001 to 004: Public tokens

### List Tests (LIST-*)
- LIST-001 to 006: Listing and stats

### Order Tests (ORDER-*)
- ORDER-CREATE-001 to 008: Creation
- ORDER-VAL-001 to 003: Validations
- ORDER-LIFE-001 to 010: Lifecycle
- ORDER-ITEM-001 to 005: Item management
- ORDER-VER-001 to 003: Versioning
- ORDER-PERM-001 to 002: Permissions

### Volume Tests (VOL-*)
- VOL-MOCK-001 to 004: Mock generation
- VOL-PERF-001 to 004: List performance
- VOL-OP-001 to 004: Operation performance

### Sync Tests (SYNC-*)
- SYNC-001 to 006: Synchronization

### E2E Tests (E2E-*)
- E2E-001 to 008: End-to-end flows

---

*Document Version: 1.0*  
*Last Updated: 2026-04-10*  
*Author: AI Planner Agent*
