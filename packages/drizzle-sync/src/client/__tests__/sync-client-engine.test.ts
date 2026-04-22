/**
 * SyncClientEngine Integration Validation
 *
 * Tests the engine contract without requiring a real PGlite instance.
 * Uses mock implementations for PGlite and HTTP client.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { SyncClientEngine } from "../sync-client-engine";
import { createSyncClientEngine } from "../create-sync-client-engine";
import type { SyncClientEngineConfig, EntityServiceDefinition } from "../types";

function createMockPg() {
  return {
    exec: vi.fn().mockResolvedValue({ rows: [] }),
    query: vi.fn().mockResolvedValue({ rows: [] }),
  };
}

function createMockConfig(
  overrides?: Partial<SyncClientEngineConfig>
): SyncClientEngineConfig {
  return {
    pg: createMockPg() as any,
    db: {} as any,
    tenantId: "biz-001",
    userId: "user-001",
    authToken: "token-abc",
    apiUrl: "http://localhost:5201",
    httpClient: {
      postBatch: vi.fn().mockResolvedValue({ success: true, results: [] }),
      getChanges: vi.fn().mockResolvedValue({
        changes: [],
        nextSince: "cursor-1",
        hasMore: false,
      }),
      abort: vi.fn(),
    },
    entities: [],
    isOnline: () => true,
    ...overrides,
  };
}

describe("createSyncClientEngine", () => {
  it("returns a SyncClientEngine instance with valid config", () => {
    const config = createMockConfig();
    const engine = createSyncClientEngine(config);
    expect(engine).toBeInstanceOf(SyncClientEngine);
  });

  it("throws if pg is missing", () => {
    const config = createMockConfig({ pg: undefined as any });
    expect(() => createSyncClientEngine(config)).toThrow("databaseConfig");
  });

  it("throws if tenantId is missing", () => {
    const config = createMockConfig({ tenantId: "" });
    expect(() => createSyncClientEngine(config)).toThrow("tenantId");
  });

  it("throws if authToken is missing", () => {
    const config = createMockConfig({ authToken: "" });
    expect(() => createSyncClientEngine(config)).toThrow("authToken");
  });

  it("throws if apiUrl is missing", () => {
    const config = createMockConfig({ apiUrl: "" });
    expect(() => createSyncClientEngine(config)).toThrow("apiUrl");
  });

  it("throws if httpClient is missing", () => {
    const config = createMockConfig({ httpClient: undefined as any });
    expect(() => createSyncClientEngine(config)).toThrow("httpClient");
  });
});

describe("SyncClientEngine", () => {
  it("starts in uninitialized state", () => {
    const engine = new SyncClientEngine(createMockConfig());
    const status = engine.getStatus();
    expect(status.isInitialized).toBe(false);
    expect(status.isRunning).toBe(false);
  });

  it("getEventEmitter returns an emitter before initialization", () => {
    const engine = new SyncClientEngine(createMockConfig());
    const emitter = engine.getEventEmitter();
    expect(emitter).toBeDefined();
    expect(typeof emitter.on).toBe("function");
    expect(typeof emitter.emit).toBe("function");
  });

  it("getService throws for nonexistent service", () => {
    const engine = new SyncClientEngine(createMockConfig());
    expect(() => engine.getService("nonexistent")).toThrow(
      "Service 'nonexistent' not found"
    );
  });

  it("hasService returns false for unregistered service", () => {
    const engine = new SyncClientEngine(createMockConfig());
    expect(engine.hasService("customers")).toBe(false);
  });

  it("getAllServiceNames returns empty array before initialization", () => {
    const engine = new SyncClientEngine(createMockConfig());
    expect(engine.getAllServiceNames()).toEqual([]);
  });

  it("start() throws if not initialized", async () => {
    const engine = new SyncClientEngine(createMockConfig());
    await expect(engine.start()).rejects.toThrow("not initialized");
  });

  it("triggerSync() throws if not initialized", async () => {
    const engine = new SyncClientEngine(createMockConfig());
    await expect(engine.triggerSync()).rejects.toThrow("not initialized");
  });

  it("triggerPull() throws if not initialized", async () => {
    const engine = new SyncClientEngine(createMockConfig());
    await expect(engine.triggerPull()).rejects.toThrow("not initialized");
  });

  it("stop() does nothing if not running", async () => {
    const engine = new SyncClientEngine(createMockConfig());
    await engine.stop();
    expect(engine.getStatus().isRunning).toBe(false);
  });

  it("getSyncService returns null before initialization", () => {
    const engine = new SyncClientEngine(createMockConfig());
    expect(engine.getSyncService()).toBeNull();
  });

  it("getPullService returns null before initialization", () => {
    const engine = new SyncClientEngine(createMockConfig());
    expect(engine.getPullService()).toBeNull();
  });

  it("getCoordinator returns null before initialization", () => {
    const engine = new SyncClientEngine(createMockConfig());
    expect(engine.getCoordinator()).toBeNull();
  });
});

describe("SyncClientEngine service registry", () => {
  it("registers and retrieves services via factory", async () => {
    const mockService = { name: "CustomerService", findAll: vi.fn() };
    const entityDef: EntityServiceDefinition = {
      name: "customers",
      entityType: "customers",
      factory: () => mockService,
    };

    const config = createMockConfig({ entities: [entityDef] });
    const engine = new SyncClientEngine(config);

    await engine.initialize();

    expect(engine.hasService("customers")).toBe(true);
    expect(engine.getService("customers")).toBe(mockService);
    expect(engine.getAllServiceNames()).toEqual(["customers"]);
  });

  it("registers multiple services", async () => {
    const entities: EntityServiceDefinition[] = [
      {
        name: "customers",
        entityType: "customers",
        factory: () => ({ name: "CustomerService" }),
      },
      {
        name: "sales",
        entityType: "sales",
        factory: () => ({ name: "SaleService" }),
      },
    ];

    const config = createMockConfig({ entities });
    const engine = new SyncClientEngine(config);

    await engine.initialize();

    expect(engine.getAllServiceNames()).toEqual(["customers", "sales"]);
    expect(engine.getService("customers")).toEqual({ name: "CustomerService" });
    expect(engine.getService("sales")).toEqual({ name: "SaleService" });
  });

  it("factory receives correct context", async () => {
    let receivedContext: any = null;

    const entityDef: EntityServiceDefinition = {
      name: "test",
      entityType: "test",
      factory: (ctx) => {
        receivedContext = ctx;
        return {};
      },
    };

    const config = createMockConfig({ entities: [entityDef] });
    const engine = new SyncClientEngine(config);

    await engine.initialize();

    expect(receivedContext).toBeDefined();
    expect(receivedContext.tenantId).toBe("biz-001");
    expect(receivedContext.userId).toBe("user-001");
    expect(receivedContext.pg).toBeDefined();
    expect(receivedContext.db).toBeDefined();
    expect(receivedContext.syncService).toBeDefined();
  });

  it("initialize is idempotent", async () => {
    const entityDef: EntityServiceDefinition = {
      name: "test",
      entityType: "test",
      factory: () => ({}),
    };

    const config = createMockConfig({ entities: [entityDef] });
    const engine = new SyncClientEngine(config);

    await engine.initialize();
    await engine.initialize();

    expect(engine.getAllServiceNames()).toEqual(["test"]);
  });
});

describe("SyncClientEngine event bridge", () => {
  it("event emitter is usable before initialization", () => {
    const engine = new SyncClientEngine(createMockConfig());
    const emitter = engine.getEventEmitter();

    let received = false;
    emitter.on("coordinator:started", () => {
      received = true;
    });

    emitter.emit("coordinator:started", { timestamp: new Date().toISOString() });
    expect(received).toBe(true);
  });

  it("supports onPullComplete callback via config", async () => {
    const onPullComplete = vi.fn();

    const config = createMockConfig({
      callbacks: { onPullComplete },
    });
    const engine = new SyncClientEngine(config);

    await engine.initialize();

    engine.getEventEmitter().emit("pull:complete", {
      changesApplied: 5,
      entityTypes: ["customers", "sales"],
      hasMore: false,
      timestamp: new Date().toISOString(),
    });

    expect(onPullComplete).toHaveBeenCalledWith({
      changesApplied: 5,
      entityTypes: ["customers", "sales"],
    });
  });

  it("supports onPushComplete callback via config", async () => {
    const onPushComplete = vi.fn();

    const config = createMockConfig({
      callbacks: { onPushComplete },
    });
    const engine = new SyncClientEngine(config);

    await engine.initialize();

    engine.getEventEmitter().emit("push:complete", {
      operationsProcessed: 3,
      succeeded: 2,
      failed: 1,
      conflicts: 0,
      timestamp: new Date().toISOString(),
    });

    expect(onPushComplete).toHaveBeenCalledWith({
      processed: 3,
      failed: 1,
      conflicts: 0,
    });
  });

  it("supports onError callback via config", async () => {
    const onError = vi.fn();

    const config = createMockConfig({
      callbacks: { onError },
    });
    const engine = new SyncClientEngine(config);

    await engine.initialize();

    engine.getEventEmitter().emit("pull:error", {
      error: "Network timeout",
      consecutiveFailures: 2,
      timestamp: new Date().toISOString(),
    });

    expect(onError).toHaveBeenCalledWith("Network timeout", "pull");
  });
});

describe("SyncClientEngine status", () => {
  it("getStatus returns correct shape before initialization", () => {
    const engine = new SyncClientEngine(createMockConfig());
    const status = engine.getStatus();

    expect(status).toEqual({
      isInitialized: false,
      isRunning: false,
      pending: 0,
      failed: 0,
      conflict: 0,
      deadLetter: 0,
      isStuck: false,
      lastSyncTime: null,
      isOnline: true,
    });
  });
});
