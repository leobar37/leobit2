import { describe, expect, it, vi, beforeEach } from "vitest";
import { StateMachine, StateMachineRegistry, createMachine } from "./state-machine";

interface TestEntity {
  id: string;
  status: string;
  items: Array<{ id: string; quantity: number }>;
}

type TestState = "draft" | "pending" | "approved" | "rejected";

describe("StateMachine", () => {
  let machine: StateMachine<TestEntity, TestState>;

  beforeEach(() => {
    machine = createMachine<TestEntity, TestState>({
      name: "test",
      initialState: "draft",
      states: ["draft", "pending", "approved", "rejected"],
    });
  });

  describe("constructor", () => {
    it("creates machine with config", () => {
      expect(machine.getName()).toBe("test");
      expect(machine.getInitialState()).toBe("draft");
      expect(machine.getValidStates()).toEqual(["draft", "pending", "approved", "rejected"]);
    });

    it("validates valid states", () => {
      expect(machine.isValidState("draft")).toBe(true);
      expect(machine.isValidState("pending")).toBe(true);
      expect(machine.isValidState("approved")).toBe(true);
      expect(machine.isValidState("rejected")).toBe(true);
      expect(machine.isValidState("unknown")).toBe(false);
    });
  });

  describe("onTransition", () => {
    it("registers hook for transition", () => {
      const hook = vi.fn();
      machine.onTransition("draft", "pending", hook);

      expect(machine).toBeDefined();
    });

    it("allows chaining multiple hooks", () => {
      const hook1 = vi.fn();
      const hook2 = vi.fn();

      machine
        .onTransition("draft", "pending", hook1)
        .onTransition("draft", "pending", hook2);

      expect(machine).toBeDefined();
    });

    it("registers hooks for different transitions", () => {
      const hook1 = vi.fn();
      const hook2 = vi.fn();

      machine
        .onTransition("draft", "pending", hook1)
        .onTransition("pending", "approved", hook2);

      expect(machine).toBeDefined();
    });

    it("handles null from state", () => {
      const hook = vi.fn();
      machine.onTransition(null, "draft", hook);

      expect(machine).toBeDefined();
    });
  });

  describe("executeTransition", () => {
    it("executes registered hooks", async () => {
      const hook = vi.fn();
      const entity: TestEntity = { id: "1", status: "draft", items: [] };
      const ctx = {} as any;

      machine.onTransition("draft", "pending", hook);
      await machine.executeTransition(ctx, entity, "draft", "pending");

      expect(hook).toHaveBeenCalledWith(ctx, entity, undefined);
    });

    it("does nothing if no hooks registered", async () => {
      const entity: TestEntity = { id: "1", status: "draft", items: [] };
      const ctx = {} as any;

      await machine.executeTransition(ctx, entity, "draft", "pending");

      expect(true).toBe(true);
    });

    it("executes multiple hooks in order", async () => {
      const order: string[] = [];
      const hook1 = vi.fn(async () => { order.push("first"); });
      const hook2 = vi.fn(async () => { order.push("second"); });
      const entity: TestEntity = { id: "1", status: "draft", items: [] };
      const ctx = {} as any;

      machine
        .onTransition("draft", "pending", hook1)
        .onTransition("draft", "pending", hook2);

      await machine.executeTransition(ctx, entity, "draft", "pending");

      expect(order).toEqual(["first", "second"]);
    });

    it("passes context and entity to hooks", async () => {
      const hook = vi.fn();
      const entity: TestEntity = { id: "test-id", status: "draft", items: [{ id: "item-1", quantity: 5 }] };
      const ctx = { businessId: "biz-1", userId: "user-1" } as any;

      machine.onTransition("draft", "pending", hook);
      await machine.executeTransition(ctx, entity, "draft", "pending");

      expect(hook).toHaveBeenCalledWith(ctx, entity, undefined);
    });

    it("handles null from state", async () => {
      const hook = vi.fn();
      const entity: TestEntity = { id: "1", status: "draft", items: [] };
      const ctx = {} as any;

      machine.onTransition(null, "draft", hook);
      await machine.executeTransition(ctx, entity, null, "draft");

      expect(hook).toHaveBeenCalledWith(ctx, entity, undefined);
    });

    it("passes tx parameter to hooks", async () => {
      const hook = vi.fn();
      const entity: TestEntity = { id: "1", status: "draft", items: [] };
      const ctx = {} as any;
      const tx = { id: "tx-1" };

      machine.onTransition("draft", "pending", hook);
      await machine.executeTransition(ctx, entity, "draft", "pending", tx);

      expect(hook).toHaveBeenCalledWith(ctx, entity, tx);
    });
  });
});

describe("StateMachineRegistry", () => {
  beforeEach(() => {
    StateMachineRegistry.getAll().clear();
  });

  it("registers machine", () => {
    const machine = createMachine<TestEntity, TestState>({
      name: "test",
      initialState: "draft",
      states: ["draft", "pending"],
    });

    StateMachineRegistry.register("test", machine);

    expect(StateMachineRegistry.get("test")).toBe(machine);
  });

  it("retrieves machine by name", () => {
    const machine = createMachine<TestEntity, TestState>({
      name: "test",
      initialState: "draft",
      states: ["draft", "pending"],
    });

    StateMachineRegistry.register("test", machine);
    const retrieved = StateMachineRegistry.get<TestEntity, TestState>("test");

    expect(retrieved).toBe(machine);
  });

  it("returns undefined for unknown machine", () => {
    const retrieved = StateMachineRegistry.get("unknown");

    expect(retrieved).toBeUndefined();
  });

  it("returns all machines", () => {
    const machine1 = createMachine<TestEntity, TestState>({
      name: "test1",
      initialState: "draft",
      states: ["draft"],
    });
    const machine2 = createMachine<TestEntity, TestState>({
      name: "test2",
      initialState: "draft",
      states: ["draft"],
    });

    StateMachineRegistry.register("test1", machine1);
    StateMachineRegistry.register("test2", machine2);

    const all = StateMachineRegistry.getAll();

    expect(all.size).toBe(2);
    expect(all.get("test1")).toBe(machine1);
    expect(all.get("test2")).toBe(machine2);
  });
});

describe("createMachine", () => {
  it("creates a StateMachine instance", () => {
    const machine = createMachine<TestEntity, TestState>({
      name: "test",
      initialState: "draft",
      states: ["draft", "pending", "approved"],
    });

    expect(machine).toBeInstanceOf(StateMachine);
    expect(machine.getName()).toBe("test");
  });
});

describe("StateMachine with allowedTransitions", () => {
  let machine: StateMachine<TestEntity, TestState>;

  beforeEach(() => {
    machine = createMachine<TestEntity, TestState>({
      name: "test",
      initialState: "draft",
      states: ["draft", "pending", "approved", "rejected"],
      allowedTransitions: [
        { from: "draft", to: "pending" },
        { from: "pending", to: "approved" },
        { from: "pending", to: "rejected" },
      ],
    });
  });

  it("allows valid transitions", async () => {
    const hook = vi.fn();
    const entity: TestEntity = { id: "1", status: "draft", items: [] };
    const ctx = {} as any;

    machine.onTransition("draft", "pending", hook);
    await machine.executeTransition(ctx, entity, "draft", "pending");

    expect(hook).toHaveBeenCalledOnce();
  });

  it("throws error for disallowed transitions", async () => {
    const entity: TestEntity = { id: "1", status: "draft", items: [] };
    const ctx = {} as any;

    await expect(
      machine.executeTransition(ctx, entity, "draft", "rejected")
    ).rejects.toThrow("Invalid transition for test: draft → rejected");
  });

  it("throws error for reverse disallowed transitions", async () => {
    const entity: TestEntity = { id: "1", status: "approved", items: [] };
    const ctx = {} as any;

    await expect(
      machine.executeTransition(ctx, entity, "approved", "pending")
    ).rejects.toThrow("Invalid transition for test: approved → pending");
  });

  it("includes allowed transitions in error message", async () => {
    const entity: TestEntity = { id: "1", status: "draft", items: [] };
    const ctx = {} as any;

    await expect(
      machine.executeTransition(ctx, entity, "draft", "rejected")
    ).rejects.toThrow(/Allowed transitions:/);
  });

  it("executes hooks for allowed transition with null from state", async () => {
    const machineWithNull = createMachine<TestEntity, TestState>({
      name: "test",
      initialState: "draft",
      states: ["draft", "pending", "approved", "rejected"],
      allowedTransitions: [
        { from: null, to: "draft" },
        { from: "draft", to: "pending" },
      ],
    });

    const hook = vi.fn();
    const entity: TestEntity = { id: "1", status: "draft", items: [] };
    const ctx = {} as any;

    machineWithNull.onTransition(null, "draft", hook);
    await machineWithNull.executeTransition(ctx, entity, null, "draft");

    expect(hook).toHaveBeenCalledOnce();
  });

  it("throws for null from state not in allowed transitions", async () => {
    const entity: TestEntity = { id: "1", status: "draft", items: [] };
    const ctx = {} as any;

    await expect(
      machine.executeTransition(ctx, entity, null, "draft")
    ).rejects.toThrow("Invalid transition for test: null → draft");
  });

  it("backward compatible: machines without allowedTransitions accept any transition", async () => {
    const openMachine = createMachine<TestEntity, TestState>({
      name: "open",
      initialState: "draft",
      states: ["draft", "pending", "approved", "rejected"],
    });

    const hook = vi.fn();
    const entity: TestEntity = { id: "1", status: "draft", items: [] };
    const ctx = {} as any;

    openMachine.onTransition("draft", "rejected", hook);
    await openMachine.executeTransition(ctx, entity, "draft", "rejected");

    expect(hook).toHaveBeenCalledOnce();
  });
});