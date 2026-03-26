# Plan: Alertas de Inventario con Acciones de Compra

## 1. Objective

Crear pantalla de alertas de inventario que notifique al usuario cuando el stock cae por debajo de los umbrales configurados, con acciones directas para resolver el desequilibrio mediante la creación de órdenes de compra.

## 2. Scope

### In Scope
- Agregar columnas de umbral (`low_stock_threshold`, `critical_stock_threshold`) a `product_variants`
- Crear endpoint `GET /reports/stock-alerts` que calcule alertas en tiempo real
- Crear pantalla `/reportes/alertas-stock` con UI de alertas
- Agregar acceso desde el menú de configuración
- Botón "Crear Orden de Compra" que pre-llena el formulario de compra

### Out of Scope
- Sistema de notificaciones push/email/whatsapp (ya existe configuración en _protected.config.notifications.tsx)
- Alertas persistentes en base de datos (se calculan on-demand)
- Configuración de umbrales por producto (valores default únicamente)
- Predicción de quiebres de stock

## 3. Verified Context

### Backend
- **`packages/backend/src/db/schema/inventory.ts`**: `productVariants` table existe sin columnas de umbral. Agregar `low_stock_threshold` y `critical_stock_threshold`.
- **`packages/backend/src/db/schema/inventory.ts`**: `variantInventory` table tiene `quantity` que representa stock actual.
- **`packages/backend/src/api/reports.ts`**: Usa ElysiaJS con `contextPlugin` y `servicesPlugin`. Endpoint `GET /reports/missing-inventory` ya existe como patrón a seguir.
- **`packages/backend/src/services/repository/product-variant.repository.ts`**: `getMissingInventoryReport()` existe y puede servir de base para `getStockAlerts()`.

### Frontend
- **`packages/app/app/routes/_protected.reportes.compras-sugeridas.tsx`**: Ruta existente `/reportes/compras-sugeridas` — buen patrón a seguir para la UI.
- **`packages/app/app/routes/_protected.reportes.cuentas-por-cobrar.tsx`**: Otra ruta de reporte existente.
- **`packages/app/app/hooks/use-missing-inventory.ts`**: Hook existente para reportes — patrón a seguir.
- **`packages/app/app/routes/_protected.config._index.tsx`**: Menú de configuración donde se agregará el acceso a alertas.
- **`packages/app/app/routes/_protected.compras.nueva.($draftId)._index.tsx`**: Lee `location.state.supplier` para pre-llenar — usar mismo patrón para pre-llenar productos.

### Database
- Tablas existentes: `product_variants`, `variant_inventory`
- Sync status fields ya existen en todas las tablas

## 4. Assumptions

1. Los umbrales tendrán valores default: `low_stock_threshold = 10` kg, `critical_stock_threshold = 5` kg
2. La lógica de alerta: `alertType = "negative"` si stock < 0, `alertType = "critical"` si stock <= criticalThreshold, `alertType = "low"` si stock <= lowThreshold
3. `suggestedQuantity = max(0, lowThreshold - currentStock)` para productos low/critical
4. El endpoint no necesita filtros — siempre retorna todas las alertas no acknowledgadas del negocio actual
5. El pre-llenado de compra funciona con `location.state` (mismo patrón que supplier)

## 5. Files Involved

### Backend (packages/backend/src/)
| File | Action |
|------|--------|
| `db/schema/inventory.ts` | Modificar: agregar columnas threshold a `productVariants` |
| `api/reports.ts` | Modificar: agregar endpoint `GET /reports/stock-alerts` |
| `services/repository/product-variant.repository.ts` | Modificar: agregar método `getStockAlerts()` |

### Frontend (packages/app/)
| File | Action |
|------|--------|
| `app/hooks/use-stock-alerts.ts` | Crear: hook para consumir endpoint |
| `app/routes/_protected.reportes.alertas-stock.tsx` | Crear: pantalla de alertas |
| `app/routes/_protected.config._index.tsx` | Modificar: agregar item al menú |

### Docs
| File | Action |
|------|--------|
| `docs/screens/alertas-stock.html` | Modificar: actualizar mockup con acciones |

## 6. Ordered Execution Steps

### Step 1: Schema - Agregar columnas de umbral
**File:** `packages/backend/src/db/schema/inventory.ts`

```typescript
// En productVariants table, después de isActive:
// Display & status
sortOrder: integer("sort_order").notNull().default(0),
isActive: boolean("is_active").notNull().default(true),
lowStockThreshold: decimal("low_stock_threshold", { precision: 10, scale: 3 }).notNull().default("10"),
criticalStockThreshold: decimal("critical_stock_threshold", { precision: 10, scale: 3 }).notNull().default("5"),
```

**Note:** Requerirá migración Drizzle (`bun run db:generate` + `bun run db:migrate`)

### Step 2: Repository - Método getStockAlerts()
**File:** `packages/backend/src/services/repository/product-variant.repository.ts`

Agregar método:
```typescript
async getStockAlerts(ctx: RequestContext): Promise<StockAlert[]> {
  // 1. Join productVariants + variantInventory
  // 2. Calculate alertType based on currentStock vs thresholds
  // 3. Calculate suggestedQuantity = max(0, lowThreshold - currentStock)
  // 4. Return sorted: negative first, then critical, then low
}
```

### Step 3: API Endpoint - GET /reports/stock-alerts
**File:** `packages/backend/src/api/reports.ts`

Agregar endpoint después de `missing-inventory`:
```typescript
.get(
  "/stock-alerts",
  async ({ productVariantRepo, ctx }) => {
    const alerts = await productVariantRepo.getStockAlerts(ctx as RequestContext);
    return { success: true, data: alerts };
  }
)
```

### Step 4: Frontend Hook - useStockAlerts
**File:** `packages/app/app/hooks/use-stock-alerts.ts`

Crear hook similar a `useMissingInventory`:
```typescript
export interface StockAlert {
  variantId: string;
  productId: string;
  productName: string;
  variantName: string;
  currentStock: string;
  lowThreshold: string;
  criticalThreshold: string;
  alertType: "negative" | "critical" | "low";
  suggestedQuantity: string;
}

export function useStockAlerts() {
  // useQuery to GET /reports/stock-alerts
}
```

### Step 5: Frontend Route - Pantalla Alertas de Stock
**File:** `packages/app/app/routes/_protected.reportes.alertas-stock.tsx`

UI basada en `compras-sugeridas.tsx`:
- Header con título "Alertas de Inventario"
- Cards de métricas: críticos, bajos, total
- Lista de alertas por severidad (negative → critical → low)
- Cada card: nombre producto, badge severidad, grid métricas, botón "Crear Orden de Compra"
- Banner bulk "Crear compra para todos" al final
- Empty state cuando no hay alertas
- Loading skeletons

### Step 6: Pre-llenar Compra desde Alerta
**File:** `packages/app/app/routes/_protected.reportes.alertas-stock.tsx`

```typescript
const handleCreatePurchase = (alert: StockAlert) => {
  navigate("/compras/nueva", {
    state: {
      items: [{ variantId: alert.variantId, quantity: alert.suggestedQuantity }]
    }
  });
};

const handleCreateBulkPurchase = (alerts: StockAlert[]) => {
  navigate("/compras/nueva", {
    state: {
      items: alerts.map(a => ({ variantId: a.variantId, quantity: a.suggestedQuantity }))
    }
  });
};
```

**File:** `packages/app/app/routes/_protected.compras.nueva.($draftId)._index.tsx`

Modificar para leer `location.state.items` y pre-llenar calculator (similar a como lee `stateSupplier`).

### Step 7: Agregar al Menú de Configuración
**File:** `packages/app/app/routes/_protected.config._index.tsx`

Agregar import y config item:
```typescript
import { AlertTriangle } from "lucide-react";

const stockAlertsConfigItem = {
  icon: AlertTriangle,
  title: "Alertas de Stock",
  description: "Productos con stock bajo o crítico",
  href: "/reportes/alertas-stock",
  color: "text-red-600",
};
```

Agregar a `configItems` array (para admins).

## 7. Risks and Edge Cases

| Risk | Mitigation |
|------|------------|
| Migración de schema puede fallar si hay datos existentes | Verificar con `bun run db:push --force` en dev primero |
| Productos sin variantInventory (sin stock) | El JOIN debe usar COALESCE para treat null como 0 |
| Cantidades negativas en threshold calculations | Usar `GREATEST(0, ...)` en SQL para evitar valores negativos |
| Endpoint sin paginación podría ser lento con muchos productos | Asumir que negocio tiene < 1000 variantes; si escala, agregar pagination |
| Pre-llenar calculator con productos de alerta | Verificar que calculator acepte items pre-llenados via state |

## 8. Validation Strategy

### Backend
- Endpoint `GET /reports/stock-alerts` responde con `{ success: true, data: alerts }`
- Validar que alerts tenga campos: `variantId`, `alertType`, `suggestedQuantity`
- Probar con variantInventory.quantity = -5, 2, 8, 15 para verificar clasificación

### Frontend
- Ruta `/reportes/alertas-stock` renderiza sin errores
- Loading state muestra skeletons
- Empty state muestra mensaje "Inventario saludable"
- Botón "Crear Orden de Compra" navega a `/compras/nueva` con state
- Items aparecen pre-llenados en calculator

### Integration
- Agregar item al menú visible para admin
- Conectar botón con calculator pre-llenado

## 9. Open Questions

1. **¿Los umbrales deben ser configurables por admin?** Por ahora se usan defaults (10/5 kg), pero no hay UI para editarlos.
2. **¿El banner bulk debe permitir editar cantidades antes de crear?** Asumimos que sí — se abre calculator con cantidades sugeridas, usuario puede ajustar.
3. **¿Se necesita acknowledgment de alertas?** Por ahora las alertas son purely informational. No se marca como "vista".
4. **¿Filtros en endpoint?** Por ahora no — retorna todas las alertas. Agregar `?alertType=critical` si performance es un problema.

## 10. Dependencies

- Drizzle ORM migration toolchain (`bun run db:generate`, `bun run db:migrate`)
- Existing purchase flow (`/compras/nueva` route, `PurchaseFormProvider`, calculator)
- Existing report patterns (`compras-sugeridas.tsx`, `useMissingInventory`)
- Lucide icons (AlertTriangle ya existe en codebase)
