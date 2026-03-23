import { drizzle } from "drizzle-orm/pglite";
import * as schema from "./schema";
import { getLocalDatabaseName } from "~/lib/session-storage";

let pg: import("@electric-sql/pglite").PGlite | null = null;
let db: ReturnType<typeof drizzle> | null = null;
let initPromise: Promise<{ pg: import("@electric-sql/pglite").PGlite; db: ReturnType<typeof drizzle> }> | null = null;

const VERSION_KEY = "avileo_schema_hash";

const SCHEMA_SQL = `
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

CREATE TABLE IF NOT EXISTS sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL,
  customer_id UUID,
  seller_id UUID NOT NULL,
  distribucion_id UUID,
  visita_id UUID,
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
  sync_group_id TEXT,
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
CREATE INDEX IF NOT EXISTS idx_sales_visita_id ON sales(visita_id);
CREATE INDEX IF NOT EXISTS idx_sales_sync_status ON sales(sync_status);
CREATE INDEX IF NOT EXISTS idx_sales_status ON sales(status);
CREATE INDEX IF NOT EXISTS idx_sales_sale_date ON sales(sale_date);

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
CREATE INDEX IF NOT EXISTS idx_abonos_updated_at ON abonos(updated_at);

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

CREATE TABLE IF NOT EXISTS purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL,
  supplier_id UUID,
  purchase_date DATE,
  total_amount DECIMAL(12,2) NOT NULL DEFAULT '0',
  status TEXT NOT NULL DEFAULT 'draft',
  invoice_number VARCHAR(50),
  receipt_image_id UUID,
  notes TEXT,
  sync_status TEXT NOT NULL DEFAULT 'pending',
  sync_attempts INTEGER NOT NULL DEFAULT 0,
  sync_version INTEGER NOT NULL DEFAULT 1,
  sync_group_id TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_purchases_business_id ON purchases(business_id);
CREATE INDEX IF NOT EXISTS idx_purchases_supplier_id ON purchases(supplier_id);
CREATE INDEX IF NOT EXISTS idx_purchases_sync_status ON purchases(sync_status);

CREATE TABLE IF NOT EXISTS purchase_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL,
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
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_purchase_items_business_id ON purchase_items(business_id);
CREATE INDEX IF NOT EXISTS idx_purchase_items_purchase_id ON purchase_items(purchase_id);
CREATE INDEX IF NOT EXISTS idx_purchase_items_sync_status ON purchase_items(sync_status);

CREATE TABLE IF NOT EXISTS distribuciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL,
  vendedor_id UUID NOT NULL,
  punto_venta VARCHAR(100) NOT NULL,
  punto_venta_id UUID,
  monto_recaudado DECIMAL(12,2) NOT NULL DEFAULT '0',
  fecha DATE NOT NULL,
  estado TEXT NOT NULL DEFAULT 'activo',
  modo TEXT NOT NULL DEFAULT 'estricto',
  sync_status TEXT NOT NULL DEFAULT 'pending',
  sync_attempts INTEGER NOT NULL DEFAULT 0,
  sync_version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_distribuciones_business_id ON distribuciones(business_id);
CREATE INDEX IF NOT EXISTS idx_distribuciones_vendedor_id ON distribuciones(vendedor_id);
CREATE INDEX IF NOT EXISTS idx_distribuciones_sync_status ON distribuciones(sync_status);
CREATE INDEX IF NOT EXISTS idx_distribuciones_punto_venta_id ON distribuciones(punto_venta_id);

CREATE TABLE IF NOT EXISTS distribucion_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL,
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
CREATE INDEX IF NOT EXISTS idx_distribucion_items_business_id ON distribucion_items(business_id);
CREATE INDEX IF NOT EXISTS idx_distribucion_items_distribucion_id ON distribucion_items(distribucion_id);

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
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_closings_business_id ON closings(business_id);
CREATE INDEX IF NOT EXISTS idx_closings_seller_id ON closings(seller_id);
CREATE INDEX IF NOT EXISTS idx_closings_date ON closings(closing_date);
CREATE INDEX IF NOT EXISTS idx_closings_sync_status ON closings(sync_status);

CREATE TABLE IF NOT EXISTS sync_operations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL,
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
ALTER TABLE sync_operations ADD COLUMN IF NOT EXISTS business_id UUID;
CREATE INDEX IF NOT EXISTS idx_sync_operations_business ON sync_operations(business_id);
CREATE INDEX IF NOT EXISTS idx_sync_operations_entity ON sync_operations(business_id, entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_sync_operations_status ON sync_operations(business_id, status);
CREATE INDEX IF NOT EXISTS idx_sync_operations_group ON sync_operations(business_id, sync_group_id);
CREATE INDEX IF NOT EXISTS idx_sync_operations_idempotency ON sync_operations(idempotency_key);
CREATE INDEX IF NOT EXISTS idx_sync_operations_created ON sync_operations(created_at);

CREATE TABLE IF NOT EXISTS sync_dead_letter (
  id TEXT PRIMARY KEY,
  business_id UUID NOT NULL,
  operation_id TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  operation TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  data TEXT NOT NULL,
  error TEXT NOT NULL,
  sync_attempts INTEGER NOT NULL,
  original_error TEXT,
  created_at TEXT NOT NULL
);
ALTER TABLE sync_dead_letter ADD COLUMN IF NOT EXISTS business_id UUID;
CREATE INDEX IF NOT EXISTS idx_sync_dead_letter_business ON sync_dead_letter(business_id);
CREATE INDEX IF NOT EXISTS idx_sync_dead_letter_operation_id ON sync_dead_letter(operation_id);

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

CREATE TABLE IF NOT EXISTS customer_tags (
  business_id UUID NOT NULL,
  customer_id UUID NOT NULL,
  tag_id UUID NOT NULL,
  assigned_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  assigned_by UUID,
  sync_status TEXT NOT NULL DEFAULT 'pending',
  sync_attempts INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (business_id, customer_id, tag_id)
);
CREATE INDEX IF NOT EXISTS idx_customer_tags_business_id ON customer_tags(business_id);
CREATE INDEX IF NOT EXISTS idx_customer_tags_customer_id ON customer_tags(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_tags_tag_id ON customer_tags(tag_id);
CREATE INDEX IF NOT EXISTS idx_customer_tags_sync_status ON customer_tags(sync_status);

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

CREATE TABLE IF NOT EXISTS visitas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL,
  distribucion_id UUID NOT NULL,
  customer_id UUID NOT NULL,
  vendedor_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pendiente',
  motivo_no_compra VARCHAR(255),
  sale_id UUID,
  sync_status TEXT NOT NULL DEFAULT 'synced',
  sync_attempts INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_visitas_business_id ON visitas(business_id);
CREATE INDEX IF NOT EXISTS idx_visitas_distribucion_id ON visitas(distribucion_id);
CREATE INDEX IF NOT EXISTS idx_visitas_customer_id ON visitas(customer_id);
CREATE INDEX IF NOT EXISTS idx_visitas_vendedor_id ON visitas(vendedor_id);
CREATE INDEX IF NOT EXISTS idx_visitas_status ON visitas(status);
CREATE INDEX IF NOT EXISTS idx_visitas_sale_id ON visitas(sale_id);
CREATE INDEX IF NOT EXISTS idx_visitas_sync_status ON visitas(sync_status);
CREATE INDEX IF NOT EXISTS idx_visitas_created_at ON visitas(created_at);

CREATE TABLE IF NOT EXISTS customer_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  business_id UUID NOT NULL,
  sync_status TEXT NOT NULL DEFAULT 'synced',
  sync_attempts INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_customer_groups_business_id ON customer_groups(business_id);
CREATE INDEX IF NOT EXISTS idx_customer_groups_name ON customer_groups(name);

CREATE TABLE IF NOT EXISTS customer_group_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL,
  group_id UUID NOT NULL,
  customer_id UUID NOT NULL,
  added_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  added_by UUID,
  sync_status TEXT NOT NULL DEFAULT 'synced',
  sync_attempts INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_customer_group_members_business_id ON customer_group_members(business_id);
CREATE INDEX IF NOT EXISTS idx_customer_group_members_group_id ON customer_group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_customer_group_members_customer_id ON customer_group_members(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_group_members_sync_status ON customer_group_members(sync_status);
`.trim();

async function computeSchemaHash(sql: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(sql);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

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

interface PendingVisita {
  id: string;
  business_id: string;
  distribucion_id: string;
  customer_id: string;
  vendedor_id: string;
  status: string;
  motivo_no_compra: string | null;
  sale_id: string | null;
  sync_status: string;
  sync_attempts: number;
  created_at: string;
  updated_at: string;
}

interface PendingCustomerGroup {
  id: string;
  name: string;
  business_id: string;
  sync_status: string;
  sync_attempts: number;
  created_at: string;
  updated_at: string;
}

interface PendingCustomerGroupMember {
  id: string;
  group_id: string;
  customer_id: string;
  added_at: string;
  added_by: string | null;
  sync_status: string;
  sync_attempts: number;
}

interface PendingData {
  sales: PendingSale[];
  saleItems: PendingSaleItem[];
  abonos: PendingAbono[];
  customers: PendingCustomer[];
  visitas: PendingVisita[];
  customerGroups: PendingCustomerGroup[];
  customerGroupMembers: PendingCustomerGroupMember[];
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
    const databaseName = getLocalDatabaseName();
    const dataDir = `idb://${databaseName}`;

    const [{ PGlite }, { electricSync }] = await Promise.all([
      import("@electric-sql/pglite"),
      import("@electric-sql/pglite-sync"),
    ]);

    // Migration: clean old version key if exists
    const oldVersionKey = "avileo_schema_version";
    const oldVersion = localStorage.getItem(oldVersionKey);
    const isMigrating = !!oldVersion;
    if (isMigrating) {
      console.log("[DB] Migrating from old schema version system");
      localStorage.removeItem(oldVersionKey);
    }

    // Check if schema hash changed
    const currentHash = await computeSchemaHash(SCHEMA_SQL);
    const storedHash = localStorage.getItem(VERSION_KEY) || "";
    const needsReset = isMigrating || (storedHash !== currentHash);

    // Check if user requested a force reset (via "Limpiar" button)
    const forceReset = localStorage.getItem("AVILEO_FORCE_RESET") === "true";
    if (forceReset) {
      console.log("[DB] Force reset requested - skipping data export");
      localStorage.removeItem("AVILEO_FORCE_RESET");
    }

    let pendingData: PendingData | null = null;

    if (needsReset && storedHash && !forceReset) {
      console.log(`[DB] Schema hash changed. Exporting pending data...`);
      pendingData = await exportPendingData();
      console.log(`[DB] Exported ${pendingData.sales.length} sales, ${pendingData.abonos.length} abonos, ${pendingData.customers.length} customers`);
    }

    // Reset database if version changed
    if (needsReset) {
      console.log("[DB] Resetting database for schema update...");
      await resetDatabaseInternal();
    }

    // Save schema hash BEFORE attempting database operations to prevent infinite reset loops
    // If WASM load fails, we don't want to keep trying to reset
    localStorage.setItem(VERSION_KEY, currentHash);

    // Create fresh database instance
    const pgInstance = await PGlite.create({
      dataDir,
      extensions: {
        electric: electricSync(),
      },
      locateFile: (file: string) => {
        if (file === "postgres.data") {
          return "/pglite.data";
        }
        if (file === "postgres.wasm") {
          return "/pglite.wasm";
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

    // Initialize Drizzle
    const dbInstance = drizzle(pgInstance, { schema });

    pg = pgInstance;
    db = dbInstance;

    // Debug: Check if electric extension is loaded
    console.log(`[DB] pg.electric exists:`, 'electric' in pgInstance);
    console.log(`[DB] pg.sync exists:`, 'sync' in pgInstance);
    console.log(`[DB] Database namespace: ${databaseName}`);
    console.log(`[DB] Database initialized with schema hash ${currentHash.substring(0, 8)}...`);

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
    visitas: [],
    customerGroups: [],
    customerGroupMembers: [],
  };

  try {
    // Try to open a temporary connection to existing database
    const [{ PGlite }, { electricSync }] = await Promise.all([
      import("@electric-sql/pglite"),
      import("@electric-sql/pglite-sync"),
    ]);

    const tempPg = await PGlite.create({
      dataDir: `idb://${getLocalDatabaseName()}`,
      extensions: { electric: electricSync() },
      locateFile: (file: string) => {
        if (file === "postgres.data") {
          return "/pglite.data";
        }
        if (file === "postgres.wasm") {
          return "/pglite.wasm";
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

      // Export pending visitas
      const visitasResult = await tempPg.query<PendingVisita>(`
        SELECT * FROM visitas WHERE sync_status IN ('pending', 'error')
      `);
      data.visitas = visitasResult.rows;

      // Export pending customer groups
      const customerGroupsResult = await tempPg.query<PendingCustomerGroup>(`
        SELECT * FROM customer_groups WHERE sync_status IN ('pending', 'error')
      `);
      data.customerGroups = customerGroupsResult.rows;

      // Export pending customer group members
      const customerGroupMembersResult = await tempPg.query<PendingCustomerGroupMember>(`
        SELECT * FROM customer_group_members WHERE sync_status IN ('pending', 'error')
      `);
      data.customerGroupMembers = customerGroupMembersResult.rows;
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

    // Import visitas
    for (const visita of data.visitas) {
      try {
        await pg.exec(`
          INSERT INTO visitas (
            id, business_id, distribucion_id, customer_id, vendedor_id, status,
            motivo_no_compra, sale_id, sync_status, sync_attempts, created_at, updated_at
          ) VALUES (
            '${visita.id}',
            '${visita.business_id}',
            '${visita.distribucion_id}',
            '${visita.customer_id}',
            '${visita.vendedor_id}',
            '${visita.status}',
            ${visita.motivo_no_compra ? `'${visita.motivo_no_compra.replace(/'/g, "''")}'` : "NULL"},
            ${visita.sale_id ? `'${visita.sale_id}'` : "NULL"},
            '${visita.sync_status}',
            ${visita.sync_attempts},
            '${visita.created_at}',
            '${visita.updated_at}'
          )
          ON CONFLICT (id) DO UPDATE SET
            sync_status = EXCLUDED.sync_status,
            sync_attempts = EXCLUDED.sync_attempts,
            updated_at = EXCLUDED.updated_at
        `);
      } catch (err) {
        console.warn(`[DB] Failed to import visita ${visita.id}:`, err);
      }
    }

    // Import customer groups
    for (const group of data.customerGroups) {
      try {
        await pg.exec(`
          INSERT INTO customer_groups (
            id, name, business_id, sync_status, sync_attempts, created_at, updated_at
          ) VALUES (
            '${group.id}',
            '${group.name.replace(/'/g, "''")}',
            '${group.business_id}',
            '${group.sync_status}',
            ${group.sync_attempts},
            '${group.created_at}',
            '${group.updated_at}'
          )
          ON CONFLICT (id) DO UPDATE SET
            sync_status = EXCLUDED.sync_status,
            sync_attempts = EXCLUDED.sync_attempts,
            updated_at = EXCLUDED.updated_at
        `);
      } catch (err) {
        console.warn(`[DB] Failed to import customer group ${group.id}:`, err);
      }
    }

    // Import customer group members
    for (const member of data.customerGroupMembers) {
      try {
        await pg.exec(`
          INSERT INTO customer_group_members (
            id, group_id, customer_id, added_at, added_by, sync_status, sync_attempts
          ) VALUES (
            '${member.id}',
            '${member.group_id}',
            '${member.customer_id}',
            '${member.added_at}',
            ${member.added_by ? `'${member.added_by}'` : "NULL"},
            '${member.sync_status}',
            ${member.sync_attempts}
          )
          ON CONFLICT (id) DO UPDATE SET
            sync_status = EXCLUDED.sync_status,
            sync_attempts = EXCLUDED.sync_attempts
        `);
      } catch (err) {
        console.warn(`[DB] Failed to import customer group member ${member.id}:`, err);
      }
    }

    console.log(`[DB] Import complete: ${data.sales.length} sales, ${data.saleItems.length} items, ${data.abonos.length} abonos, ${data.customers.length} customers, ${data.visitas.length} visitas, ${data.customerGroups.length} groups, ${data.customerGroupMembers.length} group members`);
  } catch (err) {
    console.error("[DB] Error importing pending data:", err);
  }
}

async function resetDatabaseInternal(): Promise<void> {
  const databaseName = getLocalDatabaseName();

  if (pg) {
    await pg.close();
    pg = null;
    db = null;
  }
  initPromise = null;

  // Delete IndexedDB database
  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(databaseName);
    request.onsuccess = () => {
      console.log(`[DB] IndexedDB database deleted successfully: ${databaseName}`);
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
        const retry = indexedDB.deleteDatabase(databaseName);
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

export async function disposeDatabase(): Promise<void> {
  if (pg) {
    try {
      await pg.close();
    } catch (error) {
      console.warn("[DB] Failed to close database instance:", error);
    }
  }

  pg = null;
  db = null;
  initPromise = null;
}

export async function resetDatabase(): Promise<void> {
  // Clear schema version to force full reset on next init
  localStorage.removeItem(VERSION_KEY);
  await resetDatabaseInternal();
}

async function createTables(pgInstance: import("@electric-sql/pglite").PGlite): Promise<void> {
  await pgInstance.exec(SCHEMA_SQL);
}
