import { drizzle } from "drizzle-orm/pglite";
import * as schema from "./schema";

let pg: import("@electric-sql/pglite").PGlite | null = null;
let db: ReturnType<typeof drizzle> | null = null;
let initPromise: Promise<{ pg: import("@electric-sql/pglite").PGlite; db: ReturnType<typeof drizzle> }> | null = null;

// Current schema version - bump this when schema changes
const SCHEMA_VERSION = 3;
const VERSION_KEY = "avileo_schema_version";

interface PendingSale {
  id: string;
  business_id: string;
  customer_id: string | null;
  seller_id: string;
  distribucion_id: string | null;
  type: string;
  sale_type: string;
  payment_mode: string | null;
  total_amount: string;
  amount_paid: string;
  balance_due: string;
  tara: string | null;
  net_weight: string | null;
  sale_date: string;
  delivery_date: string | null;
  order_date: string | null;
  status: string;
  version: number;
  confirmed_snapshot: unknown;
  delivered_snapshot: unknown;
  allow_customer_edit: boolean;
  sync_status: string;
  sync_attempts: number;
  cancelled_at: string | null;
  cancelled_by: string | null;
  cancel_reason: string | null;
  refund_amount: string | null;
  refund_date: string | null;
  refund_method: string | null;
  refund_reference: string | null;
  refund_notes: string | null;
  advance_payment_method: string | null;
  advance_reference_number: string | null;
  advance_proof_image_id: string | null;
  created_at: string;
  updated_at: string;
}

interface PendingSaleItem {
  id: string;
  sale_id: string;
  product_id: string;
  variant_id: string;
  business_id: string;
  product_name: string;
  variant_name: string;
  quantity: string | null;
  ordered_quantity: string | null;
  delivered_quantity: string | null;
  unit_price: string | null;
  unit_price_quoted: string | null;
  unit_price_final: string | null;
  cost_price_snapshot: string | null;
  subtotal: string;
  is_modified: boolean;
  original_quantity: string | null;
  sync_status: string;
  sync_attempts: number;
  created_at: string;
  updated_at: string;
}

interface PendingAbono {
  id: string;
  customer_id: string;
  seller_id: string;
  business_id: string;
  related_sale_id: string | null;
  amount: string;
  payment_method: string;
  reference_number: string | null;
  proof_image_id: string | null;
  notes: string | null;
  sync_status: string;
  sync_attempts: number;
  sync_version: number;
  created_at: string;
  updated_at: string;
}

interface PendingCustomer {
  id: string;
  name: string;
  dni: string | null;
  phone: string | null;
  address: string | null;
  notes: string | null;
  sync_status: string;
  sync_attempts: number;
  sync_version: number;
  business_id: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

interface PendingData {
  sales: PendingSale[];
  saleItems: PendingSaleItem[];
  abonos: PendingAbono[];
  customers: PendingCustomer[];
}

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

    // Check if schema version changed
    const storedVersion = parseInt(localStorage.getItem(VERSION_KEY) || "0", 10);
    const needsReset = storedVersion !== SCHEMA_VERSION;

    let pendingData: PendingData | null = null;

    if (needsReset && storedVersion > 0) {
      // Export pending data before reset (only if database existed before)
      console.log(`[DB] Schema version changed: ${storedVersion} -> ${SCHEMA_VERSION}. Exporting pending data...`);
      pendingData = await exportPendingData();
      console.log(`[DB] Exported ${pendingData.sales.length} sales, ${pendingData.abonos.length} abonos, ${pendingData.customers.length} customers`);
    }

    // Reset database if version changed
    if (needsReset) {
      console.log("[DB] Resetting database for schema update...");
      await resetDatabaseInternal();
    }

    // Create fresh database instance
    const pgInstance = await PGlite.create({
      dataDir: "idb://avileo-pg",
      extensions: {
        electric: electricSync(),
      },
      locateFile: (file: string) => {
        if (file === "pglite.data") {
          return "https://unpkg.com/@electric-sql/pglite@0.3.15/dist/pglite.data";
        }
        if (file === "pglite.wasm") {
          return "https://unpkg.com/@electric-sql/pglite@0.3.15/dist/pglite.wasm";
        }
        return file;
      },
    });

    // Create all tables with complete schema
    await createTables(pgInstance);

    // Import pending data after tables are created
    if (pendingData) {
      console.log("[DB] Importing pending data...");
      await importPendingData(pgInstance, pendingData);
    }

    // Save new schema version
    localStorage.setItem(VERSION_KEY, SCHEMA_VERSION.toString());

    // Initialize Drizzle
    const dbInstance = drizzle(pgInstance, { schema });

    pg = pgInstance;
    db = dbInstance;

    // Debug: Check if electric extension is loaded
    console.log(`[DB] pg.electric exists:`, 'electric' in pgInstance);
    console.log(`[DB] pg.sync exists:`, 'sync' in pgInstance);
    console.log(`[DB] Database initialized with schema version ${SCHEMA_VERSION}`);

    return { pg: pgInstance, db: dbInstance };
  })();

  return initPromise;
}

async function exportPendingData(): Promise<PendingData> {
  const data: PendingData = {
    sales: [],
    saleItems: [],
    abonos: [],
    customers: [],
  };

  try {
    // Try to open a temporary connection to existing database
    const [{ PGlite }, { electricSync }] = await Promise.all([
      import("@electric-sql/pglite"),
      import("@electric-sql/pglite-sync"),
    ]);

    const tempPg = await PGlite.create({
      dataDir: "idb://avileo-pg",
      extensions: { electric: electricSync() },
      locateFile: (file: string) => {
        if (file === "pglite.data") {
          return "https://unpkg.com/@electric-sql/pglite@0.3.15/dist/pglite.data";
        }
        if (file === "pglite.wasm") {
          return "https://unpkg.com/@electric-sql/pglite@0.3.15/dist/pglite.wasm";
        }
        return file;
      },
    });

    try {
      // Export pending sales
      const salesResult = await tempPg.query<PendingSale>(`
        SELECT * FROM sales WHERE sync_status IN ('pending', 'error')
      `);
      data.sales = salesResult.rows;

      // Export sale items for those sales
      if (data.sales.length > 0) {
        const saleIds = data.sales.map(s => `'${s.id}'`).join(",");
        const itemsResult = await tempPg.query<PendingSaleItem>(`
          SELECT * FROM sale_items WHERE sale_id IN (${saleIds})
        `);
        data.saleItems = itemsResult.rows;
      }

      // Export pending abonos
      const abonosResult = await tempPg.query<PendingAbono>(`
        SELECT * FROM abonos WHERE sync_status IN ('pending', 'error')
      `);
      data.abonos = abonosResult.rows;

      // Export pending customers
      const customersResult = await tempPg.query<PendingCustomer>(`
        SELECT * FROM customers WHERE sync_status IN ('pending', 'error')
      `);
      data.customers = customersResult.rows;
    } catch (err) {
      console.warn("[DB] Error exporting pending data (tables may not exist):", err);
    } finally {
      await tempPg.close();
    }
  } catch (err) {
    console.warn("[DB] Could not connect to existing database for export:", err);
  }

  return data;
}

async function importPendingData(pg: import("@electric-sql/pglite").PGlite, data: PendingData): Promise<void> {
  try {
    // Import customers first (referenced by sales)
    for (const customer of data.customers) {
      try {
        await pg.exec(`
          INSERT INTO customers (
            id, name, dni, phone, address, notes, sync_status, sync_attempts, sync_version,
            business_id, created_by, created_at, updated_at
          ) VALUES (
            '${customer.id}',
            '${customer.name.replace(/'/g, "''")}',
            ${customer.dni ? `'${customer.dni}'` : "NULL"},
            ${customer.phone ? `'${customer.phone}'` : "NULL"},
            ${customer.address ? `'${customer.address.replace(/'/g, "''")}'` : "NULL"},
            ${customer.notes ? `'${customer.notes.replace(/'/g, "''")}'` : "NULL"},
            '${customer.sync_status}',
            ${customer.sync_attempts},
            ${customer.sync_version},
            '${customer.business_id}',
            ${customer.created_by ? `'${customer.created_by}'` : "NULL"},
            '${customer.created_at}',
            '${customer.updated_at}'
          )
          ON CONFLICT (id) DO UPDATE SET
            sync_status = EXCLUDED.sync_status,
            sync_attempts = EXCLUDED.sync_attempts,
            updated_at = EXCLUDED.updated_at
        `);
      } catch (err) {
        console.warn(`[DB] Failed to import customer ${customer.id}:`, err);
      }
    }

    // Import sales
    for (const sale of data.sales) {
      try {
        await pg.exec(`
          INSERT INTO sales (
            id, business_id, customer_id, seller_id, distribucion_id, type, sale_type,
            payment_mode, total_amount, amount_paid, balance_due, tara, net_weight,
            sale_date, delivery_date, order_date, status, version, confirmed_snapshot,
            delivered_snapshot, allow_customer_edit, sync_status, sync_attempts,
            cancelled_at, cancelled_by, cancel_reason, refund_amount, refund_date,
            refund_method, refund_reference, refund_notes, advance_payment_method,
            advance_reference_number, advance_proof_image_id, created_at, updated_at
          ) VALUES (
            '${sale.id}',
            '${sale.business_id}',
            ${sale.customer_id ? `'${sale.customer_id}'` : "NULL"},
            '${sale.seller_id}',
            ${sale.distribucion_id ? `'${sale.distribucion_id}'` : "NULL"},
            '${sale.type}',
            '${sale.sale_type}',
            ${sale.payment_mode ? `'${sale.payment_mode}'` : "NULL"},
            '${sale.total_amount}',
            '${sale.amount_paid}',
            '${sale.balance_due}',
            ${sale.tara ? `'${sale.tara}'` : "NULL"},
            ${sale.net_weight ? `'${sale.net_weight}'` : "NULL"},
            '${sale.sale_date}',
            ${sale.delivery_date ? `'${sale.delivery_date}'` : "NULL"},
            ${sale.order_date ? `'${sale.order_date}'` : "NULL"},
            '${sale.status}',
            ${sale.version},
            ${sale.confirmed_snapshot ? `'${JSON.stringify(sale.confirmed_snapshot).replace(/'/g, "''")}'::jsonb` : "NULL"},
            ${sale.delivered_snapshot ? `'${JSON.stringify(sale.delivered_snapshot).replace(/'/g, "''")}'::jsonb` : "NULL"},
            ${sale.allow_customer_edit},
            '${sale.sync_status}',
            ${sale.sync_attempts},
            ${sale.cancelled_at ? `'${sale.cancelled_at}'` : "NULL"},
            ${sale.cancelled_by ? `'${sale.cancelled_by}'` : "NULL"},
            ${sale.cancel_reason ? `'${sale.cancel_reason.replace(/'/g, "''")}'` : "NULL"},
            ${sale.refund_amount ? `'${sale.refund_amount}'` : "NULL"},
            ${sale.refund_date ? `'${sale.refund_date}'` : "NULL"},
            ${sale.refund_method ? `'${sale.refund_method}'` : "NULL"},
            ${sale.refund_reference ? `'${sale.refund_reference}'` : "NULL"},
            ${sale.refund_notes ? `'${sale.refund_notes.replace(/'/g, "''")}'` : "NULL"},
            ${sale.advance_payment_method ? `'${sale.advance_payment_method}'` : "NULL"},
            ${sale.advance_reference_number ? `'${sale.advance_reference_number}'` : "NULL"},
            ${sale.advance_proof_image_id ? `'${sale.advance_proof_image_id}'` : "NULL"},
            '${sale.created_at}',
            '${sale.updated_at}'
          )
          ON CONFLICT (id) DO UPDATE SET
            sync_status = EXCLUDED.sync_status,
            sync_attempts = EXCLUDED.sync_attempts,
            updated_at = EXCLUDED.updated_at
        `);
      } catch (err) {
        console.warn(`[DB] Failed to import sale ${sale.id}:`, err);
      }
    }

    // Import sale items
    for (const item of data.saleItems) {
      try {
        await pg.exec(`
          INSERT INTO sale_items (
            id, sale_id, product_id, variant_id, business_id, product_name, variant_name,
            quantity, ordered_quantity, delivered_quantity, unit_price, unit_price_quoted,
            unit_price_final, cost_price_snapshot, subtotal, is_modified, original_quantity,
            sync_status, sync_attempts, created_at, updated_at
          ) VALUES (
            '${item.id}',
            '${item.sale_id}',
            '${item.product_id}',
            '${item.variant_id}',
            '${item.business_id}',
            '${item.product_name.replace(/'/g, "''")}',
            '${item.variant_name.replace(/'/g, "''")}',
            ${item.quantity ? `'${item.quantity}'` : "NULL"},
            ${item.ordered_quantity ? `'${item.ordered_quantity}'` : "NULL"},
            ${item.delivered_quantity ? `'${item.delivered_quantity}'` : "NULL"},
            ${item.unit_price ? `'${item.unit_price}'` : "NULL"},
            ${item.unit_price_quoted ? `'${item.unit_price_quoted}'` : "NULL"},
            ${item.unit_price_final ? `'${item.unit_price_final}'` : "NULL"},
            ${item.cost_price_snapshot ? `'${item.cost_price_snapshot}'` : "NULL"},
            '${item.subtotal}',
            ${item.is_modified},
            ${item.original_quantity ? `'${item.original_quantity}'` : "NULL"},
            '${item.sync_status}',
            ${item.sync_attempts},
            '${item.created_at}',
            '${item.updated_at}'
          )
          ON CONFLICT (id) DO NOTHING
        `);
      } catch (err) {
        console.warn(`[DB] Failed to import sale item ${item.id}:`, err);
      }
    }

    // Import abonos
    for (const abono of data.abonos) {
      try {
        await pg.exec(`
          INSERT INTO abonos (
            id, customer_id, seller_id, business_id, related_sale_id, amount,
            payment_method, reference_number, proof_image_id, notes, sync_status,
            sync_attempts, sync_version, created_at, updated_at
          ) VALUES (
            '${abono.id}',
            '${abono.customer_id}',
            '${abono.seller_id}',
            '${abono.business_id}',
            ${abono.related_sale_id ? `'${abono.related_sale_id}'` : "NULL"},
            '${abono.amount}',
            '${abono.payment_method}',
            ${abono.reference_number ? `'${abono.reference_number}'` : "NULL"},
            ${abono.proof_image_id ? `'${abono.proof_image_id}'` : "NULL"},
            ${abono.notes ? `'${abono.notes.replace(/'/g, "''")}'` : "NULL"},
            '${abono.sync_status}',
            ${abono.sync_attempts},
            ${abono.sync_version},
            '${abono.created_at}',
            '${abono.updated_at}'
          )
          ON CONFLICT (id) DO UPDATE SET
            sync_status = EXCLUDED.sync_status,
            sync_attempts = EXCLUDED.sync_attempts,
            updated_at = EXCLUDED.updated_at
        `);
      } catch (err) {
        console.warn(`[DB] Failed to import abono ${abono.id}:`, err);
      }
    }

    console.log(`[DB] Import complete: ${data.sales.length} sales, ${data.saleItems.length} items, ${data.abonos.length} abonos, ${data.customers.length} customers`);
  } catch (err) {
    console.error("[DB] Error importing pending data:", err);
  }
}

async function resetDatabaseInternal(): Promise<void> {
  if (pg) {
    await pg.close();
    pg = null;
    db = null;
  }
  initPromise = null;

  // Delete IndexedDB database
  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase("avileo-pg");
    request.onsuccess = () => {
      console.log("[DB] IndexedDB database deleted successfully");
      resolve();
    };
    request.onerror = () => {
      console.warn("[DB] Error deleting IndexedDB:", request.error);
      // Continue anyway - the database might not exist
      resolve();
    };
    request.onblocked = () => {
      console.warn("[DB] IndexedDB delete blocked - retrying...");
      setTimeout(() => {
        const retry = indexedDB.deleteDatabase("avileo-pg");
        retry.onsuccess = () => resolve();
        retry.onerror = () => resolve();
      }, 100);
    };
  });
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

export async function resetDatabase(): Promise<void> {
  // Clear schema version to force full reset on next init
  localStorage.removeItem(VERSION_KEY);
  await resetDatabaseInternal();
}

async function createTables(pgInstance: import("@electric-sql/pglite").PGlite): Promise<void> {
  // Core tables with complete schema (no migrations needed)

  await pgInstance.exec(`
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

  await pgInstance.exec(`
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

  await pgInstance.exec(`
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
      cost_price_snapshot DECIMAL(10,2),
      subtotal DECIMAL(12,2) NOT NULL,
      is_modified BOOLEAN NOT NULL DEFAULT false,
      original_quantity DECIMAL(10,3),
      sync_status TEXT NOT NULL DEFAULT 'synced',
      sync_attempts INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_sale_items_sale_id ON sale_items(sale_id);
    CREATE INDEX IF NOT EXISTS idx_sale_items_product_id ON sale_items(product_id);
    CREATE INDEX IF NOT EXISTS idx_sale_items_business_id ON sale_items(business_id);
    CREATE INDEX IF NOT EXISTS idx_sale_items_sync_status ON sale_items(sync_status);
  `);

  await pgInstance.exec(`
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

  await pgInstance.exec(`
    CREATE TABLE IF NOT EXISTS products (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      business_id UUID NOT NULL,
      name VARCHAR(255) NOT NULL,
      type TEXT NOT NULL DEFAULT 'pollo',
      unit TEXT NOT NULL DEFAULT 'kg',
      base_price DECIMAL(10,2) NOT NULL,
      cost_price DECIMAL(10,2) NOT NULL DEFAULT '0',
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

  await pgInstance.exec(`
    CREATE TABLE IF NOT EXISTS product_variants (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      product_id UUID NOT NULL,
      business_id UUID NOT NULL,
      name VARCHAR(50) NOT NULL,
      sku VARCHAR(50),
      unit_quantity DECIMAL(10,3) NOT NULL,
      price DECIMAL(10,2) NOT NULL,
      cost_price DECIMAL(10,2) NOT NULL DEFAULT '0',
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

  await pgInstance.exec(`
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

  await pgInstance.exec(`
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

  await pgInstance.exec(`
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

  await pgInstance.exec(`
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

  await pgInstance.exec(`
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

  await pgInstance.exec(`
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

  await pgInstance.exec(`
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

  await pgInstance.exec(`
    CREATE TABLE IF NOT EXISTS tags (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(100) NOT NULL,
      color VARCHAR(20) NOT NULL DEFAULT '#f97316',
      business_id UUID NOT NULL,
      sync_status TEXT NOT NULL DEFAULT 'pending',
      sync_attempts INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_tags_business_id ON tags(business_id);
    CREATE INDEX IF NOT EXISTS idx_tags_name ON tags(name);
    CREATE INDEX IF NOT EXISTS idx_tags_sync_status ON tags(sync_status);
  `);

  await pgInstance.exec(`
    CREATE TABLE IF NOT EXISTS customer_tags (
      customer_id UUID NOT NULL,
      tag_id UUID NOT NULL,
      assigned_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      assigned_by UUID,
      sync_status TEXT NOT NULL DEFAULT 'pending',
      sync_attempts INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (customer_id, tag_id)
    );
    CREATE INDEX IF NOT EXISTS idx_customer_tags_customer_id ON customer_tags(customer_id);
    CREATE INDEX IF NOT EXISTS idx_customer_tags_tag_id ON customer_tags(tag_id);
    CREATE INDEX IF NOT EXISTS idx_customer_tags_sync_status ON customer_tags(sync_status);
  `);

  await pgInstance.exec(`
    CREATE TABLE IF NOT EXISTS inventory (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      business_id UUID NOT NULL,
      product_id UUID NOT NULL,
      quantity DECIMAL(10,3) NOT NULL DEFAULT '0',
      sync_status TEXT NOT NULL DEFAULT 'synced',
      sync_attempts INTEGER NOT NULL DEFAULT 0,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_inventory_business_id ON inventory(business_id);
    CREATE INDEX IF NOT EXISTS idx_inventory_product_id ON inventory(product_id);
    CREATE INDEX IF NOT EXISTS idx_inventory_sync_status ON inventory(sync_status);
  `);

  await pgInstance.exec(`
    CREATE TABLE IF NOT EXISTS variant_inventory (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      business_id UUID NOT NULL,
      variant_id UUID NOT NULL,
      quantity DECIMAL(10,3) NOT NULL DEFAULT '0',
      sync_status TEXT NOT NULL DEFAULT 'synced',
      sync_attempts INTEGER NOT NULL DEFAULT 0,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_variant_inventory_business_id ON variant_inventory(business_id);
    CREATE INDEX IF NOT EXISTS idx_variant_inventory_variant_id ON variant_inventory(variant_id);
  `);
}
