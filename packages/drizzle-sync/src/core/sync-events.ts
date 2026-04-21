/**
 * Sync Events - Unified Event Contract and Emitter
 *
 * Lightweight event system for sync observability.
 * Provides typed events for stale pull, pull complete, push complete,
 * conflict detection, status changes, and sync state without
 * introducing new dependencies.
 *
 * ## Design Principles
 *
 * - **Zero dependencies**: Uses native Map/Set for listener management
 * - **Type-safe**: All events are typed via SyncEventTypeMap
 * - **Optional**: Event emission is optional; systems work without it
 * - **Non-blocking**: Event handlers are called synchronously but don't block
 * - **Backward compatible**: Existing callback hooks in pull-service remain
 * - **EventTargetAdapter**: Browser-compatible via EventTarget pattern
 *
 * ## Usage
 *
 * ```typescript
 * import { SyncEventEmitter, SyncEventType } from "@avileo/drizzle-sync/core";
 *
 * const emitter = new SyncEventEmitter();
 *
 * // Subscribe to events
 * emitter.on("pull:complete", (event) => {
 *   console.log(`Applied ${event.changesApplied} changes`);
 * });
 *
 * // Subscribe once (fires only once then auto-unsubscribes)
 * emitter.once("coordinator:started", () => {
 *   console.log("Coordinator is running!");
 * });
 *
 * // Emit events
 * emitter.emit("pull:complete", {
 *   changesApplied: 5,
 *   entityTypes: ["sales", "customers"],
 *   timestamp: new Date().toISOString(),
 * });
 * ```
 */

// ============================================================================
// Event Types
// ============================================================================

/**
 * Unified event types for sync operations
 */
export type SyncEventType =
  // Pull events
  | "pull:complete"
  | "pull:stale"
  | "pull:error"
  // Push events
  | "push:complete"
  | "push:error"
  // Conflict events
  | "conflict:detected"
  // Status events
  | "status:changed"
  // Operation events
  | "operation:completed"
  | "operation:failed"
  | "operation:conflict"
  // Sync state events
  | "sync:online"
  | "sync:offline"
  // Coordinator events
  | "coordinator:started"
  | "coordinator:stopped";

/**
 * Event payload for pull:complete
 */
export interface PullCompleteEvent {
  /** Number of changes applied */
  changesApplied: number;
  /** Entity types that were modified */
  entityTypes: string[];
  /** Whether more changes are available */
  hasMore: boolean;
  /** ISO timestamp when event occurred */
  timestamp: string;
  /** Optional cursor after pull */
  cursor?: string;
}

/**
 * Event payload for pull:stale
 */
export interface PullStaleEvent {
  /** Number of consecutive stale pulls */
  consecutiveStalePulls: number;
  /** Reason for stale detection */
  reason: "cursor-stuck" | "empty-pulls";
  /** ISO timestamp when event occurred */
  timestamp: string;
}

/**
 * Event payload for pull:error
 */
export interface PullErrorEvent {
  /** Error message */
  error: string;
  /** Number of consecutive failures */
  consecutiveFailures?: number;
  /** ISO timestamp when event occurred */
  timestamp: string;
}

/**
 * Event payload for push:complete
 */
export interface PushCompleteEvent {
  /** Number of operations processed */
  operationsProcessed: number;
  /** Number of operations that succeeded */
  succeeded: number;
  /** Number of operations that failed */
  failed: number;
  /** Number of conflicts detected */
  conflicts: number;
  /** ISO timestamp when event occurred */
  timestamp: string;
  /** Optional batch correlation ID */
  batchCorrelationId?: string;
}

/**
 * Event payload for push:error
 */
export interface PushErrorEvent {
  /** Error message */
  error: string;
  /** Entity type that failed */
  entityType?: string;
  /** Entity ID that failed */
  entityId?: string;
  /** ISO timestamp when event occurred */
  timestamp: string;
}

/**
 * Event payload for conflict:detected
 */
export interface ConflictDetectedEvent {
  /** Entity type with conflict */
  entityType: string;
  /** Entity ID with conflict */
  entityId: string;
  /** Client's version number */
  clientVersion: number;
  /** Server's version number */
  serverVersion: number;
  /** ISO timestamp when event occurred */
  timestamp: string;
  /** Optional correlation ID */
  correlationId?: string;
}

/**
 * Event payload for status:changed
 */
export interface StatusChangedEvent {
  /** Number of pending operations */
  pending: number;
  /** Number of failed operations */
  failed: number;
  /** Number of conflicts */
  conflict: number;
  /** Number of dead letter operations */
  deadLetter: number;
}

/**
 * Event payload for operation:completed
 */
export interface OperationCompletedEvent {
  /** Operation ID */
  id: string;
  /** Entity type */
  entityType: string;
  /** Operation type */
  operation: string;
}

/**
 * Event payload for operation:failed
 */
export interface OperationFailedEvent {
  /** Operation ID */
  id: string;
  /** Error message */
  error: string;
}

/**
 * Event payload for operation:conflict
 */
export interface OperationConflictEvent {
  /** Operation ID */
  id: string;
  /** Entity type */
  entityType: string;
}

/**
 * Event payload for sync:online / sync:offline
 */
export interface SyncStateEvent {
  /** ISO timestamp when event occurred */
  timestamp?: string;
}

/**
 * Event payload for coordinator:started / coordinator:stopped
 */
export interface CoordinatorStateEvent {
  /** ISO timestamp when event occurred */
  timestamp?: string;
}

/**
 * Map of event types to their payload types
 */
export interface SyncEventTypeMap {
  "pull:complete": PullCompleteEvent;
  "pull:stale": PullStaleEvent;
  "pull:error": PullErrorEvent;
  "push:complete": PushCompleteEvent;
  "push:error": PushErrorEvent;
  "conflict:detected": ConflictDetectedEvent;
  "status:changed": StatusChangedEvent;
  "operation:completed": OperationCompletedEvent;
  "operation:failed": OperationFailedEvent;
  "operation:conflict": OperationConflictEvent;
  "sync:online": SyncStateEvent;
  "sync:offline": SyncStateEvent;
  "coordinator:started": CoordinatorStateEvent;
  "coordinator:stopped": CoordinatorStateEvent;
}

// ============================================================================
// Event Handler Types
// ============================================================================

/**
 * Generic event handler type
 */
export type SyncEventHandler<T extends SyncEventType> = (
  event: SyncEventTypeMap[T]
) => void;

/**
 * Unsubscribe function returned when subscribing to events
 */
export type Unsubscribe = () => void;

// ============================================================================
// Event Emitter Interface
// ============================================================================

/**
 * Interface for sync event emitters
 *
 * This interface allows for different emitter implementations
 * (e.g., in-memory, broadcast channel, EventTarget adapter, etc.)
 */
export interface ISyncEventEmitter {
  /**
   * Subscribe to an event type
   * @returns Unsubscribe function
   */
  on<T extends SyncEventType>(
    eventType: T,
    handler: SyncEventHandler<T>
  ): Unsubscribe;

  /**
   * Subscribe to an event type once (auto-unsubscribes after first emission)
   */
  once<T extends SyncEventType>(
    eventType: T,
    handler: SyncEventHandler<T>
  ): void;

  /**
   * Emit an event
   */
  emit<T extends SyncEventType>(
    eventType: T,
    event: SyncEventTypeMap[T]
  ): void;

  /**
   * Remove all listeners for an event type
   */
  off(eventType: SyncEventType): void;

  /**
   * Remove all listeners for all events
   */
  clear(): void;

  /**
   * Check if there are any listeners for an event type
   */
  hasListeners(eventType: SyncEventType): boolean;
}

// ============================================================================
// EventTarget Adapter (for browser compatibility)
// ============================================================================

/**
 * EventTarget-based event emitter for browser environments.
 *
 * Uses the native EventTarget API for optimal browser compatibility
 * while providing the same interface as the in-memory emitter.
 *
 * @example
 * ```typescript
 * const emitter = new EventTargetAdapter();
 *
 * // Subscribe
 * const unsubscribe = emitter.on("pull:complete", (event) => {
 *   console.log(`Applied ${event.changesApplied} changes`);
 * });
 *
 * // Subscribe once
 * emitter.once("coordinator:started", () => {
 *   console.log("Coordinator started!");
 * });
 *
 * // Emit
 * emitter.emit("pull:complete", {
 *   changesApplied: 5,
 *   entityTypes: ["sales"],
 *   hasMore: false,
 *   timestamp: new Date().toISOString(),
 * });
 *
 * // Unsubscribe
 * unsubscribe();
 * ```
 */
export class EventTargetAdapter implements ISyncEventEmitter {
  private target: EventTarget;

  constructor(eventTarget: EventTarget = new EventTarget()) {
    this.target = eventTarget;
  }

  /**
   * Subscribe to an event type
   * @returns Unsubscribe function
   */
  on<T extends SyncEventType>(
    eventType: T,
    handler: SyncEventHandler<T>
  ): Unsubscribe {
    const wrapper = (e: CustomEvent) => handler(e.detail as SyncEventTypeMap[T]);
    this.target.addEventListener(eventType, wrapper as EventListener);
    return () => {
      this.target.removeEventListener(eventType, wrapper as EventListener);
    };
  }

  /**
   * Subscribe to an event type once (auto-unsubscribes after first emission)
   */
  once<T extends SyncEventType>(
    eventType: T,
    handler: SyncEventHandler<T>
  ): void {
    const wrapper = (e: CustomEvent) => {
      handler(e.detail as SyncEventTypeMap[T]);
    };
    let fired = false;
    const onceWrapper: EventListener = (e: Event) => {
      if (fired) return;
      fired = true;
      handler((e as CustomEvent).detail as SyncEventTypeMap[T]);
      this.target.removeEventListener(eventType, onceWrapper);
    };
    this.target.addEventListener(eventType, onceWrapper);
  }

  /**
   * Emit an event to all listeners
   */
  emit<T extends SyncEventType>(
    eventType: T,
    event: SyncEventTypeMap[T]
  ): void {
    this.target.dispatchEvent(new CustomEvent(eventType, { detail: event }));
  }

  /**
   * Remove all listeners for an event type
   */
  off(eventType: SyncEventType): void {
    // EventTarget doesn't support removing all listeners for a specific type
    // without tracking them. This is a limitation of the EventTarget API.
    // For full off() support, use SyncEventEmitter instead.
  }

  /**
   * Remove all listeners for all events
   */
  clear(): void {
    // EventTarget doesn't support clearing all listeners
    // without tracking them. This is a limitation of the EventTarget API.
    // For full clear() support, use SyncEventEmitter instead.
  }

  /**
   * Check if there are any listeners for an event type
   */
  hasListeners(eventType: SyncEventType): boolean {
    // EventTarget doesn't support listener detection
    // This is a limitation of the EventTarget API.
    return false;
  }
}

// ============================================================================
// In-Memory Event Emitter Implementation
// ============================================================================

/**
 * Lightweight in-memory event emitter for sync events.
 *
 * Uses native Map/Set for listener management with no external dependencies.
 * Thread-safe for single-threaded JavaScript environments.
 *
 * @example
 * ```typescript
 * const emitter = new SyncEventEmitter();
 *
 * // Subscribe
 * const unsubscribe = emitter.on("pull:complete", (event) => {
 *   console.log(`Applied ${event.changesApplied} changes`);
 * });
 *
 * // Subscribe once
 * emitter.once("coordinator:started", () => {
 *   console.log("Coordinator started!");
 * });
 *
 * // Emit
 * emitter.emit("pull:complete", {
 *   changesApplied: 5,
 *   entityTypes: ["sales"],
 *   hasMore: false,
 *   timestamp: new Date().toISOString(),
 * });
 *
 * // Unsubscribe
 * unsubscribe();
 * ```
 */
export class SyncEventEmitter implements ISyncEventEmitter {
  private listeners = new Map<SyncEventType, Set<SyncEventHandler<SyncEventType>>>();

  /**
   * Subscribe to an event type
   * @returns Unsubscribe function
   */
  on<T extends SyncEventType>(
    eventType: T,
    handler: SyncEventHandler<T>
  ): Unsubscribe {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }

    // Cast is safe because we're storing handlers by event type
    const handlers = this.listeners.get(eventType)!;
    handlers.add(handler as SyncEventHandler<SyncEventType>);

    return () => {
      handlers.delete(handler as SyncEventHandler<SyncEventType>);
      if (handlers.size === 0) {
        this.listeners.delete(eventType);
      }
    };
  }

  /**
   * Subscribe to an event type once (auto-unscribes after first emission)
   */
  once<T extends SyncEventType>(
    eventType: T,
    handler: SyncEventHandler<T>
  ): void {
    const unsubscribe = this.on(eventType, (event) => {
      unsubscribe();
      handler(event);
    });
  }

  /**
   * Emit an event to all listeners
   *
   * Handlers are called synchronously in insertion order.
   * Errors in handlers are caught and logged to prevent
   * one handler from affecting others.
   */
  emit<T extends SyncEventType>(
    eventType: T,
    event: SyncEventTypeMap[T]
  ): void {
    const handlers = this.listeners.get(eventType);
    if (!handlers || handlers.size === 0) {
      return;
    }

    // Create a copy to avoid mutation issues if handlers modify the listener set
    const handlersCopy = new Set(handlers);

    for (const handler of handlersCopy) {
      try {
        handler(event);
      } catch (error) {
        // Log error but don't throw - one handler failing shouldn't affect others
        console.error(
          `[SyncEventEmitter] Error in handler for ${eventType}:`,
          error
        );
      }
    }
  }

  /**
   * Remove all listeners for an event type
   */
  off(eventType: SyncEventType): void {
    this.listeners.delete(eventType);
  }

  /**
   * Remove all listeners for all events
   */
  clear(): void {
    this.listeners.clear();
  }

  /**
   * Check if there are any listeners for an event type
   */
  hasListeners(eventType: SyncEventType): boolean {
    const handlers = this.listeners.get(eventType);
    return handlers !== undefined && handlers.size > 0;
  }

  /**
   * Get the number of listeners for an event type (for testing)
   */
  listenerCount(eventType: SyncEventType): number {
    return this.listeners.get(eventType)?.size ?? 0;
  }
}

// ============================================================================
// No-Op Emitter (for performance-critical paths)
// ============================================================================

/**
 * No-operation emitter that does nothing.
 *
 * Use this when event emission is disabled or not needed.
 * All methods are no-ops for zero overhead.
 */
export class NoOpSyncEventEmitter implements ISyncEventEmitter {
  on<T extends SyncEventType>(_eventType: T, _handler: SyncEventHandler<T>): Unsubscribe {
    return () => {};
  }

  once<T extends SyncEventType>(_eventType: T, _handler: SyncEventHandler<T>): void {}

  emit<T extends SyncEventType>(_eventType: T, _event: SyncEventTypeMap[T]): void {}

  off(_eventType: SyncEventType): void {}

  clear(): void {}

  hasListeners(_eventType: SyncEventType): boolean {
    return false;
  }
}

// ============================================================================
// Default Instances
// ============================================================================

/**
 * Default no-op emitter instance.
 *
 * Use this as the default when event emission is optional.
 */
export const noOpSyncEventEmitter = new NoOpSyncEventEmitter();

/**
 * Create a new event emitter instance.
 *
 * Factory function for creating emitters with consistent configuration.
 */
export function createSyncEventEmitter(): ISyncEventEmitter {
  return new SyncEventEmitter();
}

/**
 * Create an EventTarget-based event emitter.
 *
 * Use this in browser environments for optimal compatibility
 * with the native EventTarget API.
 */
export function createEventTargetAdapter(): ISyncEventEmitter {
  return new EventTargetAdapter();
}
