/**
 * Database Engine
 * PGlite initialization and Drizzle ORM setup
 */
import { PGlite } from "@electric-sql/pglite";
import { electricSync } from "@electric-sql/pglite-sync";
import { drizzle } from "drizzle-orm/pglite";
import * as schema from "./schema";

let pg: PGlite | null = null;
let db: ReturnType<typeof drizzle> | null = null;

/**
 * Initialize PGlite database with Electric sync extension
 */
export async function initDatabase(): Promise<{
  pg: PGlite;
  db: ReturnType<typeof drizzle>;
}> {
  if (!pg) {
    pg = await PGlite.create({
      dataDir: "idb://avileo-pg",
      extensions: {
        electric: electricSync(),
      },
    });

    db = drizzle(pg, { schema });

    // Create tables if they don't exist
    await createTables(pg);
  }

  return { pg, db: db as ReturnType<typeof drizzle> };
}

/**
 * Get existing database instance (must call initDatabase first)
 */
export function getDatabase(): {
  pg: PGlite;
  db: ReturnType<typeof drizzle>;
} {
  if (!pg || !db) {
    throw new Error("Database not initialized. Call initDatabase() first.");
  }
  return { pg, db: db as ReturnType<typeof drizzle> };
}

/**
 * Create all tables in PGlite
 */
async function createTables(pg: PGlite): Promise<void> {
  // Customers
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
      business_id UUID NOT NULL,
      created_by UUID,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name);
    CREATE INDEX IF NOT EXISTS idx_customers_business_id ON customers(business_id);
    CREATE INDEX IF NOT EXISTS idx_customers_sync_status ON customers(sync_status);
  `);

  // Sales
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

  // Sale Items
  await pg.exec(`
    CREATE TABLE IF NOT EXISTS sale_items (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      sale_id UUID NOT NULL,
      product_id UUID NOT NULL,
      variant_id UUID NOT NULL,
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
  `);

  // Abonos (Payments)
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
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_abonos_customer_id ON abonos(customer_id);
    CREATE INDEX IF NOT EXISTS idx_abonos_business_id ON abonos(business_id);
    CREATE INDEX IF NOT EXISTS idx_abonos_sync_status ON abonos(sync_status);
  `);

  // Products
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
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_products_business_id ON products(business_id);
    CREATE INDEX IF NOT EXISTS idx_products_type ON products(type);
  `);

  // Product Variants
  await pg.exec(`
    CREATE TABLE IF NOT EXISTS product_variants (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      product_id UUID NOT NULL,
      name VARCHAR(50) NOT NULL,
      sku VARCHAR(50),
      unit_quantity DECIMAL(10,3) NOT NULL,
      price DECIMAL(10,2) NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0,
      is_active BOOLEAN NOT NULL DEFAULT true,
      sync_status TEXT NOT NULL DEFAULT 'pending',
      sync_attempts INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_product_variants_product_id ON product_variants(product_id);
  `);

  // Suppliers
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
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_suppliers_business_id ON suppliers(business_id);
    CREATE INDEX IF NOT EXISTS idx_suppliers_sync_status ON suppliers(sync_status);
  `);

  // Purchases
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
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_purchases_business_id ON purchases(business_id);
    CREATE INDEX IF NOT EXISTS idx_purchases_supplier_id ON purchases(supplier_id);
    CREATE INDEX IF NOT EXISTS idx_purchases_sync_status ON purchases(sync_status);
  `);

  // Purchase Items
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
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_purchase_items_purchase_id ON purchase_items(purchase_id);
  `);

  // Distribuciones
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
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_distribuciones_business_id ON distribuciones(business_id);
    CREATE INDEX IF NOT EXISTS idx_distribuciones_vendedor_id ON distribuciones(vendedor_id);
    CREATE INDEX IF NOT EXISTS idx_distribuciones_sync_status ON distribuciones(sync_status);
  `);

  // Distribucion Items
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
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_distribucion_items_distribucion_id ON distribucion_items(distribucion_id);
  `);
}

/**
 * Reset database (for testing/debugging)
 */
export async function resetDatabase(): Promise<void> {
  if (pg) {
    await pg.close();
    pg = null;
    db = null;
  }
  // Clear IndexedDB
  const request = indexedDB.deleteDatabase("/idb/avileo-pg");
  await new Promise<void>((resolve, reject) => {
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}
