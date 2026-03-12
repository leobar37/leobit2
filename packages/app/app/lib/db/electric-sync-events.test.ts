import { afterEach, describe, expect, it } from "vitest";
import {
  createElectricFetchClient,
  subscribeToElectricSyncEvents,
} from "./electric-sync-events";

const originalFetch = globalThis.fetch;

describe("createElectricFetchClient", () => {
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("emits must-refetch and up-to-date events from Electric responses", async () => {
    const events: Array<{ type: string; table: string }> = [];
    const unsubscribe = subscribeToElectricSyncEvents((event) => {
      events.push({ type: event.type, table: event.table });
    });

    const responses = [
      new Response(`[{"headers":{"control":"must-refetch"}}]`, {
        status: 409,
        headers: {
          "content-type": "application/json",
        },
      }),
      new Response(`[{"headers":{"control":"up-to-date"}}]`, {
        status: 200,
        headers: {
          "content-type": "application/json",
        },
      }),
    ];

    globalThis.fetch = async () => {
      const nextResponse = responses.shift();

      if (!nextResponse) {
        throw new Error("No mocked Electric response available");
      }

      return nextResponse;
    };

    const fetchClient = createElectricFetchClient("sale_items");

    await fetchClient("http://localhost:5201/electric");
    await fetchClient("http://localhost:5201/electric");

    unsubscribe();

    expect(events).toEqual([
      { type: "must-refetch", table: "sale_items" },
      { type: "up-to-date", table: "sale_items" },
    ]);
  });
});
