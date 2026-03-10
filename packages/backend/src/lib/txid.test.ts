import { describe, expect, it, vi } from "vitest";
import { getTxid, type DbTransaction } from "./txid";

describe("getTxid", () => {
  it("returns the numeric Postgres transaction id", async () => {
    const tx = {
      execute: vi.fn().mockResolvedValue([{ txid: "12345" }]),
    } as unknown as DbTransaction;

    await expect(getTxid(tx)).resolves.toBe(12345);
  });

  it("throws when the transaction id is invalid", async () => {
    const tx = {
      execute: vi.fn().mockResolvedValue([{ txid: null }]),
    } as unknown as DbTransaction;

    await expect(getTxid(tx)).rejects.toThrow("Failed to resolve transaction id");
  });
});
