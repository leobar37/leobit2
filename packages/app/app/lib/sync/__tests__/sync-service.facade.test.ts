import { describe, expect, it } from "vitest";
import { SyncService } from "../sync-service";
import { createMockPGlite } from "../testing/factories";
import { MockSyncHttpClient, MockSyncQueue } from "../testing/mocks";

describe("SyncService", () => {
  it("allows initialize() to be retried after a failed bootstrap", async () => {
    const pg = createMockPGlite();
    const queue = new MockSyncQueue();
    const httpClient = new MockSyncHttpClient();

    const execMock = pg.exec as unknown as {
      mockRejectedValueOnce: (value: Error) => void;
    };
    execMock.mockRejectedValueOnce(new Error("bootstrap failed"));

    const service = new SyncService(pg, "business-123", "token", {
      queue,
      httpClient,
    });

    await expect(service.initialize()).rejects.toThrow("bootstrap failed");
    await expect(service.initialize()).resolves.toBeUndefined();
  });
});
