/**
 * Event buffer for sync timeline
 * Moved from app-specific code to generic core module
 */

export interface TimelineEvent {
  id: string;
  timestamp: Date;
  type: string;
  message: string;
  data?: unknown;
}

const MAX_EVENTS = 500;
const eventBuffer: TimelineEvent[] = [];
let eventIdCounter = 0;

function generateEventId(): string {
  return `evt_${Date.now()}_${++eventIdCounter}`;
}

function createTimelineEvent(type: string, message: string, data?: unknown): TimelineEvent {
  return {
    id: generateEventId(),
    timestamp: new Date(),
    type,
    message,
    data,
  };
}

function addEvent(event: TimelineEvent): void {
  eventBuffer.push(event);
  if (eventBuffer.length > MAX_EVENTS) {
    eventBuffer.shift();
  }
}

export interface SyncEventMap {
  [key: string]: (data: unknown) => void;
}

export function initializeEventBuffer(syncEvents: {
  on: (event: string, handler: (data: unknown) => void) => (() => void);
}): () => void {
  const handlers: Array<() => void> = [];

  const handleStatusChanged = syncEvents.on("status:changed", (data) => {
    addEvent(createTimelineEvent("status:changed", "Sync status changed", data));
  });
  handlers.push(handleStatusChanged);

  const handleOperationCompleted = syncEvents.on("operation:completed", (data) => {
    const d = data as { id?: string; entityType?: string };
    addEvent(createTimelineEvent("operation:completed", `Operation ${d.id} completed (${d.entityType})`, data));
  });
  handlers.push(handleOperationCompleted);

  const handleOperationFailed = syncEvents.on("operation:failed", (data) => {
    const d = data as { id?: string };
    addEvent(createTimelineEvent("operation:failed", `Operation ${d.id} failed`, data));
  });
  handlers.push(handleOperationFailed);

  const handleOperationConflict = syncEvents.on("operation:conflict", (data) => {
    const d = data as { entityType?: string };
    addEvent(createTimelineEvent("operation:conflict", `Conflict on ${d.entityType}`, data));
  });
  handlers.push(handleOperationConflict);

  const handlePullCompleted = syncEvents.on("pull:completed", (data) => {
    const d = data as { changesApplied?: number };
    addEvent(createTimelineEvent("pull:completed", `Pull completed: ${d.changesApplied} changes`, data));
  });
  handlers.push(handlePullCompleted);

  const handlePullError = syncEvents.on("pull:error", () => {
    addEvent(createTimelineEvent("pull:error", "Pull failed"));
  });
  handlers.push(handlePullError);

  const handlePullStale = syncEvents.on("pull:stale", (data) => {
    const d = data as { reason?: string };
    addEvent(createTimelineEvent("pull:stale", `Pull stale: ${d.reason}`));
  });
  handlers.push(handlePullStale);

  const handleOnline = syncEvents.on("sync:online", () => {
    addEvent(createTimelineEvent("sync:online", "Went online"));
  });
  handlers.push(handleOnline);

  const handleOffline = syncEvents.on("sync:offline", () => {
    addEvent(createTimelineEvent("sync:offline", "Went offline"));
  });
  handlers.push(handleOffline);

  const handleCoordinatorStarted = syncEvents.on("coordinator:started", () => {
    addEvent(createTimelineEvent("coordinator:started", "Sync coordinator started"));
  });
  handlers.push(handleCoordinatorStarted);

  return () => {
    handlers.forEach((unsub) => unsub());
  };
}

export function getEventBuffer(): TimelineEvent[] {
  return [...eventBuffer];
}

export function clearEventBuffer(): void {
  eventBuffer.length = 0;
}

export function getEventsByType(type: string, maxEvents?: number): TimelineEvent[] {
  const filtered = eventBuffer.filter((e) => e.type === type);
  return maxEvents ? filtered.slice(-maxEvents) : filtered;
}
