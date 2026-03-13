# Tarea 1: Schema PGlite y Tablas Base

> **Dependencia:** Tarea 0 (Framework Sync)  
> **Duración:** 2-3 días  
> **Archivos:** `app/engine/db.ts`, `app/engine/schema.ts`

---

## Objetivo

Crear todas las tablas necesarias en PGlite con campos de sincronización, siguiendo el framework definido en Tarea 0.

---

## Tablas a Crear

### 1.1 sync_operations (WAL - Write Ahead Log)

**Prioridad:** CRÍTICA - Debe existir antes que cualquier otra tabla

```sql
CREATE TABLE IF NOT EXISTS sync_operations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  sync_group_id UUID NOT NULL,
  operation TEXT NOT NULL CHECK (operation IN ('create', 'update', 'delete')),
  payload JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'syncing', 'synced', 'error', 'conflict')),
  version INTEGER NOT NULL DEFAULT 1,
  attempt_count INTEGER DEFAULT 0,
  last_error TEXT,
  last_attempt_at TIMESTAMP,
  idempotency_key TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_sync_ops_status ON sync_operations(status);
CREATE INDEX idx_sync_ops_group ON sync_operations(sync_group_id);
CREATE INDEX idx_sync_ops_entity ON sync_operations(entity_type, entity_id);
CREATE INDEX idx_sync_ops_pending ON sync_operations(status, attempt_count) 
  WHERE status = 'pending' OR status = 'error';
```

### 1.2 Tablas de Negocio (con campos de sync)

Todas estas tablas necesitan campos adicionales para el framework de sync:

```sql
-- Template de campos sync para cada tabla:
sync_status TEXT NOT NULL DEFAULT 'local' CHECK (sync_status IN ('local', 'pending', 'syncing', 'synced', 'error', 'conflict')),
sync_version INTEGER NOT NULL DEFAULT 1,
last_synced_at TIMESTAMP,
sync_error TEXT,
```

#### customers

```sql
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL,
  name VARCHAR(255) NOT NULL,
  dni VARCHAR(20),
  phone VARCHAR(50),
  address TEXT,
  notes TEXT,
  
  -- Sync fields
  sync_status TEXT NOT NULL DEFAULT 'local',
  sync_version INTEGER NOT NULL DEFAULT 1,
  last_synced_at TIMESTAMP,
  sync_error TEXT,
  
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_customers_business ON customers(business_id);
CREATE INDEX idx_customers_sync ON customers(sync_status);
```

#### sales + sale_items

```sql
CREATE TABLE IF NOT EXISTS sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL,
  customer_id UUID,
  seller_id UUID NOT NULL,
  total_amount DECIMAL(12,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  
  -- Campos de negocio...
  type TEXT DEFAULT 'instant_sale',
  sale_type TEXT DEFAULT 'contado',
  
  -- Sync fields
  sync_status TEXT NOT NULL DEFAULT 'local',
  sync_version INTEGER NOT NULL DEFAULT 1,
  last_synced_at TIMESTAMP,
  sync_error TEXT,
  
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sale_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id UUID NOT NULL,
  product_id UUID NOT NULL,
  quantity DECIMAL(10,3) NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL,
  subtotal DECIMAL(12,2) NOT NULL,
  
  -- Sync fields
  sync_status TEXT NOT NULL DEFAULT 'local',
  sync_version INTEGER NOT NULL DEFAULT 1,
  last_synced_at TIMESTAMP,
  sync_error TEXT,
  
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_sales_business ON sales(business_id);
CREATE INDEX idx_sales_status ON sales(sync_status);
CREATE INDEX idx_sale_items_sale ON sale_items(sale_id);
```

#### purchases + purchase_items

```sql
CREATE TABLE IF NOT EXISTS purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL,
  supplier_id UUID NOT NULL,
  total_amount DECIMAL(12,2) NOT NULL,
  status TEXT DEFAULT 'pending',
  
  -- Sync fields
  sync_status TEXT NOT NULL DEFAULT 'local',
  sync_version INTEGER NOT NULL DEFAULT 1,
  last_synced_at TIMESTAMP,
  sync_error TEXT,
  
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS purchase_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_id UUID NOT NULL,
  product_id UUID NOT NULL,
  quantity DECIMAL(10,3) NOT NULL,
  unit_cost DECIMAL(10,2) NOT NULL,
  
  -- Sync fields
  sync_status TEXT NOT NULL DEFAULT 'local',
  sync_version INTEGER NOT NULL DEFAULT 1,
  
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_purchases_business ON purchases(business_id);
CREATE INDEX idx_purchase_items_purchase ON purchase_items(purchase_id);
```

#### products + product_variants

```sql
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL,
  name VARCHAR(255) NOT NULL,
  type TEXT DEFAULT 'pollo',
  base_price DECIMAL(10,2) NOT NULL,
  
  -- Sync fields
  sync_status TEXT NOT NULL DEFAULT 'local',
  sync_version INTEGER NOT NULL DEFAULT 1,
  last_synced_at TIMESTAMP,
  
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS product_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL,
  name VARCHAR(50) NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  
  -- Sync fields
  sync_status TEXT NOT NULL DEFAULT 'local',
  sync_version INTEGER NOT NULL DEFAULT 1,
  
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_products_business ON products(business_id);
CREATE INDEX idx_variants_product ON product_variants(product_id);
```

#### distribuciones + distribucion_items

```sql
CREATE TABLE IF NOT EXISTS distribuciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL,
  vendedor_id UUID NOT NULL,
  punto_venta VARCHAR(100) NOT NULL,
  kilos_asignados DECIMAL(10,3) NOT NULL,
  estado TEXT DEFAULT 'activo',
  
  -- Sync fields
  sync_status TEXT NOT NULL DEFAULT 'local',
  sync_version INTEGER NOT NULL DEFAULT 1,
  
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS distribucion_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  distribucion_id UUID NOT NULL,
  variant_id UUID NOT NULL,
  cantidad_asignada DECIMAL(10,3) NOT NULL,
  
  -- Sync fields
  sync_status TEXT NOT NULL DEFAULT 'local',
  sync_version INTEGER NOT NULL DEFAULT 1,
  
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_distribuciones_business ON distribuciones(business_id);
```

#### closings

```sql
CREATE TABLE IF NOT EXISTS closings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL,
  seller_id UUID NOT NULL,
  closing_date DATE NOT NULL,
  total_sales DECIMAL(12,2) NOT NULL DEFAULT '0',
  total_payments DECIMAL(12,2) NOT NULL DEFAULT '0',
  
  -- Sync fields
  sync_status TEXT NOT NULL DEFAULT 'local',
  sync_version INTEGER NOT NULL DEFAULT 1,
  
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_closings_business ON closings(business_id);
```

#### tags + customer_tags

```sql
CREATE TABLE IF NOT EXISTS tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL,
  name VARCHAR(100) NOT NULL,
  color VARCHAR(7) DEFAULT '#f97316',
  
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS customer_tags (
  customer_id UUID NOT NULL,
  tag_id UUID NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (customer_id, tag_id)
);

CREATE INDEX idx_tags_business ON tags(business_id);
```

---

## Checklist

- [ ] Crear función `createTables()` en `engine/db.ts`
- [ ] Tabla `sync_operations` con todos los índices
- [ ] Tablas de negocio con campos sync
- [ ] Verificar PGlite inicia sin errores
- [ ] Verificar todas las tablas aparecen en IndexedDB
- [ ] Documentar schema en comentarios

---

## Notas

- **Orden importa:** Crear `sync_operations` primero, luego tablas de negocio
- **IF NOT EXISTS:** Todas las tablas deben usar `IF NOT EXISTS` para evitar errores en hot reload
- **Índices:** Crear índices en campos de búsqueda frecuente (business_id, sync_status)

---

*Depende de: Tarea 0*  
*Bloquea: Tarea 2 (SyncService)*
