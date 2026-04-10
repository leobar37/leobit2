import type { PGlite } from "@electric-sql/pglite";
import { checkAndMigrateSchema } from "./schema-version";

/**
 * Initializes the local push-sync infrastructure.
 */
export class SyncInitializationService {
  constructor(
    private pg: PGlite,
    private businessId: string
  ) {}

  async initialize(): Promise<void> {
    await checkAndMigrateSchema(this.pg, this.businessId);
  }
}
