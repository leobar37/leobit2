import { useState } from "react";
import { Clock, Search, ChevronDown, ChevronUp, RefreshCw } from "lucide-react";
import { Button, Input, Badge, ScrollArea } from "../ui/primitives";
import {
  useSyncTimeline,
  getEventIcon,
  getEventColor,
  type TimelineFilter,
} from "../hooks/use-sync-timeline";
import { cn } from "../ui/primitives";

const FILTER_OPTIONS: { value: TimelineFilter; label: string }[] = [
  { value: "all", label: "Todos" },
  { value: "pull", label: "Pull" },
  { value: "push", label: "Push" },
  { value: "conflict", label: "Conflictos" },
  { value: "error", label: "Errores" },
  { value: "other", label: "Otros" },
];

export function TimelineTab() {
  const { filteredEvents, filter, setFilter, searchQuery, setSearchQuery, isLoading } = useSyncTimeline();
  const [expandedEvents, setExpandedEvents] = useState<Set<string>>(new Set());

  const toggleExpanded = (id: string) => {
    setExpandedEvents((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold">Timeline de eventos</h3>
          <p className="text-xs text-gray-500">{filteredEvents.length} eventos</p>
        </div>
        {isLoading && <RefreshCw className="h-4 w-4 animate-spin text-gray-400" />}
      </div>

      <div className="flex flex-wrap gap-1">
        {FILTER_OPTIONS.map((opt) => (
          <Button
            key={opt.value}
            variant={filter === opt.value ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter(opt.value)}
            className="h-7 px-2 text-xs"
          >
            {opt.label}
          </Button>
        ))}
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <Input
          placeholder="Buscar por mensaje, tipo o datos..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="h-10 pl-10 pr-4"
        />
      </div>

      <ScrollArea className="min-h-[200px] max-h-[50vh]">
        {filteredEvents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Clock className="h-12 w-12 text-gray-400 mb-2" />
            <p className="text-sm text-gray-500">
              {searchQuery ? "No se encontraron eventos" : "No hay eventos registrados"}
            </p>
          </div>
        ) : (
          <div className="space-y-1 pr-2">
            {filteredEvents.map((event) => {
              const isExpanded = expandedEvents.has(event.id);
              const hasData = event.data !== null && event.data !== undefined && Object.keys(event.data as Record<string, unknown>).length > 0;

              return (
                <div key={event.id} className="rounded-lg border bg-white p-2 hover:bg-gray-50/50 transition-colors">
                  <div
                    className="flex items-start gap-2 cursor-pointer"
                    onClick={() => hasData && toggleExpanded(event.id)}
                  >
                    <span className={cn("text-sm font-mono mt-0.5", getEventColor(event.type))}>
                      {getEventIcon(event.type)}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-gray-500">
                          {event.timestamp.toLocaleTimeString()}
                        </span>
                        <Badge className="text-[10px] px-1 py-0 border">{event.type}</Badge>
                      </div>
                      <p className="text-sm mt-0.5 line-clamp-2">{event.message}</p>
                    </div>
                    {hasData && (
                      <button className="h-6 w-6 shrink-0 mt-0.5 flex items-center justify-center">
                        {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                      </button>
                    )}
                  </div>

                  {isExpanded && hasData && (
                    <div className="mt-2 pt-2 border-t">
                      <pre className="text-xs bg-gray-50 p-2 rounded overflow-x-auto">
                        {JSON.stringify(event.data, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
