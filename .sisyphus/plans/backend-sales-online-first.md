# Plan: Backend First — Migración Ventas (Online-First)

> **Rama de trabajo:** `main`
> **Enfoque:** El frontend actual tiene toda la lógica de negocio en `SaleService` (1468 líneas) usando PGlite local. Esa lógica se debe mover al backend. El frontend solo hará llamadas REST vía Eden Treaty.
> **Área inicial:** Sales (ventas)

---

## TL;DR

El backend YA tiene la mayoría de la lógica de ventas, pero faltan **7 capacidades críticas** que hoy solo existen en el frontend:

1. `finalizeDelivery` — Ajustar cantidades/precios antes de entregar un pre_order
2. `createDraft` — Crear venta vacía en borrador
3. `recordPayment` — Registrar pago/abono a una venta
4. `getSalesStats(period)` — Stats por período (dashboard)
5. `getDebtorsSummary()` — Resumen de deudores
6. `getSalesChart(period)` — Datos para gráfico
7. `findPageByBusiness(query)` — Paginación avanzada con búsqueda por cliente, filtros complejos

Este plan implementa esas 7 capacidades en el backend + expone los endpoints REST, para luego el frontend pueda eliminar `SaleService` y usar `api` directamente.

---

## Contexto: ¿Qué tiene el backend hoy?

### ✅ Servicios existentes (`sale.service.ts` — 864 líneas)

| Método | Líneas | Estado |
|--------|--------|--------|
| `createSale` | 47-201 | ✅ Completo con validaciones, transacciones, items |
| `updateSale` | 203-299 | ✅ Solo draft (o deliveryDate en confirmed pre_order) |
| `deleteSale` | 301-323 | ✅ Hard delete draft / soft delete procesadas |
| `confirmSale` | 376-433 | ✅ Draft → active (instant) / confirmed (pre_order) |
| `deliverPreOrder` | 435-469 | ✅ Confirmed → delivered (solo cambio de status) |
| `cancelSale` | 471-557 | ✅ Con reembolso, reversión de distribución |
| `getTodayStats` | 559-561 | ✅ Stats de hoy |
| `addItem` | 623-720 | ✅ Con recálculo de total |
| `updateItem` | 722-823 | ✅ Con recálculo de total |
| `removeItem` | 825-862 | ✅ Con recálculo de total + validación mínimo 1 item |

### ✅ Endpoints existentes (`api/sales.ts` — 413 líneas)

| Método | Endpoint | Llama a |
|--------|----------|---------|
| GET | `/sales` | `getSales` |
| GET | `/sales/today-stats` | `getTodayStats` |
| GET | `/sales/:id` | `getSale` |
| POST | `/sales` | `createSale` |
| PATCH | `/sales/:id` | `updateSale` |
| POST | `/sales/:id/cancel` | `cancelSale` |
| POST | `/sales/:id/confirm` | `confirmSale` |
| POST | `/sales/:id/deliver` | `deliverPreOrder` |
| DELETE | `/sales/:id` | `deleteSale` |
| GET | `/sales/:id/items` | `getSaleItems` |
| POST | `/sales/:id/items` | `addItem` |
| PATCH | `/sales/:id/items/:itemId` | `updateItem` |
| DELETE | `/sales/:id/items/:itemId` | `removeItem` |
| POST | `/sales/cleanup-drafts` | `cleanupStaleDraftSales` |

### ⚠️ Lo que FALTA en el backend

| Capacidad | Dónde está hoy | Complejidad |
|-----------|---------------|-------------|
| **finalizeDelivery** | `sale-service.ts:842-930` | Alta — ajusta items + recalcula totales + cambia status |
| **createDraft** | `sale-service.ts:553-602` | Baja — venta vacía con defaults |
| **recordPayment** | `sale-service.ts:1303-1323` | Media — actualiza amountPaid/balanceDue, crea abono |
| **getSalesStats(period)** | `sale-service.ts:1360-1393` | Media — agregaciones SQL por período |
| **getDebtorsSummary** | `sale-service.ts:1398-1422` | Baja — SUM(balanceDue) + COUNT(DISTINCT customerId) |
| **getSalesChart(period)** | `sale-service.ts:1427-1467` | Media — GROUP BY DATE(saleDate) |
| **findPageByBusiness(query)** | `sale-service.ts:426-487` | Alta — paginación + búsqueda + múltiples filtros |

---

## Work Objectives

### Objetivo Core
Completar el backend de ventas para que el frontend pueda eliminar `SaleService` y usar `api` (Eden Treaty) directamente.

### Deliverables
1. `SaleService` con 7 métodos nuevos
2. `SaleRepository` con queries nuevas (stats, paginación avanzada)
3. Endpoints REST en `api/sales.ts` para los 7 métodos nuevos
4. Tests unitarios para métodos nuevos

### Definition of Done
- Todos los métodos del frontend `SaleService` tienen equivalente en el backend
- Todos tienen endpoint REST expuesto
- Tests pasan (`bun test` en backend)
- El frontend puede hacer `api.sales.*` para TODAS las operaciones de ventas

---

## Execution Strategy

### Wave 1: Fundación (métodos simples, paralelizables)
- Task 1: `createDraft` — endpoint + service
- Task 2: `getDebtorsSummary` — endpoint + service + query
- Task 3: `getSalesChart` — endpoint + service + query

### Wave 2: Core (métodos medianos)
- Task 4: `recordPayment` — endpoint + service + abono integration
- Task 5: `getSalesStats(period)` — endpoint + service + query

### Wave 3: Complejos (métodos pesados)
- Task 6: `finalizeDelivery` — endpoint + service + item adjustments
- Task 7: `findPageByBusiness(query)` — endpoint + service + query compleja

### Wave Final: Verificación
- Task F1: Code review + tests
- Task F2: Smoke test con curl/eden

---

## TODOs

- [ ] 1. **createDraft** — Crear venta vacía en borrador

  **What to do**:
  - Agregar `createDraft` a `SaleService` (backend) que cree una venta con status="draft", totalAmount=0, items vacíos
  - Exponer `POST /sales/draft` en `api/sales.ts`
  - Reutilizar lógica de `createSale` pero sin items y con valores por defecto

  **Must NOT do**:
  - No agregar lógica de sync (ya no existe en online-first)
  - No requerir items (draft puede ser vacío)

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: [`bun-elysia`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1
  - **Blocks**: Ninguno

  **References**:
  - `packages/backend/src/services/business/sale.service.ts:47-201` — Patrón `createSale`
  - `packages/backend/src/api/sales.ts:52-113` — Patrón POST endpoint
  - `packages/app/app/lib/services/sale-service.ts:553-602` — Lógica actual del frontend

  **Acceptance Criteria**:
  - [ ] `POST /sales/draft` devuelve `{ success: true, data: sale }`
  - [ ] La venta creada tiene status="draft", totalAmount="0.00", items=[]
  - [ ] Se asigna sellerId del ctx.businessUserId
  - [ ] `bun test packages/backend/src/services/business/sale.service.test.ts` → PASS

  **QA Scenarios**:
  ```
  Scenario: Crear draft exitoso
    Tool: Bash (curl)
    Steps:
      1. curl -X POST http://localhost:5201/sales/draft \
         -H "Authorization: Bearer $TOKEN" \
         -H "x-business-id: $BIZ_ID" \
         -H "Content-Type: application/json" \
         -d '{"type":"instant_sale","saleType":"contado"}'
    Expected Result: status 201, body.success === true, data.status === "draft"
    Evidence: .sisyphus/evidence/task-1-create-draft.json
  ```

  **Commit**: YES
  - Message: `feat(sales): add createDraft endpoint`

---

- [ ] 2. **getDebtorsSummary** — Resumen de deudores

  **What to do**:
  - Agregar `getDebtorsSummary` a `SaleRepository` — query SQL: SUM(balanceDue), COUNT(DISTINCT customerId)
  - Agregar `getDebtorsSummary` a `SaleService`
  - Exponer `GET /sales/debtors-summary` en `api/sales.ts`

  **Must NOT do**:
  - No incluir ventas canceladas o en borrador

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: [`bun-elysia`]

  **Parallelization**:
  - **Can Run In Parallel**: YES (Wave 1)

  **References**:
  - `packages/app/app/lib/services/sale-service.ts:1398-1422` — Lógica del frontend
  - `packages/backend/src/services/repository/sale.repository.ts:389-415` — Patrón `getTotalSalesToday`

  **Acceptance Criteria**:
  - [ ] `GET /sales/debtors-summary` devuelve `{ totalDebt, debtorsCount }`
  - [ ] Solo incluye ventas con balanceDue > 0, status NOT IN ('cancelled','draft'), customerId IS NOT NULL
  - [ ] Tests pasan

  **QA Scenarios**:
  ```
  Scenario: Obtener resumen de deudores
    Tool: Bash (curl)
    Steps:
      1. curl http://localhost:5201/sales/debtors-summary \
         -H "Authorization: Bearer $TOKEN" \
         -H "x-business-id: $BIZ_ID"
    Expected Result: status 200, totalDebt >= 0, debtorsCount >= 0
  ```

  **Commit**: YES

---

- [ ] 3. **getSalesChart** — Datos para gráfico de ventas

  **What to do**:
  - Agregar `getSalesChart` a `SaleRepository` — GROUP BY DATE(saleDate) + SUM(totalAmount)
  - Agregar `getSalesChart` a `SaleService`
  - Exponer `GET /sales/chart` con query params `period` (day/week/month/year)
  - Retornar `{ labels: string[], data: number[] }`

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: [`bun-elysia`]

  **Parallelization**:
  - **Can Run In Parallel**: YES (Wave 1)

  **References**:
  - `packages/app/app/lib/services/sale-service.ts:1427-1467`
  - `packages/backend/src/services/repository/sale.repository.ts:389-415`

  **Acceptance Criteria**:
  - [ ] `GET /sales/chart?period=week` devuelve array de días con totales
  - [ ] Labels son abreviaturas de días (Dom, Lun, Mar...)

  **Commit**: YES

---

- [ ] 4. **recordPayment** — Registrar pago a venta

  **What to do**:
  - Agregar `recordPayment` a `SaleService` que:
    1. Valide que la venta existe y no está cancelada
    2. Calcule nuevo amountPaid y balanceDue
    3. Actualice la venta
    4. (Opcional) Cree un registro en payments/abonos
  - Exponer `POST /sales/:id/payments` en `api/sales.ts`

  **Must NOT do**:
  - No permitir pagos sobre ventas canceladas
  - No permitir balanceDue negativo

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: [`bun-elysia`]

  **Parallelization**:
  - **Can Run In Parallel**: NO (espera Wave 1)
  - **Blocked By**: Nada, pero es más complejo, mejor después de los simples

  **References**:
  - `packages/app/app/lib/services/sale-service.ts:1303-1323`
  - `packages/backend/src/services/business/payment.service.ts` — Ver cómo crea abonos
  - `packages/backend/src/api/payments.ts` — Endpoints de pagos existentes

  **Acceptance Criteria**:
  - [ ] `POST /sales/:id/payments` acepta `{ amount, paymentMethod, referenceNumber?, notes? }`
  - [ ] Actualiza amountPaid y balanceDue de la venta
  - [ ] Si venta a crédito y se paga todo, balanceDue = 0

  **Commit**: YES

---

- [ ] 5. **getSalesStats(period)** — Stats por período

  **What to do**:
  - Agregar `getSalesStats` a `SaleRepository` — query con SUM(totalAmount), SUM(netWeight), COUNT(*)
  - Agregar `getSalesStats` a `SaleService`
  - Exponer `GET /sales/stats` con query params `period`, `startDate`, `endDate`

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: [`bun-elysia`]

  **Parallelization**:
  - **Can Run In Parallel**: YES (Wave 2)

  **References**:
  - `packages/app/app/lib/services/sale-service.ts:1360-1393`

  **Acceptance Criteria**:
  - [ ] `GET /sales/stats?period=day` devuelve `{ amount, kilos, count }`
  - [ ] `period` soporta: day, week, month, year
  - [ ] `startDate` y `endDate` opcionales sobreescriben el período

  **Commit**: YES

---

- [ ] 6. **finalizeDelivery** — Finalizar entrega de pre_order con ajustes

  **What to do**:
  - Agregar `finalizeDelivery` a `SaleService` que:
    1. Valide que la venta es pre_order y status=confirmed
    2. Acepte array de ajustes de items (deliveredQuantity, unitPriceFinal, subtotal)
    3. Actualice cada item con los nuevos valores
    4. Recalcule totalAmount y balanceDue de la venta
    5. Cambie status a "delivered"
    6. Todo en una transacción
  - Exponer `POST /sales/:id/finalize-delivery` en `api/sales.ts`

  **Must NOT do**:
  - No permitir en ventas que no sean pre_order
  - No permitir en status diferente a confirmed

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: [`bun-elysia`]

  **Parallelization**:
  - **Can Run In Parallel**: NO (Wave 3)
  - **Blocks**: Ninguno, pero es el más complejo

  **References**:
  - `packages/app/app/lib/services/sale-service.ts:842-930` — Lógica completa del frontend
  - `packages/backend/src/services/business/sale.service.ts:435-469` — Patrón `deliverPreOrder`
  - `packages/backend/src/services/repository/sale.repository.ts:453-491` — Patrón `addItem`

  **Acceptance Criteria**:
  - [ ] `POST /sales/:id/finalize-delivery` acepta `{ items: [...], amountPaid?, paymentMode? }`
  - [ ] Cada item se actualiza con deliveredQuantity, unitPriceFinal, subtotal
  - [ ] totalAmount y balanceDue se recalculan
  - [ ] Status cambia a "delivered"
  - [ ] Todo atómico (transacción)

  **Commit**: YES

---

- [ ] 7. **findPageByBusiness** — Paginación avanzada de ventas

  **What to do**:
  - Agregar `findPageByBusiness` a `SaleRepository` con:
    - Paginación (limit/offset)
    - Filtro por customerId
    - Filtro por status
    - Filtro por distribucionId (incluyendo "none" para NULL)
    - Filtro por type (instant_sale/pre_order)
    - Filtro por saleType (contado/credito)
    - Filtro por rango de fechas (startDate/endDate)
    - Filtro por hasBalanceDue
    - Búsqueda por texto (search en id, nombre cliente, saleType)
    - JOIN con customers para búsqueda por nombre
    - Retornar `{ items: Sale[], total: number }`
  - Agregar `findPageByBusiness` a `SaleService`
  - Actualizar `GET /sales` para soportar todos los query params

  **Must NOT do**:
  - No usar LIKE sin índices (buscar por customerId primero, nombre como fallback)

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: [`bun-elysia`]

  **Parallelization**:
  - **Can Run In Parallel**: NO (Wave 3)
  - **Blocks**: Ninguno, pero es complejo

  **References**:
  - `packages/app/app/lib/services/sale-service.ts:234-290` — buildPagedSalesWhere (condiciones)
  - `packages/app/app/lib/services/sale-service.ts:426-487` — findPageByBusiness
  - `packages/backend/src/services/repository/sale.repository.ts:40-78` — Patrón findMany

  **Acceptance Criteria**:
  - [ ] `GET /sales?limit=20&offset=0&status=draft` funciona
  - [ ] `GET /sales?search=Juan` busca por nombre de cliente
  - [ ] `GET /sales?distribucionId=none` devuelve ventas sin distribución
  - [ ] `GET /sales?hasBalanceDue=true` devuelve solo con deuda
  - [ ] Respuesta: `{ success: true, data: { items: [...], total: 42 } }`

  **Commit**: YES

---

## Final Verification Wave

- [ ] F1. **Code Review** — `oracle`
  Revisar todos los métodos nuevos: transacciones, validaciones, multi-tenancy (ctx.businessId), errores de dominio. Verificar que ningún método nuevo rompe los existentes.

- [ ] F2. **Smoke Test** — `unspecified-high`
  Ejecutar todos los endpoints nuevos con curl y verificar respuestas. Probar happy path y error cases (venta no existe, status inválido, etc.).

---

## Commit Strategy

Cada task es un commit independiente:

1. `feat(sales): add createDraft endpoint`
2. `feat(sales): add debtors summary endpoint`
3. `feat(sales): add sales chart endpoint`
4. `feat(sales): add recordPayment endpoint`
5. `feat(sales): add sales stats endpoint`
6. `feat(sales): add finalizeDelivery endpoint`
7. `feat(sales): add advanced pagination with search`

---

## Success Criteria

### Verificación Commands
```bash
# Backend tests
cd packages/backend && bun test

# Type check
cd packages/backend && bun run typecheck

# Smoke test endpoints (después de levantar dev server)
curl http://localhost:5201/sales/debtors-summary -H "Authorization: Bearer $TOKEN" -H "x-business-id: $BIZ_ID"
curl "http://localhost:5201/sales?limit=10&offset=0&status=draft" -H "Authorization: Bearer $TOKEN" -H "x-business-id: $BIZ_ID"
```

### Checklist
- [ ] Todos los métodos de `frontend/sale-service.ts` tienen equivalente backend
- [ ] Todos los endpoints nuevos responden correctamente
- [ ] Tests unitarios pasan
- [ ] TypeScript compila sin errores
- [ ] No hay regresiones en endpoints existentes

---

## Notas para el Frontend (post-backend)

Una vez este plan esté completo, el frontend puede:

1. Eliminar `packages/app/app/lib/services/sale-service.ts` (1468 líneas)
2. Eliminar `packages/app/app/hooks/use-sales-db.ts` (306 líneas)
3. Reescribir `packages/app/app/hooks/use-sales.ts` para usar `api.sales.*`
4. Eliminar `useEngineService('sales')` en todo el código

El frontend quedaría con hooks simples como:
```typescript
export function useSales(filters) {
  return useQuery({
    queryKey: ['sales', filters],
    queryFn: () => extractData(api.sales.get({ query: filters })),
  });
}
```
