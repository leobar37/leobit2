import type { RequestContext } from "../context/request-context";

export type TransitionHook<Entity> = (
  ctx: RequestContext,
  entity: Entity,
  tx?: unknown
) => Promise<void>;

export interface TransitionConfig<Entity> {
  hooks: TransitionHook<Entity>[];
}

export interface StateMachineConfig<Entity, State extends string> {
  name: string;
  initialState: State;
  states: State[];
}

export class StateMachine<Entity, State extends string> {
  private name: string;
  private initialState: State;
  private states: Set<State>;
  private transitions: Map<string, TransitionConfig<Entity>[]> = new Map();

  constructor(config: StateMachineConfig<Entity, State>) {
    this.name = config.name;
    this.initialState = config.initialState;
    this.states = new Set(config.states);
  }

  onTransition(from: State | null, to: State, hook: TransitionHook<Entity>): this {
    const key = this.getTransitionKey(from, to);
    
    if (!this.transitions.has(key)) {
      this.transitions.set(key, []);
    }
    
    this.transitions.get(key)!.push({ hooks: [hook] });
    return this;
  }

  private getTransitionKey(from: State | null, to: State): string {
    return `${from ?? "null"}→${to}`;
  }

  async executeTransition(
    ctx: RequestContext,
    entity: Entity,
    from: State | null,
    to: State,
    tx?: unknown
  ): Promise<void> {
    const key = this.getTransitionKey(from, to);
    const transitionConfigs = this.transitions.get(key);

    if (!transitionConfigs) {
      return;
    }

    for (const config of transitionConfigs) {
      for (const hook of config.hooks) {
        await hook(ctx, entity, tx);
      }
    }
  }

  getInitialState(): State {
    return this.initialState;
  }

  getValidStates(): State[] {
    return Array.from(this.states);
  }

  isValidState(state: string): boolean {
    return this.states.has(state as State);
  }

  getName(): string {
    return this.name;
  }
}

export class StateMachineRegistry {
  private static machines: Map<string, StateMachine<unknown, string>> = new Map();

  static register<Entity, State extends string>(
    name: string,
    machine: StateMachine<Entity, State>
  ): void {
    StateMachineRegistry.machines.set(name, machine as StateMachine<unknown, string>);
  }

  static get<Entity, State extends string>(
    name: string
  ): StateMachine<Entity, State> | undefined {
    return StateMachineRegistry.machines.get(name) as StateMachine<Entity, State> | undefined;
  }

  static getAll(): Map<string, StateMachine<unknown, string>> {
    return StateMachineRegistry.machines;
  }
}

export function createMachine<Entity, State extends string>(
  config: StateMachineConfig<Entity, State>
): StateMachine<Entity, State> {
  return new StateMachine(config);
}