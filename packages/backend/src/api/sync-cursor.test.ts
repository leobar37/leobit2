import { describe, expect, it } from "vitest";
import { parseCursor } from "./sync-cursor";

describe("parseCursor", () => {
  it("parses legacy timestamp cursor", () => {
    const result = parseCursor("2026-03-07T18:07:41.784Z");

    expect(result.valid).toBe(true);
    expect(result.date?.toISOString()).toBe("2026-03-07T18:07:41.784Z");
    expect(result.operationId).toBeUndefined();
    expect(result.isLegacy).toBe(true);
  });

  it("parses timestamp_operationId cursor", () => {
    const result = parseCursor("2026-03-07T18:07:41.784Z_op-123");

    expect(result.valid).toBe(true);
    expect(result.date?.toISOString()).toBe("2026-03-07T18:07:41.784Z");
    expect(result.operationId).toBe("op-123");
    expect(result.isLegacy).toBe(false);
  });

  it("parses cursor when operationId contains underscores", () => {
    const cursor = "2026-03-31T14:49:46.036Z_backfill-sale_items-ab3282bc-53e9-430f-9cd1-eae433ad5fe6-0ceffbcb";
    const result = parseCursor(cursor);

    expect(result.valid).toBe(true);
    expect(result.date?.toISOString()).toBe("2026-03-31T14:49:46.036Z");
    expect(result.operationId).toBe("backfill-sale_items-ab3282bc-53e9-430f-9cd1-eae433ad5fe6-0ceffbcb");
    expect(result.isLegacy).toBe(false);
  });

  it("returns invalid timestamp for malformed new cursor format", () => {
    const result = parseCursor("not-a-date_op-123");

    expect(result.valid).toBe(false);
    expect(result.error).toBe("Invalid timestamp in cursor");
  });

  it("returns invalid format for malformed legacy cursor", () => {
    const result = parseCursor("not-a-date");

    expect(result.valid).toBe(false);
    expect(result.error).toBe("Invalid cursor format. Expected ISO 8601 timestamp.");
  });
});
