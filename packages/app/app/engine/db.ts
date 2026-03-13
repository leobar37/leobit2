import { drizzle } from "drizzle-orm/pglite";
import * as schema from "./schema";

let pg: import("@electric-sql/pglite").PGlite | null = null;
let db: ReturnType<typeof drizzle> | null = null;
let initPromise: Promise<{ pg: import("@electric-sql/pglite").PGlite; db: ReturnType<typeof drizzle> }> | null = null;

export async function initDatabase(): Promise<{
  pg: import("@electric-sql/pglite").PGlite;
  db: ReturnType<typeof drizzle>;
}> {
  if (pg && db) {
    return { pg, db };
  }

  if (initPromise) {
    return initPromise;
  }

  initPromise = (async () => {
    const [{ PGlite }, { electricSync }] = await Promise.all([
      import("@electric-sql/pglite"),
      import("@electric-sql/pglite-sync"),
    ]);

    let pgInstance: import("@electric-sql/pglite").PGlite;

    // Try to create a fresh database to avoid schema mismatch issues
    try {
      // Try to use existing database first
      pgInstance = await PGlite.create({
        dataDir: "idb://avileo-pg",
        extensions: {
          electric: electricSync(),
        },
      });

      // Test if we can query - if not, reset
      await pgInstance.query("SELECT 1");
    } catch (err) {
      console.warn("[DB] Existing DB has issues, resetting...", err);
      try {
        const request = indexedDB.deleteDatabase("avileo-pg");
        await new Promise<void>((resolve, reject) => {
          request.onsuccess = () => resolve();
          request.onerror = () => reject(request.error);
        });
      } catch (e) {
        // Ignore delete errors
      }

      // Create fresh database
      pgInstance = await PGlite.create({
        dataDir: "idb://avileo-pg",
        extensions: {
          electric: electricSync(),
        },
      });
    }

    // Create tables (CREATE TABLE IF NOT EXISTS will not fail if tables exist)
    await createTables(pgInstance);

    // Initialize Drizzle AFTER tables are created
    const dbInstance = drizzle(pgInstance, { schema });

    pg = pgInstance;
    db = dbInstance;

    return { pg: pgInstance, db: dbInstance };
  })();

  return initPromise;
}

export function getDatabase(): {
  pg: import("@electric-sql/pglite").PGlite;
  db: ReturnType<typeof drizzle>;
} {
  if (!pg || !db) {
    throw new Error("Database not initialized. Call initDatabase() first.");
  }
  return { pg, db };
}

async function createTables(pg: import("@electric-sql/pglite").PGlite): Promise<void> {
  await pg.exec(`
    CREATE TABLE IF NOT EXISTS customers (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(255) NOT NULL,
      dni VARCHAR(20),
      phone VARCHAR(50),
      address TEXT,
      notes TEXT,
      sync_status TEXT NOT NULL DEFAULT 'pending',
      sync_attempts INTEGER NOT NULL DEFAULT 0,
      sync_version INTEGER NOT NULL DEFAULT 1,
      business_id UUID NOT NULL,
      created_by UUID,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name);
    CREATE INDEX IF NOT EXISTS idx_customers_business_id ON customers(business_id);
    CREATE INDEX IF NOT EXISTS idx_customers_sync_status ON customers(sync_status);
  `);

  await pg.exec(`
    CREATE TABLE IF NOT EXISTS sales (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      business_id UUID NOT NULL,
      customer_id UUID,
      seller_id UUID NOT NULL,
      distribucion_id UUID,
      type TEXT NOT NULL DEFAULT 'instant_sale',
      sale_type TEXT NOT NULL DEFAULT 'contado',
      payment_mode TEXT,
      total_amount DECIMAL(12,2) NOT NULL,
      amount_paid DECIMAL(12,2) NOT NULL DEFAULT '0',
      balance_due DECIMAL(12,2) NOT NULL DEFAULT '0',
      tara DECIMAL(10,3) DEFAULT '0',
      net_weight DECIMAL(10,3),
      sale_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      delivery_date DATE,
      order_date DATE,
      status TEXT NOT NULL DEFAULT 'draft',
      version INTEGER NOT NULL DEFAULT 1,
      confirmed_snapshot JSONB,
      delivered_snapshot JSONB,
      allow_customer_edit BOOLEAN NOT NULL DEFAULT true,
      sync_status TEXT NOT NULL DEFAULT 'pending',
      sync_attempts INTEGER NOT NULL DEFAULT 0,
      cancelled_at TIMESTAMP,
      cancelled_by UUID,
      cancel_reason TEXT,
      refund_amount DECIMAL(12,2),
      refund_date TIMESTAMP,
      refund_method TEXT,
      refund_reference VARCHAR(100),
      refund_notes TEXT,
      advance_payment_method VARCHAR(20),
      advance_reference_number VARCHAR(50),
      advance_proof_image_id UUID,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_sales_business_id ON sales(business_id);
    CREATE INDEX IF NOT EXISTS idx_sales_customer_id ON sales(customer_id);
    CREATE INDEX IF NOT EXISTS idx_sales_seller_id ON sales(seller_id);
    CREATE INDEX IF NOT EXISTS idx_sales_sync_status ON sales(sync_status);
    CREATE INDEX IF NOT EXISTS idx_sales_status ON sales(status);
    CREATE INDEX IF NOT EXISTS idx_sales_sale_date ON sales(sale_date);
  `);

  await pg.exec(`
    CREATE TABLE IF NOT EXISTS sale_items (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      sale_id UUID NOT NULL,
      product_id UUID NOT NULL,
      variant_id UUID NOT NULL,
      business_id UUID NOT NULL,
      product_name VARCHAR(255) NOT NULL,
      variant_name VARCHAR(50) NOT NULL,
      quantity DECIMAL(10,3),
      ordered_quantity DECIMAL(10,3),
      delivered_quantity DECIMAL(10,3),
      unit_price DECIMAL(10,2),
      unit_price_quoted DECIMAL(10,2),
      unit_price_final DECIMAL(10,2),
      subtotal DECIMAL(12,2) NOT NULL,
      is_modified BOOLEAN NOT NULL DEFAULT false,
      original_quantity DECIMAL(10,3)
    );
    CREATE INDEX IF NOT EXISTS idx_sale_items_sale_id ON sale_items(sale_id);
    CREATE INDEX IF NOT EXISTS idx_sale_items_product_id ON sale_items(product_id);
    CREATE INDEX IF NOT EXISTS idx_sale_items_business_id ON sale_items(business_id);
  `);

  await pg.exec(`
    CREATE TABLE IF NOT EXISTS abonos (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      customer_id UUID NOT NULL,
      seller_id UUID NOT NULL,
      business_id UUID NOT NULL,
      related_sale_id UUID,
      amount DECIMAL(12,2) NOT NULL,
      payment_method TEXT NOT NULL DEFAULT 'efectivo',
      reference_number VARCHAR(50),
      proof_image_id UUID,
      notes TEXT,
      sync_status TEXT NOT NULL DEFAULT 'pending',
      sync_attempts INTEGER NOT NULL DEFAULT 0,
      sync_version INTEGER NOT NULL DEFAULT 1,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_abonos_customer_id ON abonos(customer_id);
    CREATE INDEX IF NOT EXISTS idx_abonos_business_id ON abonos(business_id);
    CREATE INDEX IF NOT EXISTS idx_abonos_sync_status ON abonos(sync_status);
  `);

  await pg.exec(`
    CREATE TABLE IF NOT EXISTS products (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      business_id UUID NOT NULL,
      name VARCHAR(255) NOT NULL,
      type TEXT NOT NULL DEFAULT 'pollo',
      unit TEXT NOT NULL DEFAULT 'kg',
      base_price DECIMAL(10,2) NOT NULL,
      is_active BOOLEAN NOT NULL DEFAULT true,
      has_variants BOOLEAN NOT NULL DEFAULT false,
      image_id UUID,
      sync_status TEXT NOT NULL DEFAULT 'pending',
      sync_attempts INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_products_business_id ON products(business_id);
    CREATE INDEX IF NOT EXISTS idx_products_type ON products(type);
    CREATE INDEX IF NOT EXISTS idx_products_sync_status ON products(sync_status);
  `);

  await pg.exec(`
    CREATE TABLE IF NOT EXISTS product_variants (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      product_id UUID NOT NULL,
      business_id UUID NOT NULL,
      name VARCHAR(50) NOT NULL,
      sku VARCHAR(50),
      unit_quantity DECIMAL(10,3) NOT NULL,
      price DECIMAL(10,2) NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0,
      is_active BOOLEAN NOT NULL DEFAULT true,
      sync_status TEXT NOT NULL DEFAULT 'pending',
      sync_attempts INTEGER NOT NULL DEFAULT 0,
      sync_version INTEGER NOT NULL DEFAULT 1,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_product_variants_product_id ON product_variants(product_id);
    CREATE INDEX IF NOT EXISTS idx_product_variants_business_id ON product_variants(business_id);
  `);

  await pg.exec(`
    CREATE TABLE IF NOT EXISTS suppliers (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      business_id UUID NOT NULL,
      name VARCHAR(255) NOT NULL,
      type TEXT NOT NULL DEFAULT 'generic',
      ruc VARCHAR(20),
      address TEXT,
      phone VARCHAR(50),
      email VARCHAR(255),
      notes TEXT,
      is_active BOOLEAN NOT NULL DEFAULT true,
      sync_status TEXT NOT NULL DEFAULT 'pending',
      sync_attempts INTEGER NOT NULL DEFAULT 0,
      sync_version INTEGER NOT NULL DEFAULT 1,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_suppliers_business_id ON suppliers(business_id);
    CREATE INDEX IF NOT EXISTS idx_suppliers_sync_status ON suppliers(sync_status);
  `);

  await pg.exec(`
    CREATE TABLE IF NOT EXISTS purchases (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      business_id UUID NOT NULL,
      supplier_id UUID NOT NULL,
      purchase_date DATE NOT NULL,
      total_amount DECIMAL(12,2) NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      invoice_number VARCHAR(50),
      receipt_image_id UUID,
      notes TEXT,
      sync_status TEXT NOT NULL DEFAULT 'pending',
      sync_attempts INTEGER NOT NULL DEFAULT 0,
      sync_version INTEGER NOT NULL DEFAULT 1,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_purchases_business_id ON purchases(business_id);
    CREATE INDEX IF NOT EXISTS idx_purchases_supplier_id ON purchases(supplier_id);
    CREATE INDEX IF NOT EXISTS idx_purchases_sync_status ON purchases(sync_status);
  `);

  await pg.exec(`
    CREATE TABLE IF NOT EXISTS purchase_items (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      purchase_id UUID NOT NULL,
      product_id UUID NOT NULL,
      variant_id UUID,
      unit_id UUID,
      quantity DECIMAL(10,3) NOT NULL,
      unit_cost DECIMAL(10,2) NOT NULL,
      total_cost DECIMAL(12,2) NOT NULL,
      sync_status TEXT NOT NULL DEFAULT 'pending',
      sync_attempts INTEGER NOT NULL DEFAULT 0,
      sync_version INTEGER NOT NULL DEFAULT 1,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_purchase_items_purchase_id ON purchase_items(purchase_id);
  `);

  await pg.exec(`
    CREATE TABLE IF NOT EXISTS distribuciones (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      business_id UUID NOT NULL,
      vendedor_id UUID NOT NULL,
      punto_venta VARCHAR(100) NOT NULL,
      kilos_asignados DECIMAL(10,3) NOT NULL,
      kilos_vendidos DECIMAL(10,3) NOT NULL DEFAULT '0',
      monto_recaudado DECIMAL(12,2) NOT NULL DEFAULT '0',
      fecha DATE NOT NULL,
      estado TEXT NOT NULL DEFAULT 'activo',
      modo TEXT NOT NULL DEFAULT 'estricto',
      confiar_en_vendedor BOOLEAN NOT NULL DEFAULT false,
      peso_confirmado BOOLEAN NOT NULL DEFAULT true,
      sync_status TEXT NOT NULL DEFAULT 'pending',
      sync_attempts INTEGER NOT NULL DEFAULT 0,
      sync_version INTEGER NOT NULL DEFAULT 1,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_distribuciones_business_id ON distribuciones(business_id);
    CREATE INDEX IF NOT EXISTS idx_distribuciones_vendedor_id ON distribuciones(vendedor_id);
    CREATE INDEX IF NOT EXISTS idx_distribuciones_sync_status ON distribuciones(sync_status);
  `);

  await pg.exec(`
    CREATE TABLE IF NOT EXISTS distribucion_items (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      distribucion_id UUID NOT NULL,
      variant_id UUID NOT NULL,
      cantidad_asignada DECIMAL(10,3) NOT NULL,
      cantidad_vendida DECIMAL(10,3) NOT NULL DEFAULT '0',
      unidad TEXT NOT NULL DEFAULT 'kg',
      sync_status TEXT NOT NULL DEFAULT 'pending',
      sync_attempts INTEGER NOT NULL DEFAULT 0,
      sync_version INTEGER NOT NULL DEFAULT 1,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_distribucion_items_distribucion_id ON distribucion_items(distribucion_id);
  `);

  await pg.exec(`
    CREATE TABLE IF NOT EXISTS closings (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      business_id UUID NOT NULL,
      seller_id UUID NOT NULL,
      closing_date DATE NOT NULL,
      total_sales INTEGER NOT NULL DEFAULT 0,
      total_amount DECIMAL(12,2) NOT NULL DEFAULT '0',
      cash_amount DECIMAL(12,2) NOT NULL DEFAULT '0',
      credit_amount DECIMAL(12,2) NOT NULL DEFAULT '0',
      total_kilos DECIMAL(10,3),
      backdate_reason TEXT,
      sync_status TEXT NOT NULL DEFAULT 'pending',
      sync_attempts INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_closings_business_id ON closings(business_id);
    CREATE INDEX IF NOT EXISTS idx_closings_seller_id ON closings(seller_id);
    CREATE INDEX IF NOT EXISTS idx_closings_date ON closings(closing_date);
    CREATE INDEX IF NOT EXISTS idx_closings_sync_status ON closings(sync_status);
  `);

  await pg.exec(`
    CREATE TABLE IF NOT EXISTS sync_operations (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      sync_group_id TEXT,
      operation TEXT NOT NULL,
      payload JSONB,
      status TEXT NOT NULL DEFAULT 'pending',
      version INTEGER NOT NULL DEFAULT 1,
      sync_attempts INTEGER NOT NULL DEFAULT 0,
      last_error TEXT,
      last_attempt_at TIMESTAMP,
      idempotency_key TEXT UNIQUE,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_sync_operations_entity ON sync_operations(entity_type, entity_id);
    CREATE INDEX IF NOT EXISTS idx_sync_operations_status ON sync_operations(status);
    CREATE INDEX IF NOT EXISTS idx_sync_operations_group ON sync_operations(sync_group_id);
    CREATE INDEX IF NOT EXISTS idx_sync_operations_idempotency ON sync_operations(idempotency_key);
    CREATE INDEX IF NOT EXISTS idx_sync_operations_created ON sync_operations(created_at);
  `);

  // Run migrations to update existing tables
  await runMigrations(pg);
}

export async function resetDatabase(): Promise<void> {
  if (pg) {
    await pg.close();
    pg = null;
    db = null;
    initPromise = null;
  }
  // Delete IndexedDB database
  const request = indexedDB.deleteDatabase("avileo-pg");
  await new Promise<void>((resolve, reject) => {
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * Schema migrations runner
 * Applies pending migrations to update existing database schemas
 */
async function runMigrations(pg: import("@electric-sql/pglite").PGlite): Promise<void> {
  await pg.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY,
      applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      description TEXT
    );
  `);

  const result = await pg.query<{ version: number }>(`SELECT version FROM schema_migrations ORDER BY version`);
  const appliedVersions = new Set(result.rows.map(r => r.version));

  const migrations = [
    {
      version: 1,
      description: "Add sync_attempts and sync_status to products",
      sql: `
        ALTER TABLE products ADD COLUMN IF NOT EXISTS sync_attempts INTEGER DEFAULT 0;
        ALTER TABLE products ADD COLUMN IF NOT EXISTS sync_status TEXT DEFAULT 'pending';
        CREATE INDEX IF NOT EXISTS idx_products_sync_status ON products(sync_status);
      `
    },
    {
      version: 2,
      description: "Add business_id to product_variants",
      sql: `
        ALTER TABLE product_variants ADD COLUMN IF NOT EXISTS business_id UUID DEFAULT '00000000-0000-0000-0000-000000000000';
        CREATE INDEX IF NOT EXISTS idx_product_variants_business_id ON product_variants(business_id);
      `
    },
    {
      version: 3,
      description: "Add business_id to sale_items",
      sql: `
        ALTER TABLE sale_items ADD COLUMN IF NOT EXISTS business_id UUID DEFAULT '00000000-0000-0000-0000-000000000000';
        CREATE INDEX IF NOT EXISTS idx_sale_items_business_id ON sale_items(business_id);
      `
    },
    {
      version: 4,
      description: "Add business_id to customers",
      sql: `
        ALTER TABLE customers ADD COLUMN IF NOT EXISTS business_id UUID;
        CREATE INDEX IF NOT EXISTS idx_customers_business_id ON customers(business_id);
      `
    },
    {
      version: 5,
      description: "Add business_id to sales",
      sql: `
        ALTER TABLE sales ADD COLUMN IF NOT EXISTS business_id UUID;
        CREATE INDEX IF NOT EXISTS idx_sales_business_id ON sales(business_id);
      `
    },
    {
      version: 6,
      description: "Add business_id to abonos",
      sql: `
        ALTER TABLE abonos ADD COLUMN IF NOT EXISTS business_id UUID;
        CREATE INDEX IF NOT EXISTS idx_abonos_business_id ON abonos(business_id);
      `
    },
    {
      version: 7,
      description: "Add business_id to products",
      sql: `
        ALTER TABLE products ADD COLUMN IF NOT EXISTS business_id UUID;
        CREATE INDEX IF NOT EXISTS idx_products_business_id ON products(business_id);
      `
    },
    {
      version: 8,
      description: "Add business_id to suppliers",
      sql: `
        ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS business_id UUID;
        CREATE INDEX IF NOT EXISTS idx_suppliers_business_id ON suppliers(business_id);
      `
    },
    {
      version: 9,
      description: "Add business_id to purchases",
      sql: `
        ALTER TABLE purchases ADD COLUMN IF NOT EXISTS business_id UUID;
        CREATE INDEX IF NOT EXISTS idx_purchases_business_id ON purchases(business_id);
      `
    },
    {
      version: 10,
      description: "Add business_id to distribuciones",
      sql: `
        ALTER TABLE distribuciones ADD COLUMN IF NOT EXISTS business_id UUID;
        CREATE INDEX IF NOT EXISTS idx_distribuciones_business_id ON distribuciones(business_id);
      `
    }
  ];

  for (const migration of migrations) {
    if (!appliedVersions.has(migration.version)) {
      try {
        await pg.exec(migration.sql);
        await pg.exec(`
          INSERT INTO schema_migrations (version, description)
          VALUES (${migration.version}, '${migration.description.replace(/'/g, "''")}');
        `);
      } catch (err) {
        console.error(`[DB Migration] Failed to apply version ${migration.version}:`, err);
      }
    }
  }
}
