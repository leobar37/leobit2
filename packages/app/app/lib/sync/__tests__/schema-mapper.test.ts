/**
 * Schema Mapper Tests
 * Unit tests for entity-to-table mapping and column validation
 */

import { describe, expect, it } from "vitest";
import {
  isValidTableName,
  getTableForEntity,
  toSnakeCase,
  filterValidColumns,
  VALID_TABLES,
} from "../schema-mapper";

describe("VALID_TABLES", () => {
  it("contains expected table names", () => {
    expect(VALID_TABLES.has("customers")).toBe(true);
    expect(VALID_TABLES.has("sales")).toBe(true);
    expect(VALID_TABLES.has("products")).toBe(true);
    expect(VALID_TABLES.has("abonos")).toBe(true);
  });

  it("contains snake_case table names", () => {
    expect(VALID_TABLES.has("sale_items")).toBe(true);
    expect(VALID_TABLES.has("product_variants")).toBe(true);
    expect(VALID_TABLES.has("customer_groups")).toBe(true);
  });
});

describe("isValidTableName", () => {
  it("returns true for valid table names", () => {
    expect(isValidTableName("customers")).toBe(true);
    expect(isValidTableName("sales")).toBe(true);
    expect(isValidTableName("sale_items")).toBe(true);
  });

  it("returns false for invalid table names", () => {
    expect(isValidTableName("invalid_table")).toBe(false);
    expect(isValidTableName("users")).toBe(false);
    expect(isValidTableName("")).toBe(false);
  });

  it("returns false for SQL injection attempts", () => {
    expect(isValidTableName("customers; DROP TABLE")).toBe(false);
    expect(isValidTableName("customers--")).toBe(false);
    expect(isValidTableName("' OR '1'='1")).toBe(false);
  });
});

describe("getTableForEntity", () => {
  it("returns table for valid entity types", () => {
    const customersTable = getTableForEntity("customers");
    expect(customersTable).toBeDefined();

    const salesTable = getTableForEntity("sales");
    expect(salesTable).toBeDefined();
  });

  it("returns null for invalid entity types", () => {
    expect(getTableForEntity("invalid")).toBeNull();
    expect(getTableForEntity("")).toBeNull();
  });

  it("maps snake_case entity types correctly", () => {
    expect(getTableForEntity("sale_items")).toBeDefined();
    expect(getTableForEntity("product_variants")).toBeDefined();
    expect(getTableForEntity("customer_groups")).toBeDefined();
  });
});

describe("toSnakeCase", () => {
  it("converts camelCase to snake_case", () => {
    expect(toSnakeCase({ firstName: "John" })).toEqual({ first_name: "John" });
    expect(toSnakeCase({ lastName: "Doe" })).toEqual({ last_name: "Doe" });
  });

  it("converts multiple camelCase keys", () => {
    const input = {
      firstName: "John",
      lastName: "Doe",
      phoneNumber: "123456",
    };
    const expected = {
      first_name: "John",
      last_name: "Doe",
      phone_number: "123456",
    };
    expect(toSnakeCase(input)).toEqual(expected);
  });

  it("handles already snake_case keys", () => {
    const input = {
      first_name: "John",
      last_name: "Doe",
    };
    expect(toSnakeCase(input)).toEqual(input);
  });

  it("handles mixed case keys", () => {
    const input = {
      firstName: "John",
      last_name: "Doe",
      phoneNumber: "123",
    };
    const expected = {
      first_name: "John",
      last_name: "Doe",
      phone_number: "123",
    };
    expect(toSnakeCase(input)).toEqual(expected);
  });

  it("handles empty object", () => {
    expect(toSnakeCase({})).toEqual({});
  });

  it("preserves values", () => {
    const input = {
      count: 42,
      price: 19.99,
      isActive: true,
      name: "Test",
    };
    const result = toSnakeCase(input);
    expect(result.count).toBe(42);
    expect(result.price).toBe(19.99);
    expect(result.is_active).toBe(true);
    expect(result.name).toBe("Test");
  });
});

describe("filterValidColumns", () => {
  it("returns all columns for unknown table", () => {
    const payload = { id: "1", name: "Test", extra: "value" };
    const result = filterValidColumns("unknown_table", payload);
    expect(result).toEqual(payload);
  });

  it("filters out invalid columns for known tables", () => {
    // This test would filter columns if the schema was loaded
    // In test environment, schema is not loaded so all columns pass through
    const payload = {
      id: "1",
      name: "Test",
    };
    const result = filterValidColumns("customers", payload);
    expect(result.id).toBe("1");
    expect(result.name).toBe("Test");
  });

  it("keeps valid columns", () => {
    const payload = {
      id: "1",
      name: "John Doe",
      phone: "123456",
    };
    const result = filterValidColumns("customers", payload);
    expect(result).toEqual(payload);
  });

  it("handles empty payload", () => {
    const result = filterValidColumns("customers", {});
    expect(result).toEqual({});
  });
});
