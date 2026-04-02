/**
 * Staged Sync Configuration
 * 
 * Defines the three loading stages for optimized sync performance:
 * - CRITICAL: Essential reference data needed immediately (customers, products)
 * - RECENT_SALES: Recent operational data (last 7 days of sales)
 * - HISTORICAL: Complete historical data loaded in background (abonos, purchases, etc.)
 */

export const SYNC_STAGES = {
  /**
   * Stage 1: Critical reference data
   * - Always loaded first (blocking)
   * - App cannot function without these
   * - 30 day lookback for recent customers/products
   */
  CRITICAL: {
    name: "CRITICAL" as const,
    entities: ["customers", "products", "product_variants"] as const,
    lookbackDays: 30,
    description: "Datos de referencia esenciales",
    blocking: true,
  },

  /**
   * Stage 2: Recent sales data
   * - Loaded second (blocking)
   * - Needed for daily operations
   * - 7 day lookback for recent sales
   */
  RECENT_SALES: {
    name: "RECENT_SALES" as const,
    entities: ["sales", "sale_items"] as const,
    lookbackDays: 7,
    description: "Ventas recientes",
    blocking: true,
  },

  /**
   * Stage 3: Historical data
   * - Loaded in background (non-blocking)
   * - Includes all historical debts (abonos) for complete customer history
   * - Full historical data for purchases, distributions, etc.
   */
  HISTORICAL: {
    name: "HISTORICAL" as const,
    entities: [
      "abonos",
      "purchases",
      "purchase_items",
      "distribuciones",
      "distribucion_items",
      "suppliers",
      "visitas",
      "tags",
      "customer_tags",
      "customer_groups",
      "customer_group_members",
    ] as const,
    lookbackDays: null, // All historical data
    description: "Histórico completo",
    blocking: false,
  },
} as const;

export type SyncStage = keyof typeof SYNC_STAGES;
export type SyncStageConfig = (typeof SYNC_STAGES)[SyncStage];

/**
 * Get the list of entities for a specific stage
 */
export function getEntitiesForStage(stage: SyncStage): string[] {
  return [...SYNC_STAGES[stage].entities];
}

/**
 * Get all entities across all stages (for filtering purposes)
 */
export function getAllStagedEntities(): string[] {
  return Object.values(SYNC_STAGES).flatMap((stage) => [...stage.entities]);
}

/**
 * Check if an entity belongs to a specific stage
 */
export function isEntityInStage(entity: string, stage: SyncStage): boolean {
  return getEntitiesForStage(stage).includes(entity);
}

/**
 * Get the stage configuration for an entity
 */
export function getStageForEntity(entity: string): SyncStage | null {
  const allEntities = getAllStagedEntities();
  if (!allEntities.includes(entity)) {
    return null;
  }
  
  for (const stageName of Object.keys(SYNC_STAGES) as SyncStage[]) {
    if (getEntitiesForStage(stageName).includes(entity)) {
      return stageName;
    }
  }
  return null;
}
