/**
 * Devtools console module
 * Merges engine-level and service-level helpers onto window.avileoDebug
 */

import type { PGlite } from "@electric-sql/pglite";
import { initEngineDebug, type EngineDebugHelpers } from "./engine-helpers";
import { createServiceDebugHelpers, type ServiceDebugHelpers, type ServiceDebugDeps } from "./service-helpers";

export { initEngineDebug } from "./engine-helpers";
export { createServiceDebugHelpers, addServiceDebugHelpers } from "./service-helpers";
export type { DiagnosticReport, EngineDebugHelpers } from "./engine-helpers";
export type { ServiceDebugHelpers, ServiceDebugDeps } from "./service-helpers";

// Augment window with avileoDebug global
declare global {
  interface Window {
    avileoDebug?: EngineDebugHelpers & ServiceDebugHelpers;
  }
}

export interface InitDevToolsOptions {
  pg: PGlite | null;
  services?: ServiceDebugDeps | null;
}

/**
 * Initialize the full window.avileoDebug object.
 * - First sets engine-level helpers (PGlite raw query)
 * - Then merges service-level helpers on top
 *
 * Call this ONCE after initDatabase() succeeds in provider.tsx.
 * Service helpers will be merged in when ServicesProvider calls addServiceDebugHelpers.
 */
export function initDevTools(options: InitDevToolsOptions): void {
  if (typeof window === "undefined") return;

  const { pg, services } = options;

  // Set engine helpers first
  const engineHelpers = initEngineDebug(pg);

  // Create service helpers if services are provided
  const serviceHelpers = services
    ? createServiceDebugHelpers(services)
    : {};

  // Merge onto window.avileoDebug (service helpers take precedence if any conflicts)
  window.avileoDebug = {
    ...engineHelpers,
    ...serviceHelpers,
  } as EngineDebugHelpers & ServiceDebugHelpers;

  console.log("🔧 Avileo Debug ready! Run avileoDebug.help() for commands");
}
