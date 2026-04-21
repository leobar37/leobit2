/**
 * @avileo/drizzle-sync/react/devtools
 *
 * React DevTools for sync diagnostics.
 *
 * ## Usage
 *
 * ```tsx
 * import { SyncDevToolsProvider, SyncDevTools } from "@avileo/drizzle-sync/react/devtools";
 *
 * // Wrap your app with the provider
 * <SyncDevToolsProvider config={{ onClearStorage: async () => {...} }}>
 *   <App />
 * </SyncDevToolsProvider>
 *
 * // Add the floating widget
 * <SyncDevTools enabled={import.meta.env.DEV} />
 * ```
 */

// Provider
export { SyncDevToolsProvider, type SyncDevToolsConfig } from "./provider";

// Main component
export { SyncDevTools } from "./component";

// Types
export type {
  SyncStatus,
  SyncOperation,
  DeadLetterOperation,
  EntitySyncSummary,
  ActiveTab,
  HealthScore,
  HealthStatusLevel,
} from "./types";

// Hooks (for advanced usage)
export { useDevToolsData } from "./hooks/use-devtools-data";
export { useDatabaseData } from "./hooks/use-database-data";
export { useHealthScore, getHealthScoreColor, getHealthScoreBgColor } from "./hooks/use-health-score";
export { useSyncMetrics, MetricCard } from "./hooks/use-sync-metrics";
export { usePerformanceMetrics, formatBytes } from "./hooks/use-performance-metrics";
export { useSyncTimeline } from "./hooks/use-sync-timeline";
export { useOperationFilters } from "./hooks/use-operation-filters";

// Tabs (for custom layouts)
export { StatusTab } from "./tabs/status-tab";
export { OperationsTab } from "./tabs/operations-tab";
export { DLQTab } from "./tabs/dlq-tab";
export { TablesTab } from "./tabs/tables-tab";
export { DatabaseTab } from "./tabs/database-tab";
export { TimelineTab } from "./tabs/timeline-tab";
export { MetricsTab } from "./tabs/metrics-tab";
export { PerformanceTab } from "./tabs/performance-tab";

// Components
export { StatCard, EntityRow, OperationRow, DeadLetterRow } from "./components/sync-components";
