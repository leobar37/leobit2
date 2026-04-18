import { describe, expect, it } from "vitest";
import { add, subtract, max, isPositive, isGreaterThanOrEqual, toFixed } from "./decimal";

describe("decimal.add", () => {
  it("adds two decimals preserving precision", () => {
    expect(add("0.1", "0.2")).toBe("0.3");
  });

  it("adds integers", () => {
    expect(add("5", "10")).toBe("15");
  });

  it("adds mixed scales", () => {
    expect(add("1.5", "2.25")).toBe("3.75");
  });

  it("handles empty as 0", () => {
    expect(add("", "5")).toBe("5");
    expect(add("5", "")).toBe("5");
  });

  it("handles invalid as 0", () => {
    expect(add("abc", "3")).toBe("3");
  });

  it("sums via reduce", () => {
    const values = ["10.5", "5.25", "3.125"];
    const total = values.reduce((sum, v) => add(sum, v), "0");
    expect(total).toBe("18.875");
  });
});

describe("decimal.subtract", () => {
  it("subtracts two decimals preserving precision", () => {
    expect(subtract("0.1", "0.05")).toBe("0.05");
  });

  it("clamps to 0 when result is negative", () => {
    expect(subtract("5", "10")).toBe("0");
  });

  it("handles large precision subtraction", () => {
    expect(subtract("100", "99.99")).toBe("0.01");
  });

  it("handles 12-digit amounts", () => {
    expect(subtract("999999999.99", "0.01")).toBe("999999999.98");
  });

  it("handles small decimals (3 places)", () => {
    expect(subtract("1.000", "0.001")).toBe("0.999");
  });

  it("treats empty as 0", () => {
    expect(subtract("", "5")).toBe("0");
    expect(subtract("5", "")).toBe("5");
  });

  it("treats invalid input as 0", () => {
    expect(subtract("abc", "1")).toBe("0");
  });
});

describe("decimal.max", () => {
  it("returns the larger value", () => {
    expect(max("0.001", "0")).toBe("0.001");
  });

  it("handles large numbers", () => {
    expect(max("999999999.99", "0.01")).toBe("999999999.99");
  });

  it("returns equal values as-is", () => {
    expect(max("5.00", "5.00")).toBe("5.00");
  });
});

describe("decimal.isPositive", () => {
  it("returns true for values > 0", () => {
    expect(isPositive("0.001")).toBe(true);
    expect(isPositive("100")).toBe(true);
  });

  it("returns false for 0", () => {
    expect(isPositive("0")).toBe(false);
  });

  it("returns false for empty or invalid", () => {
    expect(isPositive("")).toBe(false);
    expect(isPositive("abc")).toBe(false);
  });
});

describe("decimal.isGreaterThanOrEqual", () => {
  it("returns true when a > b", () => {
    expect(isGreaterThanOrEqual("5", "3")).toBe(true);
  });

  it("returns true when a == b", () => {
    expect(isGreaterThanOrEqual("3.00", "3")).toBe(true);
  });

  it("returns false when a < b", () => {
    expect(isGreaterThanOrEqual("2", "3")).toBe(false);
  });
});

describe("decimal.toFixed", () => {
  it("pads to 2 decimal places", () => {
    expect(toFixed("5", 2)).toBe("5.00");
  });

  it("pads single decimal digit", () => {
    expect(toFixed("0.1", 2)).toBe("0.10");
  });

  it("truncates excess decimals", () => {
    expect(toFixed("100.123", 2)).toBe("100.12");
  });

  it("handles 3 decimal places", () => {
    expect(toFixed("1.5", 3)).toBe("1.500");
  });
});
