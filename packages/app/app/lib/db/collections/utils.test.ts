import { FetchError } from "@electric-sql/client";
import { Window } from "happy-dom";
import { beforeEach, describe, expect, it } from "vitest";
import { createShapeOptions } from "./utils";

describe("createShapeOptions", () => {
  beforeEach(() => {
    const windowInstance = new Window();

    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: windowInstance,
    });
    Object.defineProperty(globalThis, "document", {
      configurable: true,
      value: windowInstance.document,
    });
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      value: windowInstance.localStorage,
    });

    window.localStorage.clear();
    window.localStorage.setItem("bearer_token", "token-123");
    window.localStorage.setItem("current_business_id", "biz-123");
  });

  it("retries retryable server errors", () => {
    const shapeOptions = createShapeOptions("sale_items");
    const onError = shapeOptions.onError;

    if (!onError) {
      throw new Error("Expected shapeOptions.onError to exist");
    }

    const error = new FetchError(
      500,
      "server error",
      undefined,
      {},
      "http://localhost:5201/electric"
    );

    expect(onError(error)).toEqual({});
  });

  it("stops retrying permanent client errors", () => {
    const shapeOptions = createShapeOptions("sale_items");
    const onError = shapeOptions.onError;

    if (!onError) {
      throw new Error("Expected shapeOptions.onError to exist");
    }

    const error = new FetchError(
      409,
      "must-refetch",
      undefined,
      {},
      "http://localhost:5201/electric"
    );

    expect(onError(error)).toBeUndefined();
  });
});
