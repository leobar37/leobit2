import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { useListSearch } from "~/hooks/use-list-search";
import type { EntitySyncSummary } from "../types";
import { EntityRow } from "../components/entity-row";

interface TablesTabProps {
  entitySummaries: EntitySyncSummary[];
}

export function TablesTab({ entitySummaries }: TablesTabProps) {
  const { filteredItems: filteredEntitySummaries, search, setSearch } = useListSearch({
    items: entitySummaries,
    searchFields: [(summary) => summary.label, (summary) => summary.table],
    debounceMs: 150,
  });

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold">Entidades sincronizadas</h3>
          <p className="text-xs text-muted-foreground">
            {entitySummaries.length} tablas detectadas
          </p>
        </div>
        <Badge variant="outline" className="bg-white/80">
          {filteredEntitySummaries.length}/{entitySummaries.length}
        </Badge>
      </div>

      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar tabla..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-10 rounded-xl border-stone-200/80 bg-white/75 pl-10 pr-4"
        />
      </div>

      <div className="space-y-2">
        {filteredEntitySummaries.length === 0 ? (
          <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
            No se encontraron tablas.
          </div>
        ) : (
          filteredEntitySummaries.map((summary) => (
            <EntityRow key={summary.table} summary={summary} />
          ))
        )}
      </div>
    </div>
  );
}