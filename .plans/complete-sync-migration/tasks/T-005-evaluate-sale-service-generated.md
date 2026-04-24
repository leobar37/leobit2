# T-005: Evaluar `SaleService` con Generated Service

## Objetivo
Evaluar si `SaleService` puede extender `SalesService` generado por `drizzle-sync` en lugar de `BaseService` directamente.

## Requisitos Relacionados
- FR-005

## Archivos Involucrados
- `packages/app/app/lib/services/sale-service.ts`
- `packages/app/app/lib/sync/generated/services/` (verificar si existe `SalesService`)

## Contexto

`SaleService` es el **único servicio core** que extiende `BaseService` directamente:

```typescript
// sale-service.ts:187
export class SaleService extends BaseService {
  // ...
}
```

Todos los demás servicios extienden servicios generados:
- `CustomerService extends CustomersService` ✅
- `ProductService extends ProductsService` ✅
- `PurchaseService extends PurchasesService` ✅
- etc.

## Pasos de Investigación

### 1. Verificar si `SalesService` Generado Existe
- [ ] Buscar `SalesService` en `~/lib/sync/generated/services/`
- [ ] Verificar qué métodos CRUD tiene (create, update, delete, findById, etc.)
- [ ] Verificar si maneja `sale_items` como relación

### 2. Analizar Métodos Custom de `SaleService`

Listar todos los métodos que `SaleService` tiene que NO están en el servicio generado:

- [ ] `createSaleWithItems()` — creación atómica de sale + items
- [ ] `confirmSale()` — confirmar venta
- [ ] `deliverSale()` — marcar como entregada
- [ ] `cancelSale()` — cancelar venta
- [ ] `finalizeSale()` — finalizar venta
- [ ] `addSaleItem()` — agregar item
- [ ] `updateSaleItem()` — actualizar item
- [ ] `removeSaleItem()` — eliminar item
- [ ] `getSalesStats()` — estadísticas
- [ ] `getDebtorsSummary()` — resumen de deudores
- [ ] etc.

### 3. Evaluar Viabilidad

**Opción A**: Extender `SalesService` generado
- [ ] `SaleService extends SalesService` (generado) + métodos custom
- [ ] Delegar CRUD base al generado
- [ ] Mantener métodos atómicos custom

**Opción B**: Mantener `BaseService` directo
- [ ] Documentar por qué no puede extender el generado
- [ ] Posible razón: operaciones atómicas complejas (sales + items + payments)

### 4. Decisión y Documentación

- [ ] Si es viable: crear plan de refactor
- [ ] Si no es viable: documentar en `sale-service.ts` por qué se mantiene manual

## Notas

Esta tarea es **investigación pura**. No requiere cambios de código a menos que la evaluación determine que es viable y seguro. La prioridad es baja porque el servicio actual funciona correctamente.

## Validación
- [ ] Documento de evaluación completo
- [ ] Decisión documentada en código o en plan
- [ ] Si se refactoriza: todos los tests de ventas pasan
