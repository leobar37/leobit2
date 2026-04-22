/**
 * Engine-level debug helpers for window.avileoDebug
 * Low-level PGlite query helpers used for diagnostics
 */

import type { PGlite } from "@electric-sql/pglite";

export interface DiagnosticReport {
  timestamp: string;
  localStorage: {
    bearer_token: string;
    current_business_id: string | null;
    avileo_schema_version: string | null;
    avileo_pull_cursor: string | null;
  };
  pgInitialized: boolean;
  tables: Record<string, number>;
  pullCursor: string | null;
  errors: string[];
}

export interface EngineDebugHelpers {
  getProducts: () => Promise<unknown>;
  getProductCount: () => Promise<unknown>;
  checkAllTables: () => Promise<void>;
  getProductsForBusiness: () => Promise<unknown>;
  query: (sql: string, params?: unknown[]) => Promise<unknown>;
  forceResync: () => void;
  checkLocalStorage: () => void;
  copyDiagnosticReport: () => Promise<DiagnosticReport>;
}

/**
 * Initialize engine-level debug helpers on window.avileoDebug
 * Called from provider.tsx after initDatabase() succeeds
 */
export function initEngineDebug(pg: PGlite | null): EngineDebugHelpers {
  const helpers: EngineDebugHelpers = {
    getProducts: async () => {
      if (!pg) return console.error("PG not initialized");
      const result = await pg.query(`SELECT * FROM products`);
      console.log("Products in local DB:", result.rows);
      return result.rows;
    },

    getProductCount: async () => {
      if (!pg) return console.error("PG not initialized");
      const result = await pg.query(`SELECT COUNT(*) as count FROM products`);
      const row = result.rows[0] as { count: string | number } | undefined;
      console.log("Product count:", row?.count);
      return row?.count;
    },

    checkAllTables: async () => {
      if (!pg) return console.error("PG not initialized");
      const tables = ['products', 'customers', 'sales', 'abonos', 'suppliers', 'tags', 'product_variants', 'purchases'];
      for (const table of tables) {
        try {
          const result = await pg.query(`SELECT COUNT(*) as count FROM "${table}"`);
          const row = result.rows[0] as { count: string | number } | undefined;
          console.log(`${table}: ${row?.count} rows`);
        } catch (e) {
          console.log(`${table}: ERROR - ${e}`);
        }
      }
    },

    getProductsForBusiness: async () => {
      if (!pg) return console.error("PG not initialized");
      const businessId = localStorage.getItem("current_business_id");
      console.log("Querying for businessId:", businessId);
      const result = await pg.query(`SELECT * FROM products WHERE business_id = $1`, [businessId]);
      console.log("Products for business:", result.rows);
      return result.rows;
    },

    query: async (sql: string, params?: unknown[]) => {
      if (!pg) return console.error("PG not initialized");
      const result = await pg.query(sql, params);
      console.log("Query result:", result.rows);
      return result.rows;
    },

    forceResync: () => {
      localStorage.removeItem("avileo_schema_version");
      localStorage.removeItem("avileo_pull_cursor");
      indexedDB.deleteDatabase("avileo-pg");
      location.reload();
    },

    checkLocalStorage: () => {
      console.log("bearer_token:", localStorage.getItem("bearer_token") ? "present" : "missing");
      console.log("current_business_id:", localStorage.getItem("current_business_id"));
      console.log("avileo_schema_version:", localStorage.getItem("avileo_schema_version"));
      console.log("avileo_pull_cursor:", localStorage.getItem("avileo_pull_cursor"));
    },

    copyDiagnosticReport: async () => {
      const report: DiagnosticReport = {
        timestamp: new Date().toISOString(),
        localStorage: {
          bearer_token: localStorage.getItem("bearer_token") ? "present" : "missing",
          current_business_id: localStorage.getItem("current_business_id"),
          avileo_schema_version: localStorage.getItem("avileo_schema_version"),
          avileo_pull_cursor: localStorage.getItem("avileo_pull_cursor"),
        },
        pgInitialized: !!pg,
        tables: {},
        pullCursor: localStorage.getItem("avileo_pull_cursor"),
        errors: [],
      };

      if (!pg) {
        report.errors.push("PGlite not initialized");
      } else {
        const tables = [
          'products', 'customers', 'sales', 'abonos',
          'suppliers', 'tags', 'product_variants', 'purchases',
          'sale_items', 'purchase_items', 'distribuciones',
          'distribucion_items', 'variant_inventory', 'customer_tags',
          'customer_groups', 'customer_group_members', 'visitas', 'sync_operations'
        ];
        for (const table of tables) {
          try {
            const result = await pg.query(`SELECT COUNT(*) as count FROM "${table}"`);
            const count = result.rows[0] as { count: string | number } | undefined;
            report.tables[table] = Number(count?.count || 0);
          } catch (e) {
            report.tables[table] = -1;
            report.errors.push(`${table}: ${e instanceof Error ? e.message : String(e)}`);
          }
        }
      }

      const jsonReport = JSON.stringify(report, null, 2);

      try {
        await navigator.clipboard.writeText(jsonReport);
        console.log("✅ Diagnostic report copied to clipboard!");
        console.log("Report preview:", report);
        return report;
      } catch (e) {
        console.error("Failed to copy to clipboard:", e);
        console.log("Report (copy manually):", jsonReport);
        return report;
      }
    },
  };

  return helpers;
}
