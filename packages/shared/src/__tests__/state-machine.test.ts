import { describe, it, expect, vi } from "vitest";
import { createStateMachine, createStrictStateMachine } from "../state-machine";

describe("createStateMachine", () => {
  describe("basic functionality", () => {
    it("should create a state machine with initial state", () => {
      const machine = createStateMachine({
        initial: "idle",
        states: {
          idle: {},
          loading: {},
        },
      });

      expect(machine.getState()).toBe("idle");
    });

    it("should transition between states", () => {
      const machine = createStateMachine({
        initial: "idle",
        states: {
          idle: { on: { start: "loading" } },
          loading: { on: { complete: "done" } },
          done: {},
        },
      });

      expect(machine.transition("start")).toBe("loading");
      expect(machine.getState()).toBe("loading");

      expect(machine.transition("complete")).toBe("done");
      expect(machine.getState()).toBe("done");
    });

    it("should return null for invalid transitions", () => {
      const machine = createStateMachine({
        initial: "idle",
        states: {
          idle: { on: { start: "loading" } },
          loading: {},
        },
      });

      expect(machine.transition("invalid")).toBeNull();
      expect(machine.getState()).toBe("idle");
    });

    it("should reset to initial state", () => {
      const machine = createStateMachine({
        initial: "idle",
        states: {
          idle: { on: { start: "loading" } },
          loading: {},
        },
      });

      machine.transition("start");
      expect(machine.getState()).toBe("loading");

      machine.reset();
      expect(machine.getState()).toBe("idle");
    });
  });

  describe("callbacks", () => {
    it("should call onEnter when entering a state", () => {
      const onEnterLoading = vi.fn();
      const machine = createStateMachine({
        initial: "idle",
        states: {
          idle: { on: { start: "loading" } },
          loading: { onEnter: onEnterLoading },
        },
      });

      machine.transition("start");

      expect(onEnterLoading).toHaveBeenCalledWith("idle");
    });

    it("should call onExit when exiting a state", () => {
      const onExitIdle = vi.fn();
      const machine = createStateMachine({
        initial: "idle",
        states: {
          idle: { on: { start: "loading" }, onExit: onExitIdle },
          loading: {},
        },
      });

      machine.transition("start");

      expect(onExitIdle).toHaveBeenCalledWith("loading");
    });

    it("should call callbacks in correct order", () => {
      const order: string[] = [];

      const machine = createStateMachine({
        initial: "idle",
        states: {
          idle: {
            on: { start: "loading" },
            onExit: () => order.push("exit-idle"),
          },
          loading: {
            onEnter: () => order.push("enter-loading"),
          },
        },
      });

      machine.transition("start");

      expect(order).toEqual(["exit-idle", "enter-loading"]);
    });
  });

  describe("subscriptions", () => {
    it("should notify subscribers on state change", () => {
      const callback = vi.fn();
      const machine = createStateMachine({
        initial: "idle",
        states: {
          idle: { on: { start: "loading" } },
          loading: {},
        },
      });

      machine.subscribe(callback);
      machine.transition("start");

      expect(callback).toHaveBeenCalledWith("loading", "idle", "start");
    });

    it("should allow unsubscribing", () => {
      const callback = vi.fn();
      const machine = createStateMachine({
        initial: "idle",
        states: {
          idle: { on: { start: "loading" } },
          loading: {},
        },
      });

      const unsubscribe = machine.subscribe(callback);
      unsubscribe();

      machine.transition("start");

      expect(callback).not.toHaveBeenCalled();
    });

    it("should notify multiple subscribers", () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();
      const machine = createStateMachine({
        initial: "idle",
        states: {
          idle: { on: { start: "loading" } },
          loading: {},
        },
      });

      machine.subscribe(callback1);
      machine.subscribe(callback2);
      machine.transition("start");

      expect(callback1).toHaveBeenCalledWith("loading", "idle", "start");
      expect(callback2).toHaveBeenCalledWith("loading", "idle", "start");
    });

    it("should notify on reset", () => {
      const callback = vi.fn();
      const machine = createStateMachine({
        initial: "idle",
        states: {
          idle: { on: { start: "loading" } },
          loading: {},
        },
      });

      machine.transition("start");
      machine.subscribe(callback);
      machine.reset();

      expect(callback).toHaveBeenCalledWith("idle", "loading", undefined);
    });
  });

  describe("queries", () => {
    it("should check if transition is valid", () => {
      const machine = createStateMachine({
        initial: "idle",
        states: {
          idle: { on: { start: "loading" } },
          loading: {},
        },
      });

      expect(machine.canTransition("start")).toBe(true);
      expect(machine.canTransition("invalid")).toBe(false);
    });

    it("should get valid events for current state", () => {
      const machine = createStateMachine({
        initial: "idle",
        states: {
          idle: { on: { start: "loading", abort: "error" } },
          loading: {},
          error: {},
        },
      });

      expect(machine.getValidEvents()).toEqual(["start", "abort"]);
    });

    it("should return empty array when no transitions defined", () => {
      const machine = createStateMachine({
        initial: "idle",
        states: {
          idle: {},
        },
      });

      expect(machine.getValidEvents()).toEqual([]);
    });

    it("should get all states", () => {
      const machine = createStateMachine({
        initial: "idle",
        states: {
          idle: {},
          loading: {},
          done: {},
        },
      });

      expect(machine.getAllStates()).toEqual(["idle", "loading", "done"]);
    });
  });

  describe("validation", () => {
    it("should throw for invalid transition target", () => {
      expect(() =>
        createStateMachine({
          initial: "idle",
          states: {
            idle: { on: { start: "nonexistent" as const } },
          },
        })
      ).toThrow('Invalid transition: "idle" on "start" targets unknown state');
    });
  });

  describe("complex state machines", () => {
    it("should handle circular transitions", () => {
      const machine = createStateMachine({
        initial: "a",
        states: {
          a: { on: { next: "b" } },
          b: { on: { next: "c" } },
          c: { on: { next: "a" } },
        },
      });

      machine.transition("next"); // a -> b
      machine.transition("next"); // b -> c
      machine.transition("next"); // c -> a

      expect(machine.getState()).toBe("a");
    });

    it("should handle branching paths", () => {
      const machine = createStateMachine({
        initial: "start",
        states: {
          start: { on: { a: "pathA", b: "pathB" } },
          pathA: {},
          pathB: {},
        },
      });

      const machineA = createStateMachine({
        initial: "start",
        states: {
          start: { on: { a: "pathA", b: "pathB" } },
          pathA: {},
          pathB: {},
        },
      });

      machineA.transition("a");
      expect(machineA.getState()).toBe("pathA");

      const machineB = createStateMachine({
        initial: "start",
        states: {
          start: { on: { a: "pathA", b: "pathB" } },
          pathA: {},
          pathB: {},
        },
      });

      machineB.transition("b");
      expect(machineB.getState()).toBe("pathB");
    });
  });
});

describe("createStrictStateMachine", () => {
  it("should allow valid transitions", () => {
    const machine = createStrictStateMachine({
      initial: "idle",
      states: {
        idle: { on: { start: "loading" } },
        loading: { on: { success: "done" } },
        done: {},
      },
      allowedTransitions: [
        { from: "idle", to: "loading" },
        { from: "loading", to: "done" },
      ],
    });

    expect(machine.transition("start")).toBe("loading");
    expect(machine.transition("success")).toBe("done");
  });

  it("should throw for disallowed transitions", () => {
    const machine = createStrictStateMachine({
      initial: "idle",
      states: {
        idle: { on: { start: "loading", skip: "done" } },
        loading: {},
        done: {},
      },
      allowedTransitions: [{ from: "idle", to: "loading" }],
    });

    expect(() => machine.transition("skip")).toThrow(
      'Invalid transition: "idle" → "done" is not in allowed transitions'
    );
  });
});

// Test case matching the sync stage use case
describe("sync stage state machine pattern", () => {
  it("should model sync stage lifecycle", () => {
    const machine = createStateMachine({
      initial: "pending",
      states: {
        pending: { on: { start: "loading" } },
        loading: { on: { success: "complete", fail: "error", pause: "paused" } },
        paused: { on: { resume: "loading" } },
        complete: { on: { reset: "pending" } },
        error: { on: { retry: "loading", reset: "pending" } },
      },
    });

    // Happy path
    expect(machine.getState()).toBe("pending");
    machine.transition("start");
    expect(machine.getState()).toBe("loading");
    machine.transition("success");
    expect(machine.getState()).toBe("complete");

    // Reset
    machine.reset();
    expect(machine.getState()).toBe("pending");

    // Error path
    machine.transition("start");
    machine.transition("fail");
    expect(machine.getState()).toBe("error");

    // Retry
    machine.transition("retry");
    expect(machine.getState()).toBe("loading");

    // Pause/Resume
    machine.transition("pause");
    expect(machine.getState()).toBe("paused");
    machine.transition("resume");
    expect(machine.getState()).toBe("loading");
  });

  it("should track sync progress through subscriptions", () => {
    const states: string[] = [];

    const machine = createStateMachine({
      initial: "pending",
      states: {
        pending: { on: { start: "loading" } },
        loading: { on: { success: "complete" } },
        complete: {},
      },
    });

    machine.subscribe((state) => states.push(state));

    machine.transition("start");
    machine.transition("success");

    expect(states).toEqual(["loading", "complete"]);
  });
});
