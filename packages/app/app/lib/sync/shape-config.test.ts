import { describe, expect, it } from "vitest";
import { getShapeConfig } from "./shape-config";

describe("shape-config", () => {
  it("relies on the backend proxy to scope distribucion_items", () => {
    expect(getShapeConfig("distribucion_items")).toMatchObject({
      table: "distribucion_items",
      primaryKey: ["id"],
    });
    expect(getShapeConfig("distribucion_items")?.where).toBeUndefined();
  });

  it("relies on the backend proxy to scope purchase_items", () => {
    expect(getShapeConfig("purchase_items")).toMatchObject({
      table: "purchase_items",
      primaryKey: ["id"],
    });
    expect(getShapeConfig("purchase_items")?.where).toBeUndefined();
  });
});
