import { syncEvents, type SyncEventMap } from "~/lib/sync/sync-events";

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

export function initializeEventBuffer(): () => void {
  const handlers: Array<() => void> = [];

  const handleStatusChanged = syncEvents.on("status:changed", (data) => {
    addEvent(createTimelineEvent("status:changed", "Sync status changed", data));
  });
  handlers.push(handleStatusChanged);

  const handleOperationCompleted = syncEvents.on("operation:completed", (data) => {
    addEvent(createTimelineEvent("operation:completed", `Operation ${data.id} completed (${data.entityType})`, data));
  });
  handlers.push(handleOperationCompleted);

  const handleOperationFailed = syncEvents.on("operation:failed", (data) => {
    addEvent(createTimelineEvent("operation:failed", `Operation ${data.id} failed`, data));
  });
  handlers.push(handleOperationFailed);

  const handleOperationConflict = syncEvents.on("operation:conflict", (data) => {
    addEvent(createTimelineEvent("operation:conflict", `Conflict on ${data.entityType}`, data));
  });
  handlers.push(handleOperationConflict);

  const handlePullCompleted = syncEvents.on("pull:completed", (data) => {
    addEvent(createTimelineEvent("pull:completed", `Pull completed: ${data.changesApplied} changes`, data));
  });
  handlers.push(handlePullCompleted);

  const handlePullError = syncEvents.on("pull:error", (data) => {
    addEvent(createTimelineEvent("pull:error", "Pull failed", data));
  });
  handlers.push(handlePullError);

  const handlePullStale = syncEvents.on("pull:stale", (data) => {
    addEvent(createTimelineEvent("pull:stale", `Pull stale: ${data.reason}`, data));
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
