import { useState, useEffect, useCallback, useMemo } from "react";
import type { TimelineEvent } from "~/lib/sync/sync-event-buffer";
import { getEventBuffer } from "~/lib/sync/sync-event-buffer";

export type TimelineFilter = "all" | "pull" | "push" | "conflict" | "error" | "other";

const FILTER_MAP: Record<TimelineFilter, string[]> = {
  all: [],
  pull: ["pull:completed", "pull:error", "pull:stale"],
  push: ["status:changed", "operation:completed", "operation:failed", "operation:conflict"],
  conflict: ["operation:conflict"],
  error: ["operation:failed", "pull:error"],
  other: ["sync:online", "sync:offline", "coordinator:started"],
};

export interface UseSyncTimelineReturn {
  events: TimelineEvent[];
  filteredEvents: TimelineEvent[];
  filter: TimelineFilter;
  setFilter: (filter: TimelineFilter) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  isLoading: boolean;
}

export function useSyncTimeline(): UseSyncTimelineReturn {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [filter, setFilter] = useState<TimelineFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadEvents = () => {
      const buffer = getEventBuffer();
      setEvents(buffer);
      setIsLoading(false);
    };

    loadEvents();

    const interval = setInterval(loadEvents, 2000);

    return () => clearInterval(interval);
  }, []);

  const filteredEvents = useMemo(() => {
    let result = events;

    if (filter !== "all" && FILTER_MAP[filter].length > 0) {
      result = result.filter((e) => FILTER_MAP[filter].includes(e.type));
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (e) =>
          e.message.toLowerCase().includes(query) ||
          e.type.toLowerCase().includes(query) ||
          JSON.stringify(e.data || "").toLowerCase().includes(query)
      );
    }

    return result.slice().reverse();
  }, [events, filter, searchQuery]);

  return {
    events,
    filteredEvents,
    filter,
    setFilter,
    searchQuery,
    setSearchQuery,
    isLoading,
  };
}

export function getEventIcon(type: string): string {
  if (type.startsWith("pull:")) return "↓";
  if (type.startsWith("operation:")) return "↔";
  if (type === "sync:online") return "🟢";
  if (type === "sync:offline") return "🔴";
  if (type === "coordinator:started") return "▶";
  if (type === "status:changed") return "⚡";
  return "•";
}

export function getEventColor(type: string): string {
  if (type === "operation:completed" || type === "pull:completed") return "text-green-500";
  if (type === "operation:failed" || type === "pull:error") return "text-red-500";
  if (type === "operation:conflict") return "text-orange-500";
  if (type === "pull:stale") return "text-yellow-500";
  if (type === "sync:online" || type === "sync:offline") return "text-blue-500";
  return "text-gray-500";
}
