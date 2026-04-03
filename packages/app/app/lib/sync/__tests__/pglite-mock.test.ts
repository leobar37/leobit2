/**
 * PGlite Mock Tests
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createPGliteMock,
  setupTableQuery,
  setupEmptyTable,
  setupQueryError,
  setupWriteSuccess,
  setupTransaction,
  resetPGliteMock,
  type PGliteMock,
} from "../../../../tests/mocks/pglite-mock";

describe("PGliteMock", () => {
  let mockPg: PGliteMock;

  beforeEach(() => {
    mockPg = createPGliteMock();
  });

  describe("createPGliteMock", () => {
    it("creates a mock with query, exec, transaction, close methods", () => {
      expect(mockPg.query).toBeDefined();
      expect(mockPg.exec).toBeDefined();
      expect(mockPg.transaction).toBeDefined();
      expect(mockPg.close).toBeDefined();
    });

    it("query returns a Promise when called", async () => {
      mockPg.query.mockResolvedValue({ rows: [], fields: [] });
      const result = await mockPg.query("SELECT 1");
      expect(result.rows).toEqual([]);
    });

    it("exec resolves to undefined by default", async () => {
      const result = await mockPg.exec("CREATE TABLE...");
      expect(result).toBeUndefined();
    });
  });

  describe("setupTableQuery", () => {
    it("configures SELECT to return rows for specified table", async () => {
      const customers = [
        { id: "1", name: "John Doe", phone: "123" },
        { id: "2", name: "Jane Doe", phone: "456" },
      ];
      setupTableQuery(mockPg, "customers", customers);

      const result = await mockPg.query('SELECT * FROM "customers"');

      expect(result.rows).toHaveLength(2);
      expect(result.rows[0].name).toBe("John Doe");
    });

    it("returns empty rows for non-matching table", async () => {
      setupTableQuery(mockPg, "customers", [{ id: "1" }]);

      const result = await mockPg.query('SELECT * FROM "unknown"');

      expect(result.rows).toHaveLength(0);
    });

    it("handles table name with different SQL formatting", async () => {
      const products = [{ id: "p1", name: "Chicken" }];
      setupTableQuery(mockPg, "products", products);

      const result = await mockPg.query("SELECT * FROM products");

      expect(result.rows).toHaveLength(1);
    });
  });

  describe("setupEmptyTable", () => {
    it("returns empty rows for table", async () => {
      setupEmptyTable(mockPg, "customers");

      const result = await mockPg.query('SELECT * FROM "customers"');

      expect(result.rows).toHaveLength(0);
    });
  });

  describe("setupQueryError", () => {
    it("throws error for matching SQL pattern", async () => {
      setupQueryError(mockPg, "customers", "Connection refused");

      await expect(mockPg.query('SELECT * FROM "customers"')).rejects.toThrow(
        "Connection refused"
      );
    });

    it("does not throw for non-matching SQL", async () => {
      setupQueryError(mockPg, "customers", "Connection refused");

      const result = await mockPg.query("SELECT * FROM other_table");

      expect(result.rows).toHaveLength(0);
    });
  });

  describe("setupWriteSuccess", () => {
    it("makes query return empty rows for INSERT/UPDATE/DELETE", async () => {
      setupWriteSuccess(mockPg);

      const result = await mockPg.query(
        'INSERT INTO "customers" (id, name) VALUES ($1, $2)',
        ["1", "John"]
      );

      expect(result.rows).toHaveLength(0);
    });
  });

  describe("setupTransaction", () => {
    it("executes callback with transaction mock", async () => {
      const txResult = { rows: [{ id: "1" }] };
      setupTransaction(mockPg, [txResult]);

      let txInCallback: unknown = null;
      await mockPg.transaction(async (tx) => {
        txInCallback = tx;
      });

      expect(txInCallback).not.toBeNull();
    });

    it("returns configured results from transaction queries", async () => {
      const txResult = { rows: [{ id: "1" }] };
      setupTransaction(mockPg, [txResult]);

      await mockPg.transaction(async (tx: any) => {
        const result = await tx.query("SELECT 1");
        expect(result.rows).toEqual(txResult.rows);
      });
    });
  });

  describe("resetPGliteMock", () => {
    it("clears all mock implementations", () => {
      mockPg.query.mockResolvedValue({ rows: [{ id: "1" }] });
      mockPg.exec.mockResolvedValue(undefined);

      resetPGliteMock(mockPg);

      expect(mockPg.query).toBeDefined();
      expect(mockPg.exec).toBeDefined();
    });
  });
});
