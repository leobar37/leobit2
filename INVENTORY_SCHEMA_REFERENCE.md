# Avileo Inventory Schema Reference

**Location:** `packages/backend/src/db/schema/`

## Overview

The Avileo inventory system consists of three primary tables working together to manage product inventory, stock tracking, and daily distributions to vendors.

---

## 1. Products Table

**File:** `inventory.ts`  
**SQL Name:** `products`

### Purpose
Core product catalog for the business. Each business manages its own products with base pricing.

### Columns

| Column | Type | Constraints | Description |
|--------|------|-----------|-------------|
| `id` | UUID | PRIMARY KEY, auto-generated | Unique product identifier |
| `name` | VARCHAR(255) | NOT NULL | Product name (e.g., "Pollo Entero") |
| `type` | ENUM | NOT NULL, default: `pollo` | Product type: `pollo`, `huevo`, `otro` |
| `unit` | ENUM | NOT NULL, default: `kg` | Unit of measurement: `kg`, `unidad` |
| `basePrice` | DECIMAL(10,2) | NOT NULL | Base selling price |
| `isActive` | BOOLEAN | NOT NULL, default: true | Soft-delete flag |
| `createdAt` | TIMESTAMP | NOT NULL, default: NOW() | Record creation time |

### Indexes
- `idx_products_type` on `type`
- `idx_products_is_active` on `isActive`

### Relations
- **One-to-Many:** `inventory` (1 product → many inventory records)
- **One-to-Many:** `saleItems` (1 product → many sale line items)

### Type Exports
```typescript
type Product = typeof products.$inferSelect;
type NewProduct = typeof products.$inferInsert;
```

---

## 2. Inventory Table

**File:** `inventory.ts`  
**SQL Name:** `inventory`

### Purpose
Tracks the current stock quantity for each product. This is the **master inventory** used to deduct stock when sales occur.

### Columns

| Column | Type | Constraints | Description |
|--------|------|-----------|-------------|
| `id` | UUID | PRIMARY KEY, auto-generated | Unique inventory record ID |
| `productId` | UUID | NOT NULL, FK → products.id | Link to product definition |
| `quantity` | DECIMAL(10,3) | NOT NULL, default: 0 | Current stock (supports decimals for kg) |
| `updatedAt` | TIMESTAMP | NOT NULL, default: NOW() | Last update time |

### Indexes
- `idx_inventory_product_id` on `productId`

### Relations
- **Many-to-One:** `products` (required relation to product)

### Key Characteristics
- **Precision:** DECIMAL(10,3) allows 3 decimal places (for kg fractions)
- **No multi-tenancy:** Inventory is global; businesses don't have separate inventories
- **Update-only:** Typically updated via triggers or service methods when sales occur

### Type Exports
```typescript
type Inventory = typeof inventory.$inferSelect;
type NewInventory = typeof inventory.$inferInsert;
```

---

## 3. Distribuciones Table

**File:** `inventory.ts`  
**SQL Name:** `distribuciones`

### Purpose
Represents daily stock allocation to vendors (sellers) at specific sales points. Tracks assigned vs. sold kilos and collected amounts.

### Columns

| Column | Type | Constraints | Description |
|--------|------|-----------|-------------|
| `id` | UUID | PRIMARY KEY, auto-generated | Unique distribution record |
| `businessId` | UUID | NOT NULL, FK → businesses.id | Associated business |
| `vendedorId` | UUID | NOT NULL, FK → businessUsers.id | Vendor/seller receiving distribution |
| `puntoVenta` | VARCHAR(100) | NOT NULL | Sales point name (e.g., "Carro A", "Casa") |
| `kilosAsignados` | DECIMAL(10,3) | NOT NULL | Kilos assigned to vendor |
| `kilosVendidos` | DECIMAL(10,3) | NOT NULL, default: 0 | Kilos actually sold |
| `montoRecaudado` | DECIMAL(12,2) | NOT NULL, default: 0 | Amount collected from sales |
| `fecha` | DATE | NOT NULL | Distribution date |
| `estado` | ENUM | NOT NULL, default: `activo` | Status: `activo`, `cerrado`, `en_ruta` |
| `syncStatus` | ENUM | NOT NULL, default: `pending` | Sync state: `pending`, `synced`, `error` |
| `syncAttempts` | INTEGER | NOT NULL, default: 0 | Number of sync retry attempts |
| `createdAt` | TIMESTAMP | NOT NULL, default: NOW() | Record creation time |

### Indexes
- `idx_distribuciones_business_id` on `businessId`
- `idx_distribuciones_vendedor_id` on `vendedorId`
- `idx_distribuciones_fecha` on `fecha`
- `idx_distribuciones_estado` on `estado`
- `idx_distribuciones_sync_status` on `syncStatus`
- `idx_distribuciones_vendedor_fecha` on `(vendedorId, fecha)` – composite for daily vendor lookups

### Relations
- **Many-to-One:** `businesses` (required)
- **Many-to-One:** `businessUsers` (vendor/seller)
- **One-to-Many:** `sales` (distribution can have multiple sales)

### Key Characteristics
- **Offline-first:** `syncStatus` and `syncAttempts` for offline sync
- **Multi-tenancy:** Filtered by `businessId`
- **Composable:** Each distribution can link to multiple sales via `sales.distribucionId`

### Type Exports
```typescript
type Distribucion = typeof distribuciones.$inferSelect;
type NewDistribucion = typeof distribuciones.$inferInsert;
```

---

## 4. Sales Integration (Related)

**File:** `sales.ts`

### How Sales Connects to Inventory

The `sales` table links to inventory through:

| Column in Sales | References | Purpose |
|-----------------|-----------|---------|
| `saleItems[]` | `products.id` | Each sale line item references a product |
| `distribucionId` (optional) | `distribuciones.id` | Sale can optionally link to a distribution |

### Sale Items Detail

```typescript
export const saleItems = pgTable("sale_items", {
  id: uuid("id").primaryKey(),
  saleId: uuid("sale_id").notNull().references(() => sales.id),
  productId: uuid("product_id").notNull().references(() => products.id),
  productName: varchar("product_name"), // denormalized for offline
  quantity: decimal("quantity", { precision: 10, scale: 3 }),
  unitPrice: decimal("unit_price", { precision: 10, scale: 2 }),
  subtotal: decimal("subtotal", { precision: 12, scale: 2 }),
});
```

---

## 5. Enums Reference

**File:** `enums.ts`

### Product Type Enum
```typescript
export const productTypeEnum = pgEnum("product_type", [
  "pollo",   // Chicken
  "huevo",   // Eggs
  "otro"     // Other
]);
```

### Product Unit Enum
```typescript
export const productUnitEnum = pgEnum("product_unit", [
  "kg",      // Kilograms
  "unidad"   // Units (individual items)
]);
```

### Distribution Status Enum
```typescript
export const distribucionStatusEnum = pgEnum("distribucion_status", [
  "activo",   // Active
  "cerrado",  // Closed
  "en_ruta"   // In transit
]);
```

### Sync Status Enum (Used Across Tables)
```typescript
export const syncStatusEnum = pgEnum("sync_status", [
  "pending",  // Not yet synced to server
  "synced",   // Successfully synced
  "error"     // Sync failed
]);
```

---

## 6. Entity Relationships Diagram

```
┌─────────────┐
│  Businesses │
└──────┬──────┘
       │
       ├─────────────┬────────────────────┬─────────────────────┐
       │             │                    │                     │
       ▼             ▼                    ▼                     ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌─────────────────┐
│Business Users│ │ Distribuciones (daily allocations to vendors)   │
└──────────────┘ └──────┬───────┘ │business_id (FK)         │
       ▲                │         │vendedor_id (FK)→┐       │
       │                │         │kilosAsignados   │       │
       └────────────────┤         │estado, syncStatus       │
                        │         └────────────┬────────────┘
                        │                      │
                        │ distribucion_id      │ salesRelations
                        └──────────────────────┼─────────┐
                                               │         │
                                        ┌──────▼──────┐  ▼
                                        │    Sales    │◄─┘
                                        └──────┬──────┘
                                               │
                                        ┌──────▼──────────┐
                                        │   Sale Items    │
                                        └──────┬──────────┘
                                               │
                                        product_id (FK)
                                               │
                                        ┌──────▼──────────┐
                                        │    Products     │◄─┐
                                        └──────┬──────────┘  │
                                               │             │
                                        ┌──────▼──────────┐  │
                                        │  Inventory      │──┘
                                        │(stock tracking) │
                                        └─────────────────┘
```

---

## 7. Data Flow: Stock Management

### Creating a Sale (Offline-first)

1. **Create Sale Record**
   ```typescript
   // User creates sale on offline app
   const sale = {
     businessId: "xxx",
     sellerId: "yyy",
     distribucionId: "zzz", // optional
     saleItems: [
       { productId: "prod1", quantity: 5, unitPrice: 50 }
     ],
     syncStatus: "pending"
   };
   ```

2. **Add Sale Items** linking to `products.id`

3. **Mark for Sync** when online (`syncStatus: "pending"`)

4. **Server Reconciliation** (when synced)
   - Reduce `inventory.quantity` for each sold product
   - Update `distribuciones.kilosVendidos` and `montoRecaudado`
   - Mark sale as `synced`

### Daily Distribution Flow

1. **Admin assigns stock to vendor**
   ```typescript
   const distribucion = {
     businessId: "xxx",
     vendedorId: "yyy",
     puntoVenta: "Carro A",
     kilosAsignados: 50,
     fecha: today(),
     estado: "activo"
   };
   ```

2. **Vendor receives stock** (local IndexedDB)

3. **Vendor makes sales** (linked via `distribucionId`)

4. **Reconciliation on sync:**
   - `kilosVendidos` updated from linked sales
   - `montoRecaudado` calculated from sales amounts

---

## 8. Usage Examples

### Find Product Inventory
```typescript
const inventoryWithProduct = await db
  .select()
  .from(inventory)
  .where(eq(inventory.productId, productId))
  .leftJoin(products, eq(inventory.productId, products.id));
```

### Today's Distribution for Vendor
```typescript
const todaysDistribution = await db
  .select()
  .from(distribuciones)
  .where(
    and(
      eq(distribuciones.vendedorId, vendorId),
      eq(distribuciones.businessId, businessId),
      eq(distribuciones.fecha, today())
    )
  );
```

### Sales for a Distribution
```typescript
const distributionSales = await db
  .select()
  .from(sales)
  .leftJoin(saleItems, eq(sales.id, saleItems.saleId))
  .where(eq(sales.distribucionId, distribucionId));
```

### Pending Sync Items (Offline-first)
```typescript
const pendingDistribuciones = await db
  .select()
  .from(distribuciones)
  .where(eq(distribuciones.syncStatus, "pending"));
```

---

## 9. Key Design Patterns

| Pattern | Implementation |
|---------|-----------------|
| **Offline-first** | `syncStatus` + `syncAttempts` on `distribuciones` and `sales` |
| **Multi-tenancy** | `businessId` on `distribuciones`, `sales` |
| **Denormalization** | `productName` on `saleItems` for offline availability |
| **Soft delete** | `isActive` on `products` |
| **Precision** | DECIMAL(10,3) for weight, DECIMAL(12,2) for amounts |
| **Composite keys** | `(vendedorId, fecha)` for efficient daily lookups |

---

## 10. Migration & Setup

**Generate migration:**
```bash
cd packages/backend
bun run db:generate
```

**Push schema:**
```bash
bun run db:push
```

**Run migrations:**
```bash
bun run db:migrate
```

---

## Notes

- All timestamps use UTC (PostgreSQL default)
- GUIDs are auto-generated using `defaultRandom()`
- Indexes optimized for common query patterns (business, vendor, date filtering)
- `inventory` table has no business_id: inventory is shared across all businesses in a region
- Each business can have different `basePrice` for products via `sales` items
