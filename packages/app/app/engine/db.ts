import { drizzle } from "drizzle-orm/pglite";
import * as schema from "./schema";
import { getLocalDatabaseName } from "~/lib/session-storage";
import { FULL_SCHEMA } from "~/lib/sync/schema";
// Import PGlite worker as inline base64 (most reliable for production)
import PgliteWorkerConstructor from "./pglite.worker.ts?worker&inline";

// SSR safety check - ensure we're in a browser environment
const isBrowser = typeof window !== "undefined" && typeof document !== "undefined";

let pg: import("@electric-sql/pglite").PGlite | null = null;
let db: ReturnType<typeof drizzle> | null = null;
let initPromise: Promise<{ pg: import("@electric-sql/pglite").PGlite; db: ReturnType<typeof drizzle> }> | null = null;

const VERSION_KEY = "avileo_schema_hash";
export const SCHEMA_HASH_KEY = VERSION_KEY;

function locatePgliteFile(file: string): string {
  if (file === "postgres.data") {
    return "/pglite.data";
  }
  if (file === "postgres.wasm") {
    return "/pglite.wasm";
  }
  return file;
}

async function createPrimaryPGliteInstance(dataDir: string): Promise<import("@electric-sql/pglite").PGlite> {
  // Worker is enabled by default. Use VITE_DISABLE_PGLITE_WORKER=1 to force synchronous mode.
  const workerDisabled =
    typeof import.meta !== "undefined" &&
    Boolean(import.meta.env?.VITE_DISABLE_PGLITE_WORKER);

  if (!workerDisabled && typeof window !== "undefined" && "Worker" in window) {
    try {
      const [{ PGliteWorker }] = await Promise.all([
        import("@electric-sql/pglite/worker"),
      ]);

      const workerInstance = await PGliteWorker.create(
        new PgliteWorkerConstructor(),
        {
          dataDir,
          relaxedDurability: true,
          locateFile: locatePgliteFile,
        }
      );

      return workerInstance as unknown as import("@electric-sql/pglite").PGlite;
    } catch (error) {
      console.warn("[DB] Failed to initialize PGliteWorker, falling back to direct instance", error);
    }
  }

  const [{ PGlite }] = await Promise.all([
    import("@electric-sql/pglite"),
  ]);

  return PGlite.create({
    dataDir,
    relaxedDurability: true,
    locateFile: locatePgliteFile,
  });
}

// Schema SQL is now imported from ~/lib/sync/schema

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
  sync_group_id: string | null;
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
  // Guard against SSR/build execution
  if (!isBrowser) {
    throw new Error("Database cannot be initialized during SSR or build. Ensure this is only called in browser context.");
  }

  if (pg && db) {
    return { pg, db };
  }

  if (initPromise) {
    return initPromise;
  }

  initPromise = (async () => {
    const databaseName = getLocalDatabaseName();
    const dataDir = `idb://${databaseName}`;

    const [{ PGlite }] = await Promise.all([
      import("@electric-sql/pglite"),
    ]);

    // Migration: clean old version key if exists
    const oldVersionKey = "avileo_schema_version";
    const oldVersion = isBrowser ? localStorage.getItem(oldVersionKey) : null;
    const isMigrating = !!oldVersion;
    if (isMigrating && isBrowser) {
      console.log("[DB] Migrating from old schema version system");
      localStorage.removeItem(oldVersionKey);
    }

    // Check if schema hash changed
    const currentHash = await computeSchemaHash(FULL_SCHEMA);
    const storedHash = isBrowser ? localStorage.getItem(VERSION_KEY) || "" : "";
    const needsReset = isMigrating || (storedHash !== currentHash);

    // Check if user requested a force reset (via "Limpiar" button)
    const forceReset = isBrowser ? localStorage.getItem("AVILEO_FORCE_RESET") === "true" : false;
    if (forceReset && isBrowser) {
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
    if (isBrowser) {
      localStorage.setItem(VERSION_KEY, currentHash);
    }

    // Create fresh database instance
    const pgInstance = await createPrimaryPGliteInstance(dataDir);

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
    const [{ PGlite }] = await Promise.all([
      import("@electric-sql/pglite"),
    ]);

    const tempPg = await PGlite.create({
      dataDir: `idb://${getLocalDatabaseName()}`,
      relaxedDurability: true,
      locateFile: locatePgliteFile,
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
            sync_status, sync_attempts, sync_group_id, created_at, updated_at
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
            ${item.sync_group_id ? `'${item.sync_group_id}'` : "NULL"},
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
  if (!isBrowser) return;
  const databaseName = getLocalDatabaseName();

  if (pg) {
    await pg.close();
    pg = null;
    db = null;
  }
  initPromise = null;

  // Delete IndexedDB database and wait for completion
  await new Promise<void>((resolve) => {
    const request = indexedDB.deleteDatabase(databaseName);
    let resolved = false;

    const done = () => {
      if (resolved) return;
      resolved = true;
      console.log(`[DB] IndexedDB database deleted: ${databaseName}`);
      // Give IndexedDB a moment to finalize the deletion before we return
      setTimeout(resolve, 50);
    };

    request.onsuccess = done;
    request.onerror = () => {
      console.warn("[DB] IndexedDB delete error (may not exist):", request.error);
      done();
    };
    request.onblocked = () => {
      console.warn("[DB] IndexedDB delete blocked - waiting...");
      setTimeout(done, 200);
    };
  });
}

export function getDatabase(): {
  pg: import("@electric-sql/pglite").PGlite;
  db: ReturnType<typeof drizzle>;
} {
  if (!isBrowser) {
    throw new Error("Database cannot be accessed during SSR or build.");
  }
  if (!pg || !db) {
    throw new Error("Database not initialized. Call initDatabase() first.");
  }
  return { pg, db };
}

export async function disposeDatabase(): Promise<void> {
  if (!isBrowser) return;
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
  if (!isBrowser) return;
  // Clear schema version to force full reset on next init
  localStorage.removeItem(VERSION_KEY);
  await resetDatabaseInternal();
}

async function createTables(pgInstance: import("@electric-sql/pglite").PGlite): Promise<void> {
  await pgInstance.exec(FULL_SCHEMA);
}
