/**
 * Sync Events - Core Event Contract and Emitter
 *
 * Lightweight event system for sync observability.
 * Provides typed events for stale pull, pull complete, push complete,
 * and conflict detection without introducing new dependencies.
 *
 * ## Design Principles
 *
 * - **Zero dependencies**: Uses native Map/Set for listener management
 * - **Type-safe**: All events are typed via SyncEventTypeMap
 * - **Optional**: Event emission is optional; systems work without it
 * - **Non-blocking**: Event handlers are called synchronously but don't block
 * - **Backward compatible**: Existing callback hooks in pull-service remain
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
 * Event types for sync operations
 */
export type SyncEventType =
  | "pull:complete"
  | "pull:stale"
  | "pull:error"
  | "push:complete"
  | "push:error"
  | "conflict:detected";

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
 * Map of event types to their payload types
 */
export interface SyncEventTypeMap {
  "pull:complete": PullCompleteEvent;
  "pull:stale": PullStaleEvent;
  "pull:error": PullErrorEvent;
  "push:complete": PushCompleteEvent;
  "push:error": PushErrorEvent;
  "conflict:detected": ConflictDetectedEvent;
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
 * (e.g., in-memory, broadcast channel, etc.)
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

    for (const handler of handlers) {
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
