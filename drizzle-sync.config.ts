import type { DrizzleSyncProjectConfig } from "./packages/drizzle-sync/src/config/types";

export default {
  schemaConfig: "packages/backend/src/sync.config.ts",
  schemaOutput: "packages/drizzle-sync/src/sync.schema.json",
  clientOutput: "packages/app/app/lib/sync/generated",
  serverOutput: "packages/backend/src/sync/generated",
} satisfies DrizzleSyncProjectConfig;
