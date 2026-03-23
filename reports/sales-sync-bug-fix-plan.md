# Plan de Corrección: Bugs de Race Conditions en Sincronización de Ventas

## Validación de Bugs Encontrados

### Bug #1: Race Condition en Actualización de Ventas
**Estado**: ✅ **CONFIRMADO**

**Evidencia**:
```typescript
// SaleSyncHandler.ts:85-120 (handleUpdate)
const existing = await this.saleRepo.findById(ctx, operation.entityId, tx);
// ... lógica de negocio basada en existing ...
await this.saleRepo.update(ctx, operation.entityId, updateData, tx);
```

**Problema**: La función `update` en `sale.repository.ts:201-214` NO verifica la versión:
```typescript
await executor
  .update(sales)
  .set({ ...data, updatedAt: new Date() })
  .where(and(eq(sales.id, id), eq(sales.businessId, ctx.businessId)))  // ❌ Sin check de versión
  .returning();
```

**Contraste**: `confirmPreOrder` y `deliverPreOrder` SÍ verifican versión:
```typescript
.where(
  and(
    eq(sales.id, id),
    eq(sales.businessId, ctx.businessId),
    eq(sales.version, baseVersion)  // ✅ Correcto
  )
)
```

**Impacto**: Dos usuarios pueden sobrescribir la misma venta simultáneamente sin detectar el conflicto.

---

### Bug #2: Race Condition en Recálculo de Totales de Items
**Estado**: ✅ **CONFIRMADO**

**Evidencia**:
```typescript
// SaleItemSyncHandler.ts:95-130 (handleUpdate)
const sale = await this.saleRepo.findById(ctx, parsed.saleId, executor);
const existingItem = await this.saleRepo.findItemById(...);

const oldSubtotal = parseFloat(existingItem.subtotal);
const newSubtotal = parsed.subtotal !== undefined ? parseFloat(parsed.subtotal) : oldSubtotal;
const subtotalDiff = newSubtotal - oldSubtotal;

// ... update item ...

if (Math.abs(subtotalDiff) > 0.01) {
  const newTotal = parseFloat(sale.totalAmount) + subtotalDiff;  // ❌ Lee total
  const newBalanceDue = Math.max(newTotal - parseFloat(sale.amountPaid), 0);

  await this.saleRepo.update(ctx, parsed.saleId, {
    totalAmount: newTotal.toFixed(2),  // ❌ Escribe total (read-modify-write)
    balanceDue: newBalanceDue.toFixed(2),
  }, executor);
}
```

**Escenario de fallo**:
1. Usuario A lee total = 100
2. Usuario B lee total = 100
3. Usuario A calcula diff = +20, escribe total = 120
4. Usuario B calcula diff = +30 (basado en 100), escribe total = 130
5. **Resultado incorrecto**: 130 en lugar de 150

**Impacto**: Totales de venta incorrectos, saldos de clientes erróneos.

---

### Bug #3: Sin Detección de Conflictos para Sale Items
**Estado**: ✅ **CONFIRMADO**

**Evidencia**:
```typescript
// ConflictResolver.ts:290
sale_items: new NoOpConflictResolver(),  // ❌ No detecta conflictos
```

**Comparación con otras entidades**:
```typescript
sales: new VersionConflictResolver(),     // ✅ Versión-based
customers: new CustomerConflictResolver(), // ✅ Timestamp-based
abonos: new AbonoConflictResolver(),       // ✅ Timestamp-based
// ...
sale_items: new NoOpConflictResolver(),    // ❌ Sin detección
```

**Impacto**: Ediciones concurrentes de items resultan en "last write wins" sin notificación, causando pérdida silenciosa de datos.

---

## Plan de Corrección

### Fase 1: Correcciones Críticas (Alta Prioridad)

#### 1.1 Agregar verificación de versión en `SaleRepository.update`
**Archivo**: `packages/backend/src/services/repository/sale.repository.ts`
**Líneas**: 201-214

```typescript
// Cambiar firma para aceptar expectedVersion
async update(
  ctx: RequestContext,
  id: string,
  data: Partial<...>,
  tx?: DbTransaction,
  expectedVersion?: number  // Nuevo parámetro
): Promise<Sale> {
  const executor = tx ?? db;

  const conditions = [
    eq(sales.id, id),
    eq(sales.businessId, ctx.businessId)
  ];

  // Si se proporciona versión esperada, agregar a condiciones
  if (expectedVersion !== undefined) {
    conditions.push(eq(sales.version, expectedVersion));
  }

  const [sale] = await executor
    .update(sales)
    .set({ ...data, updatedAt: new Date() })
    .where(and(...conditions))
    .returning();

  if (expectedVersion !== undefined && !sale) {
    throw new Error(`Version conflict: expected ${expectedVersion}`);
  }

  return sale;
}
```

#### 1.2 Actualizar `SaleSyncHandler` para pasar versión
**Archivo**: `packages/backend/src/services/sync/handlers/SaleSyncHandler.ts`
**Líneas**: 85-120

```typescript
// En handleUpdate, pasar existing.version a las llamadas update
await this.saleRepo.update(ctx, operation.entityId, {
  status: "cancelled",
  // ...
  version: existing.version + 1,
}, tx, existing.version);  // Agregar expectedVersion
```

#### 1.3 Implementar `SaleItemConflictResolver`
**Archivo**: `packages/backend/src/services/sync/framework/ConflictResolver.ts`
**Líneas**: Agregar después de línea 290

```typescript
class SaleItemConflictResolver implements IConflictResolver {
  async checkConflict(
    ctx: RequestContext,
    operation: SyncOperationInput,
    tx: DbTransaction
  ): Promise<ConflictCheckResult> {
    if (operation.operation === "create" || operation.operation === "delete") {
      return { hasConflict: false };
    }

    // Usar timestamp del item o versión de la venta padre
    const item = await tx.query.saleItems.findFirst({
      where: and(
        eq(saleItems.id, operation.entityId),
        eq(saleItems.businessId, ctx.businessId)
      ),
      with: {
        sale: true
      }
    });

    if (!item?.sale) {
      return { hasConflict: false };
    }

    // Usar versión de la venta padre para detectar conflictos
    if (item.sale.version > operation.localVersion) {
      logger.warn({
        msg: "⚠️ SaleItem conflict detected (parent sale modified)",
        entityId: operation.entityId,
        saleId: item.sale.id,
        serverVersion: item.sale.version,
        clientVersion: operation.localVersion,
      });

      return {
        hasConflict: true,
        serverVersion: item.sale.version,
        serverData: {
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          subtotal: item.subtotal,
          updatedAt: item.updatedAt?.toISOString(),
        },
      };
    }

    return { hasConflict: false };
  }
}

// Actualizar registro
sale_items: new SaleItemConflictResolver(),
```

---

### Fase 2: Corrección de Recálculo Atómico (Media Prioridad)

#### 2.1 Reemplazar read-modify-write con UPDATE atómico
**Archivo**: `packages/backend/src/services/sync/handlers/SaleItemSyncHandler.ts`
**Líneas**: 95-130

**Opción A: Usar expresión SQL en UPDATE** (Recomendada)
```typescript
// En lugar de calcular en JS, usar SQL
await executor
  .update(sales)
  .set({
    totalAmount: sql`(
      SELECT COALESCE(SUM(subtotal), 0)
      FROM sale_items
      WHERE sale_id = ${parsed.saleId}
    )`,
    balanceDue: sql`GREATEST((
      SELECT COALESCE(SUM(subtotal), 0)
      FROM sale_items
      WHERE sale_id = ${parsed.saleId}
    ) - amount_paid, 0)`,
    updatedAt: new Date(),
  })
  .where(and(
    eq(sales.id, parsed.saleId),
    eq(sales.businessId, ctx.businessId)
  ));
```

**Opción B: Trigger de base de datos**
```sql
-- Migration para crear trigger
CREATE OR REPLACE FUNCTION recalculate_sale_totals()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE sales
  SET
    total_amount = (SELECT COALESCE(SUM(subtotal), 0) FROM sale_items WHERE sale_id = COALESCE(NEW.sale_id, OLD.sale_id)),
    balance_due = GREATEST((SELECT COALESCE(SUM(subtotal), 0) FROM sale_items WHERE sale_id = COALESCE(NEW.sale_id, OLD.sale_id)) - amount_paid, 0),
    updated_at = NOW()
  WHERE id = COALESCE(NEW.sale_id, OLD.sale_id);

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_recalculate_sale_totals
AFTER INSERT OR UPDATE OR DELETE ON sale_items
FOR EACH ROW EXECUTE FUNCTION recalculate_sale_totals();
```

---

### Fase 3: Validación y Tests (Alta Prioridad)

#### 3.1 Test unitario para race condition en ventas
**Archivo**: `packages/backend/src/services/sync/handlers/__tests__/sale-sync.race.test.ts`

```typescript
import { describe, test, expect } from "bun:test";
import { SaleSyncHandler } from "../SaleSyncHandler";
import { createTestContext } from "../../../../test/utils";

describe("SaleSyncHandler - Race Conditions", () => {
  test("should detect version conflict on concurrent updates", async () => {
    const ctx = createTestContext();
    const saleId = crypto.randomUUID();

    // Crear venta inicial
    await handler.execute(ctx, {
      entityId: saleId,
      operation: "create",
      payload: { /* ... */ }
    });

    // Simular dos updates concurrentes con misma versión base
    const update1 = handler.execute(ctx, {
      entityId: saleId,
      operation: "update",
      payload: { customerId: "customer-1" },
      localVersion: 1
    });

    const update2 = handler.execute(ctx, {
      entityId: saleId,
      operation: "update",
      payload: { customerId: "customer-2" },
      localVersion: 1
    });

    const [result1, result2] = await Promise.all([update1, update2]);

    // Uno debe tener éxito, el otro debe reportar conflicto
    const successCount = [result1, result2].filter(r => r.success).length;
    const conflictCount = [result1, result2].filter(r => r.status === "conflict").length;

    expect(successCount).toBe(1);
    expect(conflictCount).toBe(1);
  });
});
```

#### 3.2 Test E2E para recálculo de totales
**Archivo**: `packages/app/e2e/tests/sale-item-total-race.spec.ts`

```typescript
import { test, expect } from "@playwright/test";

test("concurrent item updates should calculate correct total", async ({ page }) => {
  // 1. Crear venta con item de 100
  // 2. Abrir dos pestañas
  // 3. En pestaña 1: actualizar item a 120
  // 4. En pestaña 2: actualizar item a 130
  // 5. Sincronizar ambas
  // 6. Verificar que el total sea 130 (último write) o haya conflicto
});
```

---

## Orden de Implementación

| Orden | Tarea | Archivo(s) | Prioridad | Estimado |
|-------|-------|------------|-----------|----------|
| 1 | Agregar `expectedVersion` a `SaleRepository.update` | `sale.repository.ts` | Crítica | 30 min |
| 2 | Actualizar `SaleSyncHandler` para pasar versión | `SaleSyncHandler.ts` | Crítica | 30 min |
| 3 | Crear `SaleItemConflictResolver` | `ConflictResolver.ts` | Crítica | 45 min |
| 4 | Test unitario race condition | `sale-sync.race.test.ts` | Alta | 1 hora |
| 5 | Fix recálculo atómico (UPDATE con SQL) | `SaleItemSyncHandler.ts` | Media | 1 hora |
| 6 | Test E2E recálculo de totales | `sale-item-total-race.spec.ts` | Media | 1.5 horas |
| 7 | Opcional: Trigger de base de datos | Migration | Baja | 30 min |

**Tiempo total estimado**: ~5-6 horas

---

## Verificación Post-Corrección

### Checklist de Validación

- [ ] Test unitario de race condition pasa
- [ ] Test E2E de totales pasa
- [ ] Dos updates concurrentes con misma versión generan conflicto
- [ ] Items concurrentes detectan conflicto via versión de venta padre
- [ ] Totales se recalculan correctamente en updates concurrentes
- [ ] No hay regresiones en flujo normal de ventas
- [ ] Sync de ventas existentes funciona correctamente

### Queries de Verificación

```sql
-- Verificar que no haya ventas con totales inconsistentes
SELECT s.id, s.total_amount, s.version,
       (SELECT COALESCE(SUM(subtotal), 0) FROM sale_items WHERE sale_id = s.id) as calculated_total
FROM sales s
WHERE s.total_amount != (SELECT COALESCE(SUM(subtotal), 0) FROM sale_items WHERE sale_id = s.id);

-- Verificar conflictos pendientes
SELECT entity_type, entity_id, created_at
FROM sync_conflicts
WHERE resolution_status = 'pending';
```

---

## Notas Adicionales

### Consideraciones de Performance
- Agregar índice en `(business_id, version)` para lookups de conflicto
- El UPDATE atómico con subquery es más lento pero garantiza consistencia

### Backwards Compatibility
- Los cambios son backwards compatible si se hace opcional el `expectedVersion`
- Ventas existentes seguirán funcionando sin versión explícita

### Monitoreo
- Agregar métrica: `sync_conflict_count` por tipo de entidad
- Alertar si hay aumento repentino de conflictos de sale_items
