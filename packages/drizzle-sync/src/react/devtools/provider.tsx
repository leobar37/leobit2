/**
 * SyncDevToolsProvider - Provides configuration and callbacks for SyncDevTools
 */

import { createContext, useContext, type ReactNode } from "react";

export interface SyncDevToolsConfig {
  /** Callback to reset/clear storage (optional) */
  onClearStorage?: () => Promise<void>;
  /** Custom entity labels for tables */
  entityLabels?: Record<string, string>;
  /** Custom table list for database tab */
  tables?: string[];
  /** Tables that have sync_status column */
  tablesWithSyncStatus?: string[];
}

const DevToolsConfigContext = createContext<SyncDevToolsConfig>({});

export function SyncDevToolsProvider({
  config = {},
  children,
}: {
  config?: SyncDevToolsConfig;
  children: ReactNode;
}) {
  return (
    <DevToolsConfigContext.Provider value={config}>
      {children}
    </DevToolsConfigContext.Provider>
  );
}

export function useDevToolsConfig(): SyncDevToolsConfig {
  return useContext(DevToolsConfigContext);
}
