import { describe, expect, it, vi } from "vitest";
import { ensureSyncSchema } from "../schema";
import { createMockPGlite } from "../testing/factories";

describe("ensureSyncSchema", () => {
  it("creates sync tables and backfills business ownership", async () => {
    const pg = createMockPGlite();

    await ensureSyncSchema(pg, "business-123");

    expect(pg.exec).toHaveBeenCalledTimes(6);
    expect(pg.query).toHaveBeenCalledWith(
      expect.stringContaining("UPDATE sync_operations"),
      ["business-123"]
    );
    expect(pg.query).toHaveBeenCalledWith(
      expect.stringContaining("UPDATE sync_dead_letter"),
      ["business-123"]
    );
  });

  it("skips backfill when businessId is not provided", async () => {
    const pg = createMockPGlite();

    await ensureSyncSchema(pg);

    expect(pg.exec).toHaveBeenCalledTimes(6);
    expect(pg.query).not.toHaveBeenCalled();
  });
});
