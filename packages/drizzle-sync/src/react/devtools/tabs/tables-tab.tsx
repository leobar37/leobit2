import { useState } from "react";
import { Search } from "lucide-react";
import { Badge, Input } from "../ui/primitives";
import type { EntitySyncSummary } from "../types";
import { EntityRow } from "../components/sync-components";

interface TablesTabProps {
  entitySummaries: EntitySyncSummary[];
}

export function TablesTab({ entitySummaries }: TablesTabProps) {
  const [search, setSearch] = useState("");

  const filteredEntitySummaries = search.trim()
    ? entitySummaries.filter((s) =>
        s.label.toLowerCase().includes(search.toLowerCase()) ||
        s.table.toLowerCase().includes(search.toLowerCase())
      )
    : entitySummaries;

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold">Entidades sincronizadas</h3>
          <p className="text-xs text-gray-500">{entitySummaries.length} tablas detectadas</p>
        </div>
        <Badge className="bg-white border border-gray-200">
          {filteredEntitySummaries.length}/{entitySummaries.length}
        </Badge>
      </div>

      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <Input
          placeholder="Buscar tabla..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-10 pl-10 pr-4"
        />
      </div>

      <div className="space-y-2">
        {filteredEntitySummaries.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-200 p-6 text-center text-sm text-gray-500">
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
