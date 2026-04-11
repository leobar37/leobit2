/**
 * Generic State Machine
 *
 * A lightweight, type-safe state machine for frontend and shared code.
 * No dependencies on backend-specific types like RequestContext.
 *
 * @example
 * const machine = createStateMachine({
 *   initial: "idle",
 *   states: {
 *     idle: { on: { start: "loading" } },
 *     loading: { on: { success: "done", fail: "error" } },
 *     done: { on: { reset: "idle" } },
 *     error: { on: { retry: "loading", reset: "idle" } },
 *   },
 * });
 *
 * machine.transition("start"); // "loading"
 * machine.getState(); // "loading"
 */

/** Configuration for a single state */
export interface StateConfig<State extends string, Event extends string> {
  /** Event transitions from this state */
  on?: Partial<Record<Event, State>>;
  /** Called when entering this state */
  onEnter?: (from?: State) => void;
  /** Called when exiting this state */
  onExit?: (to: State) => void;
}

/** State machine configuration */
export interface StateMachineConfig<State extends string, Event extends string> {
  /** Initial state */
  initial: State;
  /** State definitions with transitions and callbacks */
  states: Record<State, StateConfig<State, Event>>;
}

/** State machine instance interface */
export interface StateMachine<State extends string, Event extends string> {
  /** Get current state */
  getState(): State;
  /** Attempt to transition, returns new state or null if invalid */
  transition(event: Event, context?: unknown): State | null;
  /** Check if transition is valid from current state */
  canTransition(event: Event): boolean;
  /** Get valid events for current state */
  getValidEvents(): Event[];
  /** Get all possible states */
  getAllStates(): State[];
  /** Subscribe to state changes */
  subscribe(callback: (state: State, previous: State | undefined, event?: Event) => void): () => void;
  /** Force reset to initial state (use with caution) */
  reset(): void;
}

/**
 * Create a type-safe state machine
 *
 * @param config - State machine configuration
 * @returns State machine instance
 */
export function createStateMachine<State extends string, Event extends string>(
  config: StateMachineConfig<State, Event>
): StateMachine<State, Event> {
  let currentState: State = config.initial;
  const subscribers: Array<(state: State, previous: State | undefined, event?: Event) => void> = [];

  // Validate that all transition targets are valid states
  for (const [state, stateConfig] of Object.entries(config.states) as [State, StateConfig<State, Event>][]) {
    if (stateConfig.on) {
      for (const [event, target] of Object.entries(stateConfig.on) as [Event, State][]) {
        if (!(target in config.states)) {
          throw new Error(
            `Invalid transition: "${state}" on "${event}" targets unknown state "${target}"`
          );
        }
      }
    }
  }

  function notify(state: State, previous: State | undefined, event?: Event): void {
    for (const callback of subscribers) {
      callback(state, previous, event);
    }
  }

  return {
    getState: () => currentState,

    canTransition: (event: Event): boolean => {
      const stateConfig = config.states[currentState];
      const target = stateConfig?.on?.[event];
      return target !== undefined;
    },

    getValidEvents: (): Event[] => {
      const stateConfig = config.states[currentState];
      if (!stateConfig?.on) return [];
      return Object.keys(stateConfig.on) as Event[];
    },

    getAllStates: (): State[] => {
      return Object.keys(config.states) as State[];
    },

    transition: (event: Event, _context?: unknown): State | null => {
      const stateConfig = config.states[currentState];
      const targetState = stateConfig?.on?.[event];

      if (!targetState) {
        return null; // Invalid transition
      }

      const previousState = currentState;

      // Execute exit callback
      stateConfig.onExit?.(targetState);

      // Transition
      currentState = targetState;

      // Execute enter callback
      config.states[targetState].onEnter?.(previousState);

      // Notify subscribers
      notify(currentState, previousState, event);

      return currentState;
    },

    subscribe: (callback: (state: State, previous: State | undefined, event?: Event) => void): (() => void) => {
      subscribers.push(callback);
      return () => {
        const index = subscribers.indexOf(callback);
        if (index > -1) {
          subscribers.splice(index, 1);
        }
      };
    },

    reset: (): void => {
      const previousState = currentState;
      currentState = config.initial;
      notify(currentState, previousState);
    },
  };
}

/** Helper to create a state machine with strict transition validation */
export function createStrictStateMachine<State extends string, Event extends string>(
  config: StateMachineConfig<State, Event> & {
    allowedTransitions: Array<{ from: State | null; to: State }>;
  }
): StateMachine<State, Event> {
  const allowedSet = new Set(
    config.allowedTransitions.map((t) => `${t.from ?? "null"}→${t.to}`)
  );

  const machine = createStateMachine(config);
  const originalTransition = machine.transition.bind(machine);

  return {
    ...machine,
    transition: (event: Event, context?: unknown): State | null => {
      const previousState = machine.getState();
      const targetState = originalTransition(event, context);

      if (targetState === null) {
        return null;
      }

      const transitionKey = `${previousState}→${targetState}`;
      if (!allowedSet.has(transitionKey)) {
        throw new Error(
          `Invalid transition: "${previousState}" → "${targetState}" is not in allowed transitions`
        );
      }

      return targetState;
    },
  };
}
