# Plan de Trabajo: Sistema de Variantes de Productos

## TL;DR

> **Implementar sistema de variantes/presentaciones de productos** que permita a cualquier producto tener múltiples presentaciones (ej: Huevos → Jaba 30un, Docena 12un, Unidad) con precios independientes, inventario por variante y soporte offline-first completo.
>
> **Deliverables:**
> - Tabla `product_variants` con CRUD completo
> - Selector de variantes en flujo de ventas (dos pasos, con autoselección si solo hay una variante activa)
> - Inventario separado por variante
> - Soporte offline-first para variantes
> - Resolución de conflictos offline (LWW + estado de error visible)
>
> **Estimated Effort:** Large (3-4 días de desarrollo)
> **Parallel Execution:** YES - 4 waves
> **Critical Path:** Schema → Backend API → Frontend Components → Integration Tests

---

## Contexto

### Requisitos del Usuario
- ✅ Arquitectura variant-first: todo producto se vende con variante
- ✅ `variant_id` obligatorio en ventas (no se permite venta sin variante)
- ✅ Presentaciones personalizadas por producto
- ✅ Precio fijo independiente por variante
- ✅ Inventario separado por variante (no conversión automática en MVP)
- ✅ Full offline-first support
- ✅ Flujo de ventas en dos pasos: Producto → Variante (autoselección con una sola variante activa)

### Hallazgos de Metis (Gaps Identificados)
1. **Sync conflicts:** Variantes editadas mientras vendedor está offline (resolver con LWW + `409 CONFLICT` + estado `error` visible)
2. **Límites necesarios:** Máximo 10 variantes por producto, nombres únicos
3. **Guardrails:** Sin atributos dinámicos, sin bundles, sin imágenes por variante
4. **Consistencia de ventas:** `variant_id` obligatorio y validaciones server-side

### Decisión de Alcance (MVP Completo)
**INCLUIR:**
- Tabla `product_variants` con campos: id, productId, name, sku, unitQuantity, price, isActive, sortOrder, syncStatus
- API endpoints CRUD para variantes
- UI de gestión de variantes (admin)
- Selector de variantes en ventas (dos pasos, con autoselección para variante única)
- Inventario por variante (tabla separada)
- Soporte offline-first (sync queue)
- Resolución de conflictos offline (MVP)

**EXCLUIR (Post-MVP):**
- Conversión automática entre base y variantes
- Atributos dinámicos (color, tamaño)
- Bundles/combos
- Imágenes por variante
- Templates de variantes compartidos
- Historial de precios
- Barcodes por variante

---

## Modelo de Datos

### Nuevas Tablas

```typescript
// product_variants - Definiciones de presentaciones
export const productVariants = pgTable(
  "product_variants",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    
    // Variant info
    name: varchar("name", { length: 50 }).notNull(), // "Jaba 30un", "Docena"
    sku: varchar("sku", { length: 50 }), // Optional: HUE-001-J30
    unitQuantity: decimal("unit_quantity", { precision: 10, scale: 3 }).notNull(), // 30, 12, 1
    price: decimal("price", { precision: 10, scale: 2 }).notNull(),
    
    // Display & status
    sortOrder: integer("sort_order").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
    
    // Sync for offline-first
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

// variant_inventory - Stock por variante
export const variantInventory = pgTable(
  "variant_inventory",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    variantId: uuid("variant_id")
      .notNull()
      .references(() => productVariants.id, { onDelete: "cascade" }),
    
    // Stock
    quantity: decimal("quantity", { precision: 10, scale: 3 }).notNull().default("0"),
    
    // Timestamps
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("idx_variant_inventory_variant_id").on(table.variantId),
    uniqueIndex("idx_variant_inventory_unique").on(table.variantId),
  ]
);
```

### Modificaciones a Tablas Existentes

```typescript
// products - Variant-first architecture (no hasVariants flag required)

// sale_items - Referencia obligatoria a variante
export const saleItems = pgTable("sale_items", {
  // ... existing fields ...
  variantId: uuid("variant_id")
    .notNull()
    .references(() => productVariants.id),
  variantName: varchar("variant_name", { length: 50 }).notNull(), // Denormalized snapshot for offline/history
});
```

### Tipos TypeScript

```typescript
// packages/shared/src/index.ts additions
export const ProductVariant = {
  // Type definitions
};

// Frontend schema (packages/app/app/lib/db/schema.ts)
export const productVariantSchema = z.object({
  id: z.string(),
  productId: z.string(),
  name: z.string().max(50),
  sku: z.string().max(50).nullable(),
  unitQuantity: z.string(), // Decimal as string
  price: z.string(),
  sortOrder: z.number(),
  isActive: z.boolean(),
  syncStatus: z.enum(["pending", "synced", "error"]),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});
```

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Foundation - Database & Types):
├── Task 1: Create product_variants table migration
├── Task 2: Create variant_inventory table migration  
├── Task 3: Enforce variant-first rules in sale_items and constraints
├── Task 4: Add variant fields to sale_items
├── Task 5: Update shared types (@avileo/shared)
└── Task 6: Update frontend Zod schemas

Wave 2 (Backend - API & Business Logic):
├── Task 7: ProductVariantRepository (CRUD)
├── Task 8: ProductVariantService (business logic)
├── Task 9: ProductVariantController (API endpoints)
├── Task 10: Update ProductService (variant-first UX support)
├── Task 11: Update SaleService (variant handling)
└── Task 12: Update InventoryService (variant stock)

Wave 3 (Frontend - Admin UI):
├── Task 13: ProductVariantManager component
├── Task 14: VariantForm component
├── Task 15: VariantList component
├── Task 16: Update ProductForm (hasVariants toggle)
├── Task 17: Update ProductDetail (variants section)
└── Task 18: Product variants hooks (useProductVariants, etc.)

Wave 4 (Frontend - POS & Sales):
├── Task 19: ProductVariantSelector component
├── Task 20: Update SaleCartItem (show variant)
├── Task 21: Update ventas.nueva.tsx (two-step flow)
├── Task 22: Update ChickenCalculator (variant support)
├── Task 23: Update cart types and logic
└── Task 24: Offline sync for variants

Wave 5 (Integration & Testing):
├── Task 25: Update seed data with variants
├── Task 26: Integration tests (backend)
├── Task 27: E2E tests with Playwright
└── Task 28: Documentation and examples

Wave FINAL (Review):
├── Task F1: Plan compliance audit
├── Task F2: Code quality review
├── Task F3: Manual QA testing
└── Task F4: Performance check

Critical Path: Wave 1 → Wave 2 → Wave 3 → Wave 4 → Wave 5 → Wave FINAL
Max Parallel: 6 tasks (Wave 1 & 2 overlap possible after migrations)
Conflict Strategy (MVP): Last-Write-Wins (server `updated_at`), `409 CONFLICT` on stale offline updates, client marks `sync_status=error` and requires user resolution.
```

### Dependency Matrix

| Task | Depends On | Blocks | Wave |
|------|------------|--------|------|
| 1-6 | — | 7-12 | 1 |
| 7 | 1 | 8, 11 | 2 |
| 8 | 7 | 9 | 2 |
| 9 | 8 | 13-18 | 2,3 |
| 10 | 3 | 11 | 2 |
| 11 | 7, 10 | 12, 20-24 | 2,4 |
| 13-18 | 9 | 19-24 | 3,4 |
| 19-24 | 11, 13-18 | 26-27 | 4,5 |
| 25 | 1-4 | — | 5 |
| 26-28 | 19-24 | F1-F4 | 5 |

---

## TODOs

### Wave 1: Database Foundation

- [ ] **1. Create product_variants table migration**
  
  **What to do:**
  - Create migration file: `packages/backend/src/db/migrations/XXXX_add_product_variants.sql`
  - Define `product_variants` table with all fields
  - Add indexes: product_id, is_active, sync_status, unique(product_id, name)
  - Add foreign key: product_id → products.id (cascade delete)
  
  **Must NOT do:**
  - No default variants (empty table initially)
  - No triggers (keep it simple)
  
  **Recommended Agent Profile:**
  - **Category:** `quick`
  - **Skills:** `bun-elysia`, `fullstack-backend`
  
  **References:**
  - `packages/backend/src/db/schema/inventory.ts` - Pattern for products table
  - `packages/backend/src/db/schema/enums.ts` - syncStatusEnum pattern
  - Drizzle ORM docs for pgTable, indexes, foreign keys
  
  **Acceptance Criteria:**
  - [ ] Migration runs successfully: `bun run db:migrate`
  - [ ] Table exists in database with correct schema
  - [ ] Indexes created
  
  **QA Scenarios:**
  ```
  Scenario: Migration applies correctly
    Tool: Bash
    Steps:
      1. cd packages/backend && bun run db:migrate
      2. psql $DATABASE_URL -c "\d product_variants"
    Expected: Table exists with columns: id, product_id, name, sku, unit_quantity, price, sort_order, is_active, sync_status, sync_attempts, created_at, updated_at
  
  Scenario: Unique constraint works
    Tool: Bash (psql)
    Steps:
      1. INSERT INTO product_variants (product_id, name, price, unit_quantity) VALUES ('uuid-1', 'Jaba', 22.00, 30);
      2. INSERT INTO product_variants (product_id, name, price, unit_quantity) VALUES ('uuid-1', 'Jaba', 25.00, 30);
    Expected: Second insert fails with unique constraint violation
  ```
  
  **Commit:** YES
  - Message: `feat(db): add product_variants table with indexes`
  - Files: `packages/backend/src/db/migrations/XXXX_add_product_variants.sql`

- [ ] **2. Create variant_inventory table migration**
  
  **What to do:**
  - Create migration for `variant_inventory` table
  - Fields: id, variant_id (FK), quantity, updated_at
  - Unique constraint on variant_id (one inventory row per variant)
  
  **Recommended Agent Profile:**
  - **Category:** `quick`
  - **Skills:** `bun-elysia`
  
  **References:**
  - `packages/backend/src/db/schema/inventory.ts` - inventory table pattern
  
  **Acceptance Criteria:**
  - [ ] Migration runs successfully
  - [ ] Table exists with correct schema
  
  **QA Scenarios:**
  ```
  Scenario: variant_inventory table created
    Tool: Bash
    Steps:
      1. psql $DATABASE_URL -c "\d variant_inventory"
    Expected: Table exists with columns: id, variant_id, quantity, updated_at
  ```
  
  **Commit:** YES (group with Task 1)

- [ ] **3. Enforce variant-first rules in sale_items and constraints**
  
  **What to do:**
  - Migration: set `sale_items.variant_id` as `NOT NULL`
  - Migration: set `sale_items.variant_name` as `NOT NULL`
  - Ensure FK `variant_id -> product_variants.id` is present
  - Add/verify index on `sale_items.variant_id`
  - Add backend validation to reject any sale item without variant
  
  **Recommended Agent Profile:**
  - **Category:** `quick`
  - **Skills:** `bun-elysia`, `fullstack-backend`
  
  **References:**
  - `packages/backend/src/db/schema/sales.ts` - sale_items table
  - `packages/backend/src/services` - sale creation/update flows
  
  **Acceptance Criteria:**
  - [ ] Migration applies
  - [ ] `variant_id` and `variant_name` are non-null in DB
  - [ ] Sale API rejects sale items without variant
  - [ ] TypeScript types updated accordingly
  
  **Commit:** YES

- [ ] **4. Add variant fields to sale_items**
  
  **What to do:**
  - Migration: Add `variant_id` (NOT NULL FK) and `variant_name` (NOT NULL varchar)
  - Update Drizzle schema
  - Add index on `variant_id`
  
  **Recommended Agent Profile:**
  - **Category:** `quick`
  - **Skills:** `bun-elysia`
  
  **References:**
  - `packages/backend/src/db/schema/sales.ts` - sale_items table
  
  **Acceptance Criteria:**
  - [ ] Migration applies
  - [ ] Fields added as required (non-null)
  
  **Commit:** YES (group with Task 3)

- [ ] **5. Update shared types (@avileo/shared)**
  
  **What to do:**
  - Add `ProductVariant` interface to `packages/shared/src/index.ts`
  - Add `ProductVariantInventory` interface
  - Update sale item types to make `variantId` and `variantName` required
  - Add enums/const objects if needed
  
  **Recommended Agent Profile:**
  - **Category:** `quick`
  - **Skills:** `fullstack-backend`
  
  **Acceptance Criteria:**
  - [ ] Types compile: `cd packages/shared && bun run build`
  - [ ] All new fields documented
  
  **Commit:** YES

- [ ] **6. Update frontend Zod schemas**
  
  **What to do:**
  - Add `productVariantSchema` to `packages/app/app/lib/db/schema.ts`
  - Update `saleItemSchema` to require variant fields (`variantId`, `variantName`)
  - Add `CreateProductVariantInput`, `UpdateProductVariantInput` types
  - Add UI helper schema/rule: auto-select variant when product has exactly one active variant
  
  **Recommended Agent Profile:**
  - **Category:** `quick`
  - **Skills:** `frontend`
  
  **References:**
  - `packages/app/app/lib/db/schema.ts` - existing schemas
  - `packages/shared/src/index.ts` - shared types
  
  **Acceptance Criteria:**
  - [ ] TypeScript compiles without errors
  - [ ] Zod schemas validate correctly
  
  **Commit:** YES

### Wave 2: Backend API

- [ ] **7. ProductVariantRepository (CRUD)**
  
  **What to do:**
  - Create `packages/backend/src/services/repository/product-variant.repository.ts`
  - Implement methods:
    - `findByProductId(ctx, productId)` - Get all variants for a product
    - `findById(ctx, id)` - Get single variant
    - `create(ctx, data)` - Create variant
    - `update(ctx, id, data)` - Update variant
    - `delete(ctx, id)` - Soft/hard delete
    - `countByProduct(ctx, productId)` - Count variants (for limit validation)
  - Follow Repository pattern with RequestContext
  - Include multi-tenancy filtering (via product→business)
  
  **Recommended Agent Profile:**
  - **Category:** `unspecified-high`
  - **Skills:** `bun-elysia`, `fullstack-backend`
  
  **References:**
  - `packages/backend/src/services/repository/product.repository.ts` - Repository pattern
  - `packages/backend/src/services/repository/inventory.repository.ts` - Similar complexity
  - `packages/backend/src/context/request-context.ts` - RequestContext usage
  
  **Acceptance Criteria:**
  - [ ] All methods implemented
  - [ ] Multi-tenancy filtering correct
  - [ ] Error handling with custom errors (NotFoundError, ForbiddenError)
  
  **QA Scenarios:**
  ```
  Scenario: Create variant
    Tool: Bun test
    Steps:
      1. Call create(ctx, { productId, name: "Jaba", price: "22.00", unitQuantity: "30" })
    Expected: Returns created variant with id
  
  Scenario: Duplicate name rejected
    Tool: Bun test
    Steps:
      1. Create variant with name "Jaba" for product X
      2. Try to create another "Jaba" for same product
    Expected: Throws ValidationError
  ```
  
  **Commit:** YES

- [ ] **8. ProductVariantService (business logic)**
  
  **What to do:**
  - Create `packages/backend/src/services/business/product-variant.service.ts`
  - Implement methods:
    - `getVariantsByProduct(ctx, productId)`
    - `getVariant(ctx, id)`
    - `createVariant(ctx, productId, data)`
    - `updateVariant(ctx, id, data)`
    - `deleteVariant(ctx, id)`
    - `reorderVariants(ctx, productId, orderedIds)`
  - Add business rules:
    - Max 10 variants per product
    - Name uniqueness per product
    - Only admin can create/edit variants
  - Create default inventory entry when variant created
  
  **Recommended Agent Profile:**
  - **Category:** `unspecified-high`
  - **Skills:** `bun-elysia`, `fullstack-backend`
  
  **References:**
  - `packages/backend/src/services/business/product.service.ts` - Service pattern
  - `packages/backend/src/errors/*.ts` - Error classes
  
  **Acceptance Criteria:**
  - [ ] All CRUD operations working
  - [ ] Business rules enforced (max 10, unique names)
  - [ ] Inventory entry auto-created
  
  **Commit:** YES

- [ ] **9. ProductVariantController (API endpoints)**
  
  **What to do:**
  - Create `packages/backend/src/api/product-variants.ts`
  - Implement Elysia routes:
    - `GET /products/:productId/variants` - List variants
    - `GET /variants/:id` - Get single variant
    - `POST /products/:productId/variants` - Create variant
    - `PUT /variants/:id` - Update variant
    - `DELETE /variants/:id` - Delete variant
    - `POST /products/:productId/variants/reorder` - Reorder variants
  - Use TypeBox for validation
  - Include proper error handling
  
  **Recommended Agent Profile:**
  - **Category:** `unspecified-high`
  - **Skills:** `bun-elysia`
  
  **References:**
  - `packages/backend/src/api/products.ts` - API pattern
  - `packages/backend/src/plugins/services.ts` - Service injection
  
  **Acceptance Criteria:**
  - [ ] All endpoints working via curl/HTTP client
  - [ ] Validation correct (max 50 chars name, valid price)
  - [ ] Error responses in standard format
  
  **QA Scenarios:**
  ```
  Scenario: List variants for product
    Tool: Bash (curl)
    Steps:
      1. curl http://localhost:3000/api/products/{id}/variants
    Expected: Returns array of variants with 200 status
  
  Scenario: Create variant with invalid data
    Tool: Bash (curl)
    Steps:
      1. curl -X POST http://localhost:3000/api/products/{id}/variants -d '{"name": ""}'
    Expected: Returns 400 with validation error
  ```
  
  **Commit:** YES

- [ ] **10. Update ProductService (hasVariants logic)**
  
  **What to do:**
  - Update `packages/backend/src/services/business/product.service.ts`
  - Modify `createProduct` to accept `hasVariants` flag
  - Modify `updateProduct` to handle `hasVariants` toggle
  - When `hasVariants` is set to true:
    - Create a default "Unidad" variant with basePrice
    - Auto-convert existing inventory to variant inventory
  - When `hasVariants` is set to false:
    - Validate no active variants exist (or handle gracefully)
  
  **Recommended Agent Profile:**
  - **Category:** `unspecified-high`
  - **Skills:** `bun-elysia`, `fullstack-backend`
  
  **References:**
  - `packages/backend/src/services/business/product.service.ts`
  
  **Acceptance Criteria:**
  - [ ] Products can be created with hasVariants=true
  - [ ] Toggling hasVariants creates default variant
  - [ ] Inventory migration works
  
  **Commit:** YES

- [ ] **11. Update SaleService (variant handling)**
  
  **What to do:**
  - Update `packages/backend/src/services/business/sale.service.ts`
  - Modify sale creation to accept `variantId` in items
  - When variantId is provided:
    - Get variant price (ignore product basePrice)
    - Calculate subtotal using variant price
    - Denormalize variantName in sale_items
    - Deduct from variant_inventory
  - Validation: If product.hasVariants=true, variantId is required
  - Validation: If product.hasVariants=false, variantId must be null
  
  **Recommended Agent Profile:**
  - **Category:** `deep`
  - **Skills:** `bun-elysia`, `fullstack-backend`
  
  **References:**
  - `packages/backend/src/services/business/sale.service.ts`
  - `packages/backend/src/db/schema/sales.ts` - sale_items structure
  
  **Acceptance Criteria:**
  - [ ] Sales with variants use variant price
  - [ ] Variant inventory deducted correctly
  - [ ] Validation prevents mismatched variant/product
  
  **Commit:** YES

- [ ] **12. Update InventoryService (variant stock)**
  
  **What to do:**
  - Update `packages/backend/src/services/business/inventory.service.ts`
  - Add methods for variant inventory:
    - `getVariantStock(ctx, variantId)`
    - `updateVariantStock(ctx, variantId, quantity)`
    - `adjustVariantStock(ctx, variantId, adjustment)`
  - Ensure atomic updates with sales
  - Handle offline sync for variant inventory
  
  **Recommended Agent Profile:**
  - **Category:** `unspecified-high`
  - **Skills:** `bun-elysia`, `fullstack-backend`
  
  **References:**
  - `packages/backend/src/services/business/inventory.service.ts`
  
  **Acceptance Criteria:**
  - [ ] Variant stock operations work
  - [ ] Integration with sales service
  
  **Commit:** YES

### Wave 3: Frontend - Admin UI

- [ ] **13. ProductVariantManager component**
  
  **What to do:**
  - Create `packages/app/app/components/products/variant-manager.tsx`
  - Component for managing variants within product detail
  - Features:
    - List existing variants (sortable)
    - Add new variant button
    - Edit/delete actions per variant
    - Toggle hasVariants for product
  
  **Recommended Agent Profile:**
  - **Category:** `visual-engineering`
  - **Skills:** `frontend`
  
  **References:**
  - `packages/app/app/components/products/product-form.tsx` - Form patterns
  - `packages/app/app/components/ui/` - UI primitives (Button, Card, Dialog)
  
  **Acceptance Criteria:**
  - [ ] Renders list of variants
  - [ ] Can toggle hasVariants
  - [ ] Integrates with VariantForm for add/edit
  
  **Commit:** YES

- [ ] **14. VariantForm component**
  
  **What to do:**
  - Create `packages/app/app/components/products/variant-form.tsx`
  - Form for creating/editing variants
  - Fields:
    - Name (text, max 50, required)
    - SKU (text, optional)
    - Unit Quantity (number, required)
    - Price (number, required)
    - Active toggle
  - Validation with Zod
  - Submit to API
  
  **Recommended Agent Profile:**
  - **Category:** `visual-engineering`
  - **Skills:** `frontend`
  
  **References:**
  - `packages/app/app/components/products/product-form.tsx`
  - `packages/app/app/lib/schemas.ts` - Validation patterns
  
  **Acceptance Criteria:**
  - [ ] Form validates correctly
  - [ ] Creates/updates variant via API
  - [ ] Shows loading/error states
  
  **QA Scenarios:**
  ```
  Scenario: Create variant
    Tool: Playwright
    Steps:
      1. Navigate to /productos/{id}
      2. Click "Agregar Variante"
      3. Fill: Name="Jaba", Price=22, Quantity=30
      4. Submit
    Expected: Variant appears in list, API called successfully
  ```
  
  **Commit:** YES

- [ ] **15. VariantList component**
  
  **What to do:**
  - Create `packages/app/app/components/products/variant-list.tsx`
  - Display variants in sortable list
  - Features:
    - Drag-drop reordering (or up/down buttons)
    - Show name, SKU, quantity, price
    - Edit/delete actions
    - Active/inactive badge
  
  **Recommended Agent Profile:**
  - **Category:** `visual-engineering`
  - **Skills:** `frontend`
  
  **Acceptance Criteria:**
  - [ ] Renders all variants
  - [ ] Reordering works
  - [ ] Actions functional
  
  **Commit:** YES (group with 13, 14)

- [ ] **16. Update ProductForm (hasVariants toggle)**
  
  **What to do:**
  - Modify `packages/app/app/components/products/product-form.tsx`
  - Add toggle/switch for "Este producto tiene variantes"
  - When toggled on:
    - Show VariantManager
    - Disable basePrice (variants define prices)
  - When toggled off:
    - Hide VariantManager
    - Enable basePrice
  
  **Recommended Agent Profile:**
  - **Category:** `quick`
  - **Skills:** `frontend`
  
  **Acceptance Criteria:**
  - [ ] Toggle works
  - [ ] UI updates correctly
  
  **Commit:** YES

- [ ] **17. Update ProductDetail (variants section)**
  
  **What to do:**
  - Modify `packages/app/app/routes/_protected.productos.$id.tsx`
  - Add section for variants management
  - Show if hasVariants=true
  - Integrate VariantManager component
  
  **Recommended Agent Profile:**
  - **Category:** `quick`
  - **Skills:** `frontend`
  
  **Acceptance Criteria:**
  - [ ] Variants section visible when hasVariants=true
  - [ ] Manager loads variants correctly
  
  **Commit:** YES

- [ ] **18. Product variants hooks**
  
  **What to do:**
  - Create `packages/app/app/hooks/use-product-variants.ts`
  - Implement:
    - `useProductVariants(productId)` - Query hook
    - `useProductVariant(id)` - Single variant
    - `useCreateProductVariant()` - Mutation
    - `useUpdateProductVariant()` - Mutation
    - `useDeleteProductVariant()` - Mutation
    - `useReorderProductVariants()` - Mutation
  - Offline support via TanStack Query + sync queue
  
  **Recommended Agent Profile:**
  - **Category:** `quick`
  - **Skills:** `frontend`
  
  **References:**
  - `packages/app/app/hooks/use-products.ts` - Hook pattern
  - `packages/app/app/lib/db/collections.ts` - Offline pattern
  
  **Acceptance Criteria:**
  - [ ] All hooks working
  - [ ] Offline support implemented
  - [ ] Cache invalidation correct
  
  **Commit:** YES

### Wave 4: Frontend - POS & Sales

- [ ] **19. ProductVariantSelector component**
  
  **What to do:**
  - Create `packages/app/app/components/sales/product-variant-selector.tsx`
  - Two-step selection:
    - Step 1: Show product grid (existing)
    - Step 2: If product.hasVariants, show variant picker
  - Variant picker UI:
    - Show variant name, quantity, price
    - Click to select
    - Back button to product list
  
  **Recommended Agent Profile:**
  - **Category:** `visual-engineering`
  - **Skills:** `frontend`
  
  **References:**
  - `packages/app/app/routes/_protected.ventas.nueva.tsx` - Current POS
  - `packages/app/app/components/products/product-card.tsx` - Card pattern
  
  **Acceptance Criteria:**
  - [ ] Shows variants for products with hasVariants
  - [ ] Selection adds to cart with correct price
  - [ ] Works offline
  
  **QA Scenarios:**
  ```
  Scenario: Two-step selection flow
    Tool: Playwright
    Steps:
      1. Navigate to /ventas/nueva
      2. Click on product "Huevos" (hasVariants=true)
      3. See variant selector with options: Jaba, Docena, Unidad
      4. Click "Jaba 30un - S/ 22.00"
    Expected: Product added to cart as "Huevos - Jaba 30un" with price 22.00
  
  Scenario: Product without variants
    Tool: Playwright
    Steps:
      1. Click product "Pollo Vivo" (hasVariants=false)
    Expected: Product added directly to cart, no variant selector shown
  ```
  
  **Commit:** YES

- [ ] **20. Update SaleCartItem (show variant)**
  
  **What to do:**
  - Modify `packages/app/app/components/sales/sale-cart-item.tsx`
  - Display variant name when present
  - Show format: "{productName} - {variantName}"
  - Update quantity display to show variant quantity
  
  **Recommended Agent Profile:**
  - **Category:** `quick`
  - **Skills:** `frontend`
  
  **Acceptance Criteria:**
  - [ ] Shows variant name in cart
  - [ ] Format correct
  
  **Commit:** YES

- [ ] **21. Update ventas.nueva.tsx (two-step flow)**
  
  **What to do:**
  - Modify `packages/app/app/routes/_protected.ventas.nueva.tsx`
  - Integrate ProductVariantSelector
  - Update state management:
    - Track selected product before variant selection
    - Handle variant selection flow
  - Update cart item type to include variant info
  
  **Recommended Agent Profile:**
  - **Category:** `visual-engineering`
  - **Skills:** `frontend`
  
  **Acceptance Criteria:**
  - [ ] Two-step flow works
  - [ ] Cart includes variant data
  - [ ] Submission includes variantId
  
  **QA Scenarios:**
  ```
  Scenario: Complete sale with variant
    Tool: Playwright
    Steps:
      1. Create sale with 2x Jaba Huevos
      2. Complete sale
      3. Check API call payload
    Expected: Payload includes variantId for each item
  ```
  
  **Commit:** YES

- [ ] **22. Update ChickenCalculator (variant support)**
  
  **What to do:**
  - Modify `packages/app/app/components/calculator/chicken-calculator.tsx`
  - Support variant selection for weight-based products
  - May need to handle variant price vs calculated price
  
  **Recommended Agent Profile:**
  - **Category:** `unspecified-low`
  - **Skills:** `frontend`
  
  **Acceptance Criteria:**
  - [ ] Calculator works with variants
  
  **Commit:** YES

- [ ] **23. Update cart types and logic**
  
  **What to do:**
  - Update cart types in `ventas.nueva.tsx`
  - Include variantId and variantName
  - Update cart operations to handle variants
  - Update localStorage persistence if used
  
  **Recommended Agent Profile:**
  - **Category:** `quick`
  - **Skills:** `frontend`
  
  **Acceptance Criteria:**
  - [ ] Types updated
  - [ ] Cart operations work
  
  **Commit:** YES (group with 21)

- [ ] **24. Offline sync for variants**
  
  **What to do:**
  - Update `packages/app/app/lib/db/collections.ts`
  - Add sync support for product_variants entity
  - Update sync operation types
  - Handle offline variant creation/editing
  - Ensure variants sync before dependent sales
  
  **Recommended Agent Profile:**
  - **Category:** `unspecified-high`
  - **Skills:** `frontend`
  
  **References:**
  - `packages/app/app/lib/db/collections.ts` - Sync pattern
  - `packages/app/app/lib/sync/client.ts` - Sync client
  
  **Acceptance Criteria:**
  - [ ] Variants sync correctly
  - [ ] Offline operations queued
  - [ ] No sync conflicts with sales
  
  **Commit:** YES

### Wave 5: Integration & Testing

- [ ] **25. Migration script for existing data**
  
  **What to do:**
  - Create script to migrate existing products
  - Options:
    - Option A: Keep existing as-is (hasVariants=false)
    - Option B: Create default "Unidad" variant for all
  - Handle existing sales (variantId = null)
  - Document migration process
  
  **Recommended Agent Profile:**
  - **Category:** `unspecified-high`
  - **Skills:** `fullstack-backend`
  
  **Acceptance Criteria:**
  - [ ] Script runs successfully
  - [ ] Data integrity maintained
  - [ ] Rollback possible
  
  **Commit:** YES

- [ ] **26. Update seed data with variants**
  
  **What to do:**
  - Modify `packages/backend/src/seed/data.ts`
  - Add variants for egg products
  - Update seed script to create variants and inventory
  
  **Recommended Agent Profile:**
  - **Category:** `quick`
  - **Skills:** `bun-elysia`
  
  **Acceptance Criteria:**
  - [ ] Seed creates variants
  - [ ] Dev environment has sample variants
  
  **Commit:** YES

- [ ] **27. Integration tests (backend)**
  
  **What to do:**
  - Create test file: `packages/backend/src/tests/product-variant.test.ts`
  - Test scenarios:
    - CRUD operations
    - Max 10 variants limit
    - Unique name validation
    - Sales with variants
    - Inventory deduction
    - Permission checks
  
  **Recommended Agent Profile:**
  - **Category:** `unspecified-high`
  - **Skills:** `bun-elysia`
  
  **References:**
  - Existing test patterns in backend
  
  **Acceptance Criteria:**
  - [ ] Tests pass: `bun test`
  - [ ] Coverage > 80%
  
  **Commit:** YES

- [ ] **28. E2E tests with Playwright**
  
  **What to do:**
  - Create E2E tests:
    - Create product with variants
    - Edit variant
    - Make sale with variant
    - Offline variant creation
  - Use Playwright for browser automation
  
  **Recommended Agent Profile:**
  - **Category:** `unspecified-high`
  - **Skills:** `qamanual`
  
  **Acceptance Criteria:**
  - [ ] E2E tests pass
  - [ ] Screenshots captured
  
  **Commit:** YES

- [ ] **29. Documentation and examples**
  
  **What to do:**
  - Update docs/technical/database.md with new schema
  - Add examples to docs/screens/ if needed
  - Update AGENTS.md files if patterns change
  - Create migration guide
  
  **Recommended Agent Profile:**
  - **Category:** `writing`
  - **Skills:** []
  
  **Acceptance Criteria:**
  - [ ] Documentation updated
  - [ ] Examples provided
  
  **Commit:** YES

### Wave FINAL: Review

- [ ] **F1. Plan compliance audit**
  **Recommended Agent Profile:** `oracle`
  
  Verify all requirements from plan are implemented.

- [ ] **F2. Code quality review**
  **Recommended Agent Profile:** `unspecified-high`
  
  Review for TypeScript errors, lint issues, code smells.

- [ ] **F3. Manual QA testing**
  **Recommended Agent Profile:** `qamanual`
  
  Test all user flows manually.

- [ ] **F4. Performance check**
  **Recommended Agent Profile:** `deep`
  
  Check query performance, bundle size, load times.

---

## Guardrails & Constraints

### Límites Hardcoded
```typescript
const VARIANTS_CONSTRAINTS = {
  maxPerProduct: 10,
  maxNameLength: 50,
  maxSkuLength: 50,
  maxPrice: 9999.99,
  minUnitQuantity: 0.001,
  maxUnitQuantity: 9999.999,
};
```

### Reglas de Negocio
1. **Nombre único por producto:** No puede haber dos variantes "Jaba" para el mismo producto
2. **Max 10 variantes:** Prevenir UI overflow y problemas de performance
3. **Solo admin crea variantes:** Vendedores pueden vender pero no crear/editar
4. **Precio requerido:** Cada variante debe tener precio explícito
5. **Soft delete:** Variantes se marcan inactivas, no se eliminan físicamente (para historial)

### Anti-Patrones a Evitar
- ❌ No agregar atributos dinámicos (color, tamaño) - MVP solo
- ❌ No crear bundles de variantes
- ❌ No agregar imágenes por variante
- ❌ No hacer variantes de variantes (multi-nivel)
- ❌ No templates compartidos entre productos
- ❌ No historial de precios por variante (post-MVP)

---

## Commit Strategy

| Wave | Message | Files |
|------|---------|-------|
| 1 | `feat(db): add product_variants and variant_inventory tables` | Migrations, schema files |
| 2 | `feat(api): add product variant CRUD endpoints` | Repository, service, controller |
| 3 | `feat(ui): add product variant management UI` | Admin components, hooks |
| 4 | `feat(pos): integrate variants in sales flow` | POS components, cart |
| 5 | `feat(test): add tests and documentation` | Tests, docs, seed data |

---

## Success Criteria

### Funcionales
- [ ] Admin puede crear/editar/eliminar variantes para cualquier producto
- [ ] Vendedor ve selector de variantes en flujo de ventas
- [ ] Precio por variante se usa correctamente en ventas
- [ ] Inventario se decrementa por variante vendida
- [ ] Funciona completamente offline
- [ ] Sincronización correcta cuando vuelve online

### Técnicos
- [ ] TypeScript compila sin errores
- [ ] Tests pasan (bun test)
- [ ] E2E tests pasan (playwright)
- [ ] Linting limpio
- [ ] Migraciones aplican correctamente
- [ ] Datos existentes preservados

### QA Verificación
```bash
# Backend tests
bun run test

# Frontend typecheck
cd packages/app && bun run typecheck

# E2E tests
cd packages/app && bun run test:e2e

# Manual verification checklist
# - [ ] Crear producto con variantes
# - [ ] Editar variante
# - [ ] Vender con variante
# - [ ] Verificar inventario
# - [ ] Probar offline
# - [ ] Verificar sincronización
```

---

## Notas de Implementación

### Patrones a Seguir

**Backend (Repository Pattern):**
```typescript
// Similar a product.repository.ts
async findByProductId(ctx: RequestContext, productId: string): Promise<ProductVariant[]> {
  return ctx.db.query.productVariants.findMany({
    where: and(
      eq(productVariants.productId, productId),
      eq(products.businessId, ctx.businessId)  // Multi-tenancy
    ),
    orderBy: [asc(productVariants.sortOrder)],
  });
}
```

**Frontend (TanStack Query Pattern):**
```typescript
// Similar a use-products.ts
export function useProductVariants(productId: string) {
  return useQuery({
    queryKey: ["products", productId, "variants"],
    queryFn: () => loadProductVariants(productId),
    enabled: !!productId,
  });
}
```

**Offline-First (Collection Pattern):**
```typescript
// Similar a collections.ts
export async function createProductVariant(productId: string, data: CreateVariantInput) {
  if (!isOnline()) {
    await syncClient.enqueueOperation({
      entity: "product_variants",
      operation: "insert",
      data: { productId, ...data },
    });
    return optimisticVariant;
  }
  // API call...
}
```

---

## Riesgos y Mitigaciones

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|--------------|---------|------------|
| Sync conflicts offline | Media | Alto | Soft delete, versionado simple |
| Performance con muchas variantes | Baja | Medio | Límite 10 variantes, indexes |
| Complejidad UI en móvil | Media | Medio | Dos pasos claros, back button |
| Migración datos existentes | Baja | Alto | Script probado, backup DB |
| Offline variant creation duplicada | Baja | Medio | Unique constraint (product_id, name) |

---

## Post-MVP Mejoras Futuras

1. **Conversión automática de inventario** - Base stock ↔ variant stock
2. **Historial de precios** - Track changes en precios de variantes
3. **Barcodes por variante** - Escanear código de barras de cada presentación
4. **Imágenes por variante** - Foto de la jaba, docena, etc.
5. **Descuentos por volumen** - 2 jabas = 5% off
6. **Variant templates** - Definir "packaging types" reutilizables
7. **Analytics por variante** - Cuál presentación vende más

---

## Conclusión

Este plan implementa un sistema completo de variantes de productos con:
- ✅ Soporte para cualquier producto
- ✅ Precios independientes por variante
- ✅ Inventario separado por variante
- ✅ Full offline-first
- ✅ Flujo de ventas en dos pasos
- ✅ Validaciones y límites
- ✅ Tests completos

**Tiempo estimado:** 3-4 días de desarrollo (con waves paralelos)
**Complejidad:** Media-Alta (cambios en múltiples capas)
**Riesgo:** Medio (manejo offline requiere cuidado)

¿Listo para proceder? Ejecuta `/start-work` para comenzar la implementación.
