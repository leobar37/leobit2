# Plan de Trabajo: Sistema de Variantes de Productos (Variant-First)

## TL;DR

> **Implementar sistema de variantes/presentaciones de productos** donde todo ítem vendible se concreta como una variante (ej: Huevos → Jaba 30un, Docena 12un, Unidad), con precio por variante, inventario por variante y soporte offline-first completo.
>
> **Deliverables:**
> - Tabla `product_variants` con CRUD completo
> - Tabla `variant_inventory` para stock por variante
> - Flujo de venta con selección de variante obligatoria (autoselección si solo hay una activa)
> - Precio de referencia en variante + snapshot de precio final en `sale_items`
> - Resolución de conflictos offline (LWW + `409 CONFLICT` + estado `error`)
>
> **Estimated Effort:** Large (4-6 días de desarrollo)  
> **Parallel Execution:** YES - 5 waves  
> **Critical Path:** Schema → Backend API → POS Flow → Offline Sync → Tests

---

## Contexto

### Requisitos del Producto

- ✅ Arquitectura **variant-first**: toda venta referencia una variante
- ✅ `variant_id` obligatorio en ventas (no se permite venta sin variante)
- ✅ Presentaciones personalizadas por producto
- ✅ Precio fijo por variante como fuente de referencia
- ✅ Snapshot del precio final vendido en `sale_items`
- ✅ Inventario separado por variante (sin conversiones automáticas en MVP)
- ✅ Full offline-first support
- ✅ Flujo de venta en dos pasos: Producto → Variante
- ✅ UX simplificada: autoselección cuando existe exactamente 1 variante activa

### Hallazgos y Decisiones

1. **Conflictos offline de edición**: se resuelven con estrategia MVP de Last-Write-Wins.
2. **Límites operativos**: máximo 10 variantes por producto, nombres únicos por producto.
3. **Guardrails MVP**: sin atributos dinámicos, sin bundles, sin imágenes por variante.
4. **Consistencia de ventas**: validaciones server-side obligan `variant_id` siempre.
5. **Migración histórica**: no aplica (no hay datos previos que migrar).

### Alcance MVP

**INCLUIR:**
- `product_variants` + `variant_inventory`
- CRUD de variantes
- Gestión de variantes en UI admin
- Selector de variantes en ventas (autoselección con variante única activa)
- Inventario por variante
- Sync offline-first de variantes
- Manejo de conflictos de sincronización (MVP)

**EXCLUIR (Post-MVP):**
- Conversión automática inventario base ↔ variantes
- Atributos dinámicos (color/talla/etc.)
- Bundles/combos
- Imágenes por variante
- Templates compartidos
- Historial de precios
- Barcodes por variante

---

## Modelo de Datos

### Nuevas Tablas

```avileo/packages/backend/src/db/schema/inventory.ts#L1-120
export const productVariants = pgTable(
  "product_variants",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),

    // Variant info
    name: varchar("name", { length: 50 }).notNull(),
    sku: varchar("sku", { length: 50 }),
    unitQuantity: decimal("unit_quantity", { precision: 10, scale: 3 }).notNull(),
    price: decimal("price", { precision: 10, scale: 2 }).notNull(),

    // Display & status
    sortOrder: integer("sort_order").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),

    // Sync
    syncStatus: syncStatusEnum("sync_status").notNull().default("synced"),
    syncAttempts: integer("sync_attempts").notNull().default(0),

    // Timestamps
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("idx_variants_product_id").on(table.productId),
    index("idx_variants_is_active").on(table.isActive),
    index("idx_variants_sync_status").on(table.syncStatus),
    uniqueIndex("idx_variants_product_name").on(table.productId, table.name),
  ]
);

export const variantInventory = pgTable(
  "variant_inventory",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    variantId: uuid("variant_id")
      .notNull()
      .references(() => productVariants.id, { onDelete: "cascade" }),
    quantity: decimal("quantity", { precision: 10, scale: 3 }).notNull().default("0"),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("idx_variant_inventory_variant_id").on(table.variantId),
    uniqueIndex("idx_variant_inventory_unique").on(table.variantId),
  ]
);
```

### Modificaciones a Tablas Existentes

```avileo/packages/backend/src/db/schema/sales.ts#L1-120
export const saleItems = pgTable("sale_items", {
  // ...existing fields
  variantId: uuid("variant_id")
    .notNull()
    .references(() => productVariants.id),
  variantName: varchar("variant_name", { length: 50 }).notNull(), // snapshot legible
  unitPrice: decimal("unit_price", { precision: 10, scale: 2 }).notNull(), // snapshot final vendido
});
```

### Constraints Recomendados (DB)

- `CHECK (unit_quantity > 0)`
- `CHECK (price >= 0)`
- `UNIQUE (product_id, name)` en `product_variants`
- `UNIQUE (variant_id)` en `variant_inventory`
- Índice en `sale_items(variant_id)`
- Índice compuesto sugerido para reporting: `sale_items(product_id, variant_id)`

---

## Reglas de Negocio (Canónicas)

1. **Toda venta requiere variante**
   - Cualquier `sale_item` sin `variant_id` se rechaza.
2. **Precio de referencia**
   - `product_variants.price` define precio vigente para nuevas ventas.
3. **Snapshot de venta**
   - En venta se guarda `sale_items.unit_price` (inmutable).
4. **Autoselección UX**
   - Si producto tiene 1 variante activa: seleccionar automáticamente.
   - Si tiene >1: selector obligatorio.
5. **Límite operativo**
   - Máximo 10 variantes activas/inactivas por producto.
6. **Seguridad**
   - Solo roles admin pueden crear/editar/eliminar/desactivar variantes.
7. **Soft delete funcional**
   - En MVP, preferir `isActive=false` sobre borrado físico para continuidad operativa.

---

## Estrategia Offline y Resolución de Conflictos

### Objetivo

Mantener operación offline estable y predecible sin merge complejo de entidades.

### Política MVP

- **Last-Write-Wins (LWW)** con `updated_at` del servidor.
- Cliente envía `updatedAt` conocido al editar.
- Si servidor detecta versión más reciente:
  - devuelve `409 CONFLICT` + estado actual de entidad.
  - cliente marca registro local con `sync_status = "error"`.
  - UI admin muestra conflicto y acción de reintento o sobrescritura explícita.

### Orden de Sincronización

1. `product_variants` (upserts / desactivaciones)
2. `variant_inventory` (ajustes administrativos)
3. `sales` / `sale_items` dependientes de `variant_id`

### Casos críticos a cubrir

- Variante editada en dos dispositivos offline.
- Variante desactivada mientras otro dispositivo la intenta usar.
- Venta offline con variante vigente local pero actualizada remotamente.
- Reintentos de sync con `sync_attempts` y salida a estado `error`.

---

## Execution Strategy

### Parallel Execution Waves

```/dev/null/plan-waves.txt#L1-60
Wave 1 (Foundation - Database & Contracts):
├── Task 1: Create product_variants migration
├── Task 2: Create variant_inventory migration
├── Task 3: Add variant fields to sale_items as NOT NULL + FK + indexes
├── Task 4: Update backend schema definitions (Drizzle)
├── Task 5: Update shared types (@avileo/shared)
└── Task 6: Update frontend Zod schemas

Wave 2 (Backend - Core Logic):
├── Task 7: ProductVariantRepository (CRUD + tenant filtering)
├── Task 8: ProductVariantService (rules + limits + permissions)
├── Task 9: ProductVariantController (API endpoints)
├── Task 10: Update SaleService (variant required + pricing snapshot)
└── Task 11: Update InventoryService (variant stock operations)

Wave 3 (Frontend - Admin):
├── Task 12: ProductVariantManager
├── Task 13: VariantForm
├── Task 14: VariantList
├── Task 15: Product detail integration (variants section)
└── Task 16: Product variant hooks + cache invalidation

Wave 4 (Frontend - POS):
├── Task 17: ProductVariantSelector (two-step flow)
├── Task 18: Autoselection logic for single active variant
├── Task 19: Update cart item model (variant required)
├── Task 20: Update ventas.nueva.tsx submit payload
└── Task 21: SaleCartItem display with variant name

Wave 5 (Offline + QA + Docs):
├── Task 22: Offline sync implementation for variants
├── Task 23: Seed data with variants
├── Task 24: Backend integration tests
├── Task 25: E2E tests (Playwright)
└── Task 26: Documentation updates
```

### Dependency Matrix

| Task | Depends On | Blocks |
|------|------------|--------|
| 1-6  | —          | 7-11   |
| 7-9  | 1,4,5      | 12-16  |
| 10-11| 3,7,8      | 17-21,24 |
| 12-16| 9,6        | 17-21,25 |
| 17-21| 10,12-16   | 24-25  |
| 22   | 9,16,20    | 24-25  |
| 23   | 1-4        | 25     |
| 24-26| 17-23      | Final review |

---

## TODOs Detallados

### Wave 1: Foundation

- [ ] **1. Create `product_variants` migration**
  - Crear migración SQL en backend.
  - Definir índices y unique constraints.
  - Agregar checks de precio/cantidad recomendados.
  - **Acceptance:** migración aplica y tabla existe con estructura esperada.

- [ ] **2. Create `variant_inventory` migration**
  - Crear tabla con FK a variante.
  - `UNIQUE (variant_id)` para una fila de inventario por variante.
  - **Acceptance:** migración aplica y tabla existe con constraints correctos.

- [ ] **3. Update `sale_items` for variant-first**
  - Agregar `variant_id` (NOT NULL FK) y `variant_name` (NOT NULL).
  - Indexar `variant_id`.
  - **Acceptance:** DB rechaza sale items sin variante.

- [ ] **4. Update Drizzle schemas**
  - Ajustar schemas backend para nuevas tablas/campos.
  - **Acceptance:** compila y refleja constraints.

- [ ] **5. Update shared types**
  - Agregar tipos `ProductVariant`, `VariantInventory`.
  - Hacer obligatorios `variantId`, `variantName` en tipos de venta.
  - **Acceptance:** `@avileo/shared` build OK.

- [ ] **6. Update frontend Zod schemas**
  - Incluir `productVariantSchema`.
  - Requerir variante en `saleItemSchema`.
  - **Acceptance:** typecheck frontend sin errores.

### Wave 2: Backend Core

- [ ] **7. ProductVariantRepository**
  - CRUD + filtros multi-tenant.
  - `countByProduct` para límite de variantes.
  - **Acceptance:** tests unitarios de repositorio pasan.

- [ ] **8. ProductVariantService**
  - Regla max 10 variantes.
  - Nombres únicos por producto.
  - Permisos admin.
  - Crear fila inicial en `variant_inventory` al crear variante.
  - **Acceptance:** reglas de negocio cubiertas por tests.

- [ ] **9. ProductVariantController**
  - Endpoints:
    - `GET /products/:productId/variants`
    - `GET /variants/:id`
    - `POST /products/:productId/variants`
    - `PUT /variants/:id`
    - `DELETE /variants/:id` (desactivar en MVP)
    - `POST /products/:productId/variants/reorder`
  - Validación TypeBox y errores estándar.
  - **Acceptance:** contratos API validados por integración.

- [ ] **10. Update SaleService**
  - Requerir `variantId` en todos los items.
  - Verificar que variante pertenece al producto.
  - Usar `variant.price` como referencia para cálculo.
  - Persistir `sale_items.unit_price` y `variant_name` como snapshot.
  - Descontar inventario de `variant_inventory`.
  - **Acceptance:** venta rechazada sin variante / precio y stock correctos.

- [ ] **11. Update InventoryService**
  - `getVariantStock`, `updateVariantStock`, `adjustVariantStock`.
  - Asegurar atomicidad con flujo de ventas.
  - **Acceptance:** operaciones consistentes y seguras ante concurrencia básica.

### Wave 3: Frontend Admin

- [ ] **12. ProductVariantManager**
  - Listado + acciones CRUD.
  - Integración con hooks.
  - **Acceptance:** gestión completa desde detalle de producto.

- [ ] **13. VariantForm**
  - Campos: `name`, `sku`, `unitQuantity`, `price`, `isActive`.
  - Validación Zod y estados de carga/error.
  - **Acceptance:** crear/editar funcionando.

- [ ] **14. VariantList**
  - Lista ordenable (drag-drop o up/down).
  - Badges estado activo/inactivo.
  - **Acceptance:** reordenar y visualizar correctamente.

- [ ] **15. Product detail integration**
  - Sección de variantes siempre disponible para producto.
  - **Acceptance:** navegación/admin UX consistente.

- [ ] **16. Hooks de variantes**
  - Query/mutations con TanStack.
  - Invalidation correcta.
  - Offline queue para mutaciones.
  - **Acceptance:** estado local/servidor coherente.

### Wave 4: POS

- [ ] **17. ProductVariantSelector**
  - Paso 1: producto
  - Paso 2: variante (si aplica)
  - **Acceptance:** variante seleccionada siempre antes de agregar al carrito.

- [ ] **18. Single-variant autoselection**
  - Si hay una sola variante activa: selección automática.
  - **Acceptance:** UX más rápida sin romper validación.

- [ ] **19. Cart model update**
  - `variantId` y `variantName` obligatorios en item de carrito.
  - **Acceptance:** payload de venta siempre válido.

- [ ] **20. ventas.nueva.tsx**
  - Integrar flujo variant-first.
  - Garantizar envío de `variantId`.
  - **Acceptance:** venta completa exitosa online/offline.

- [ ] **21. SaleCartItem UI**
  - Mostrar `productName - variantName`.
  - **Acceptance:** claridad visual en carrito y resumen.

### Wave 5: Offline, QA y Docs

- [ ] **22. Offline sync**
  - Cola para `product_variants` con manejo de `409`.
  - Estado `error` visible y recuperable.
  - Orden de sync respetando dependencias.
  - **Acceptance:** escenarios de conflicto controlados.

- [ ] **23. Seed data**
  - Agregar ejemplos de variantes e inventario.
  - **Acceptance:** entorno dev listo para pruebas.

- [ ] **24. Integration tests backend**
  - CRUD, permisos, límites, ventas con variante, inventario, conflictos básicos.
  - **Acceptance:** suite verde.

- [ ] **25. E2E Playwright**
  - Crear variante, vender variante, autoselección, offline/reconnect, conflicto.
  - **Acceptance:** flujos críticos verdes.

- [ ] **26. Documentación**
  - Actualizar esquema técnico y guía operativa.
  - Incluir decisiones de arquitectura variant-first.
  - **Acceptance:** docs alineadas al comportamiento real.

---

## Guardrails & Constraints

```/dev/null/constraints.ts#L1-12
const VARIANTS_CONSTRAINTS = {
  maxPerProduct: 10,
  maxNameLength: 50,
  maxSkuLength: 50,
  maxPrice: 9999.99,
  minUnitQuantity: 0.001,
  maxUnitQuantity: 9999.999,
};
```

### Anti-patrones a evitar

- ❌ Agregar atributos dinámicos en MVP
- ❌ Permitir venta sin `variant_id`
- ❌ Tomar precio final desde producto en vez de variante
- ❌ Borrar físicamente variantes usadas en operación sin estrategia
- ❌ Ignorar conflictos offline silenciosamente

---

## Testing Plan (Must Pass)

### Backend

- [ ] Crear variante válida
- [ ] Rechazar nombre duplicado por producto
- [ ] Rechazar >10 variantes por producto
- [ ] Rechazar venta sin `variantId`
- [ ] Rechazar `variantId` que no pertenece al `productId`
- [ ] Usar `variant.price` y guardar snapshot en `sale_items.unit_price`
- [ ] Descontar `variant_inventory` correctamente
- [ ] Manejar `409 CONFLICT` en update con versión stale

### Frontend/POS

- [ ] Producto con 1 variante activa → autoselección
- [ ] Producto con múltiples variantes → selector obligatorio
- [ ] Carrito siempre contiene `variantId` + `variantName`
- [ ] Payload final siempre incluye variantes
- [ ] Flujo offline de venta funciona con datos locales
- [ ] Reintento de sync tras reconnect funciona

### E2E (mínimo)

- [ ] Admin crea 3 variantes para un producto
- [ ] Vendedor realiza venta seleccionando variante específica
- [ ] Cambio de precio de variante no afecta ventas históricas
- [ ] Conflicto offline muestra estado `error` y permite resolver

---

## Riesgos y Mitigaciones

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|--------------|---------|------------|
| Conflictos offline en edición de variantes | Media | Alto | LWW + `409` + `sync_status=error` + UX de resolución |
| Errores de integridad variante-producto | Baja | Alto | Validación service + FK + tests de contrato |
| Complejidad UX móvil en POS | Media | Medio | Flujo 2 pasos + autoselección para variante única |
| Duplicación offline de variantes | Baja | Medio | `UNIQUE(product_id, name)` + manejo de errores de sync |
| Desfase precio actual vs histórico | Baja | Alto | Snapshot obligatorio en `sale_items.unit_price` |

---

## Commit Strategy

| Wave | Commit Message |
|------|----------------|
| 1 | `feat(db): add variant-first schema for products, sales, and inventory` |
| 2 | `feat(api): implement product variants CRUD and sale validation` |
| 3 | `feat(ui): add admin variant management components and hooks` |
| 4 | `feat(pos): enforce variant selection in sales flow` |
| 5 | `feat(sync-test-docs): add offline conflict handling, tests, and docs` |

---

## Success Criteria

### Funcionales

- [ ] Toda venta se guarda con `variant_id` válido
- [ ] Admin gestiona variantes completas por producto
- [ ] Precio por variante se aplica correctamente en ventas nuevas
- [ ] Precio vendido queda congelado en `sale_items.unit_price`
- [ ] Inventario se descuenta por variante
- [ ] Funciona offline y sincroniza al reconectar

### Técnicos

- [ ] TypeScript compila sin errores
- [ ] Tests backend pasan
- [ ] E2E críticos pasan
- [ ] Migraciones aplican en entorno limpio
- [ ] Sin contradicciones entre backend, frontend y docs

---

## Conclusión

Este plan queda **normalizado y listo para construcción** bajo una arquitectura **variant-first real**:

- sin ventas sin variante,
- con fuente de precio clara (variante) + snapshot histórico,
- con sync offline robusto para MVP,
- y sin deuda de “modo híbrido” con `hasVariants`.

Siguiente paso recomendado: ejecutar implementación por waves en orden, empezando por migraciones y validaciones de venta.
