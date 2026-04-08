import { Badge } from "@/components/ui/badge";
import type { EntitySyncSummary } from "../types";
import { getEntityTone } from "../types";

interface EntityRowProps {
  summary: EntitySyncSummary;
}

export function EntityRow({ summary }: EntityRowProps) {
  return (
    <div className={`rounded-xl border px-3 py-3 ${getEntityTone(summary)}`}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium">{summary.label}</p>
          <p className="text-xs text-muted-foreground">
            Total local: {summary.total}
          </p>
        </div>
        <Badge variant="outline" className="bg-white/80">
          {summary.table}
        </Badge>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <Badge variant="outline" className="bg-white/80 text-orange-700">
          Pendientes: {summary.pending}
        </Badge>
        <Badge variant="outline" className="bg-white/80 text-green-700">
          Synced: {summary.synced}
        </Badge>
        <Badge variant="outline" className="bg-white/80 text-red-700">
          Error: {summary.error}
        </Badge>
      </div>
    </div>
  );
}