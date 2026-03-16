/**
 * Shape Configuration for ElectricSQL Sync
 *
 * Defines all tables that should be synced from the server to the local PGlite database.
 * Adding a new table only requires adding an entry to SHAPES_CONFIG.
 */

/**
 * Foreign key relationship definition
 */
export interface ForeignKeyConfig {
  column: string;
  references: {
    table: string;
    column: string;
  };
}

/**
 * Configuration for a single shape/table sync
 */
export interface ShapeConfig {
  /** Database table name */
  table: string;
  /** Primary key columns */
  primaryKey: string[];
  /** Optional WHERE clause for filtering (e.g., business_id filtering) */
  where?: string;
  /** Foreign key relationships for referential integrity */
  foreignKeys?: ForeignKeyConfig[];
  /** Whether to sync this table (can be disabled per environment) */
  enabled?: boolean;
  /** Sync priority (lower = sync first). Used for dependency ordering. */
  priority?: number;
}

/**
 * All shapes to sync from the server.
 * Order matters - parent tables should have lower priority (sync first).
 */
export const SHAPES_CONFIG: ShapeConfig[] = [
  // Core business data (sync first - no dependencies)
  {
    table: "customers",
    primaryKey: ["id"],
    where: "business_id = '{businessId}'",
    priority: 10,
  },
  {
    table: "products",
    primaryKey: ["id"],
    where: "business_id = '{businessId}'",
    priority: 10,
  },
  {
    table: "suppliers",
    primaryKey: ["id"],
    where: "business_id = '{businessId}'",
    priority: 10,
  },

  // Dependent tables (sync after parents)
  {
    table: "product_variants",
    primaryKey: ["id"],
    where: "business_id = '{businessId}'",
    foreignKeys: [
      {
        column: "product_id",
        references: { table: "products", column: "id" },
      },
    ],
    priority: 20,
  },
  // Inventory tables (sync after products/variants)
  {
    table: "inventory",
    primaryKey: ["id"],
    where: "business_id = '{businessId}'",
    foreignKeys: [
      {
        column: "product_id",
        references: { table: "products", column: "id" },
      },
    ],
    priority: 25,
  },
  {
    table: "variant_inventory",
    primaryKey: ["id"],
    where: "business_id = '{businessId}'",
    foreignKeys: [
      {
        column: "variant_id",
        references: { table: "product_variants", column: "id" },
      },
    ],
    priority: 30,
  },
  {
    table: "sales",
    primaryKey: ["id"],
    where: "business_id = '{businessId}'",
    foreignKeys: [
      {
        column: "customer_id",
        references: { table: "customers", column: "id" },
      },
    ],
    priority: 20,
  },
  {
    table: "purchases",
    primaryKey: ["id"],
    where: "business_id = '{businessId}'",
    foreignKeys: [
      {
        column: "supplier_id",
        references: { table: "suppliers", column: "id" },
      },
    ],
    priority: 20,
  },
  {
    table: "abonos",
    primaryKey: ["id"],
    where: "business_id = '{businessId}'",
    foreignKeys: [
      {
        column: "customer_id",
        references: { table: "customers", column: "id" },
      },
      {
        column: "sale_id",
        references: { table: "sales", column: "id" },
      },
    ],
    priority: 20,
  },

  // Child tables (sync after their parents)
  {
    table: "sale_items",
    primaryKey: ["id"],
    where: "business_id = '{businessId}'",
    foreignKeys: [
      {
        column: "sale_id",
        references: { table: "sales", column: "id" },
      },
      {
        column: "variant_id",
        references: { table: "product_variants", column: "id" },
      },
    ],
    priority: 30,
  },
  {
    table: "purchase_items",
    primaryKey: ["id"],
    foreignKeys: [
      {
        column: "purchase_id",
        references: { table: "purchases", column: "id" },
      },
      {
        column: "product_id",
        references: { table: "products", column: "id" },
      },
    ],
    priority: 30,
  },

  // Distributions (vendor daily operations)
  {
    table: "distribuciones",
    primaryKey: ["id"],
    where: "business_id = '{businessId}'",
    foreignKeys: [
      {
        column: "vendedor_id",
        references: { table: "business_users", column: "id" },
      },
    ],
    priority: 25,
  },
  {
    table: "distribucion_items",
    primaryKey: ["id"],
    foreignKeys: [
      {
        column: "distribucion_id",
        references: { table: "distribuciones", column: "id" },
      },
      {
        column: "variant_id",
        references: { table: "product_variants", column: "id" },
      },
    ],
    priority: 35,
  },

  // Visitas (vendor visits to customers during distributions)
  {
    table: "visitas",
    primaryKey: ["id"],
    where: "business_id = '{businessId}'",
    foreignKeys: [
      {
        column: "distribucion_id",
        references: { table: "distribuciones", column: "id" },
      },
      {
        column: "customer_id",
        references: { table: "customers", column: "id" },
      },
      {
        column: "vendedor_id",
        references: { table: "business_users", column: "id" },
      },
      {
        column: "sale_id",
        references: { table: "sales", column: "id" },
      },
    ],
    priority: 30,
  },

  // Daily closings
  {
    table: "closings",
    primaryKey: ["id"],
    where: "business_id = '{businessId}'",
    foreignKeys: [
      {
        column: "seller_id",
        references: { table: "business_users", column: "id" },
      },
    ],
    priority: 30,
  },

  // Tags (sync with core business data)
  {
    table: "tags",
    primaryKey: ["id"],
    where: "business_id = '{businessId}'",
    priority: 10,
  },

  // Customer Groups (sync with core business data - no dependencies)
  {
    table: "customer_groups",
    primaryKey: ["id"],
    where: "business_id = '{businessId}'",
    priority: 10,
  },

  // Customer Tags (sync after customers and tags)
  {
    table: "customer_tags",
    primaryKey: ["customer_id", "tag_id"],
    foreignKeys: [
      {
        column: "customer_id",
        references: { table: "customers", column: "id" },
      },
      {
        column: "tag_id",
        references: { table: "tags", column: "id" },
      },
    ],
    priority: 30,
  },

  // Customer Group Members (sync after customers and customer_groups)
  {
    table: "customer_group_members",
    primaryKey: ["id"],
    foreignKeys: [
      {
        column: "group_id",
        references: { table: "customer_groups", column: "id" },
      },
      {
        column: "customer_id",
        references: { table: "customers", column: "id" },
      },
    ],
    priority: 30,
  },
];

/**
 * Get shapes sorted by priority (ascending)
 */
export function getShapesByPriority(): ShapeConfig[] {
  return [...SHAPES_CONFIG]
    .filter((shape) => shape.enabled !== false)
    .sort((a, b) => (a.priority ?? 100) - (b.priority ?? 100));
}

/**
 * Get a single shape configuration by table name
 */
export function getShapeConfig(table: string): ShapeConfig | undefined {
  return SHAPES_CONFIG.find((shape) => shape.table === table);
}

/**
 * Get all table names that will be synced
 */
export function getSyncTableNames(): string[] {
  return SHAPES_CONFIG
    .filter((shape) => shape.enabled !== false)
    .map((shape) => shape.table);
}
