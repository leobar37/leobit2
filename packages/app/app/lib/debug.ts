/**
 * Avileo Debug Utilities (backwards compatibility shim)
 *
 * NOTE: The `window.avileoDebug` global type augmentation lives in:
 *   ~/devtools/console/index.ts
 * Do not move or duplicate the `declare global { interface Window { avileoDebug } }`
 * block — it must remain in ~/devtools/console/index.ts to be picked up by
 * TypeScript's global augmentation system.
 *
 * All service-level debug helpers have moved to ~/devtools/console/
 * Use ~/devtools/console/service-helpers.ts for createServiceDebugHelpers.
 */

import { addServiceDebugHelpers } from "~/devtools/console";

export { addServiceDebugHelpers };
export type { ServiceDebugHelpers } from "~/devtools/console";
