import { describe, it, expect } from "vitest";
import { currency, weight, emptyStringToNull, dateOnly } from "./index";
import {
  serializeEntityInput,
  deserializeEntityRow,
  serializeSyncPayload,
  deserializeSyncPayload,
} from "./entity-serializer";

describe("codecs", () => {
  it("normalizes currency to two decimals", () => {
    const codec = currency();
    expect(codec.toStorage(12)).toBe("12.00");
    expect(codec.toStorage("10.5")).toBe("10.50");
  });

  it("normalizes weight to three decimals", () => {
    const codec = weight();
    expect(codec.toStorage(1)).toBe("1.000");
    expect(codec.toStorage("2.45")).toBe("2.450");
  });

  it("supports nullable codecs", () => {
    const money = currency({ nullable: true });
    const kg = weight({ nullable: true });

    expect(money.toStorage(null)).toBeNull();
    expect(kg.toStorage(undefined)).toBeNull();
  });

  it("converts empty string to null", () => {
    const codec = emptyStringToNull();
    expect(codec.toStorage("")).toBeNull();
    expect(codec.toStorage("abc")).toBe("abc");
  });

  it("validates date-only format", () => {
    const codec = dateOnly();
    expect(codec.toStorage("2026-04-20")).toBe("2026-04-20");
    expect(() => codec.toStorage("2026/04/20")).toThrow();
  });

  it("serializes and deserializes entity fields with codec map", () => {
    const codecs = {
      subtotal: currency(),
      quantity: weight({ nullable: true }),
    };

    const input = {
      subtotal: 12,
      quantity: "1.5",
      productName: "Pollo",
    } as Record<string, unknown>;

    const serialized = serializeEntityInput(input, codecs);
    expect(serialized.subtotal).toBe("12.00");
    expect(serialized.quantity).toBe("1.500");
    expect(serialized.productName).toBe("Pollo");

    const row = {
      subtotal: "12",
      quantity: "1.5",
      productName: "Pollo",
    } as Record<string, unknown>;

    const deserialized = deserializeEntityRow(row, codecs);
    expect(deserialized.subtotal).toBe("12.00");
    expect(deserialized.quantity).toBe("1.500");
  });

  it("serializes and deserializes sync payloads", () => {
    const codecs = {
      amount: currency(),
    };

    const payload = { amount: 8 } as Record<string, unknown>;
    const syncPayload = serializeSyncPayload(payload, codecs);
    expect(syncPayload.amount).toBe("8.00");

    const restored = deserializeSyncPayload(syncPayload, codecs);
    expect(restored.amount).toBe("8.00");
  });
});
