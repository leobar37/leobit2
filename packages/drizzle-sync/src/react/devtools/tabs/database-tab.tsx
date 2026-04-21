import { useState } from "react";
import { Search, Database, HardDrive, Table2 } from "lucide-react";
import { Badge, Input } from "../ui/primitives";
import type { DatabaseInfo } from "../hooks/use-database-data";

interface DatabaseTabProps {
  dbInfo: DatabaseInfo;
}

export function DatabaseTab({ dbInfo }: DatabaseTabProps) {
  const [search, setSearch] = useState("");

  const filteredItems = search.trim()
    ? dbInfo.tableSizes.filter((item) => item.table.toLowerCase().includes(search.toLowerCase()))
    : dbInfo.tableSizes;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-gray-50 rounded-xl p-3 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-blue-500">
            <Database className="h-4 w-4 text-white" />
          </div>
          <div>
            <p className="text-2xl font-bold">{dbInfo.totalRecords}</p>
            <p className="text-xs text-gray-500">Registros totales</p>
          </div>
        </div>
        <div className="bg-gray-50 rounded-xl p-3 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-purple-500">
            <Table2 className="h-4 w-4 text-white" />
          </div>
          <div>
            <p className="text-2xl font-bold">{dbInfo.tableCount}</p>
            <p className="text-xs text-gray-500">Tablas con datos</p>
          </div>
        </div>
      </div>

      {(dbInfo.lastPullTime || dbInfo.lastPushTime) && (
        <div className="rounded-xl border border-gray-200/70 bg-gray-50/40 p-3 space-y-1">
          <p className="text-xs font-medium text-gray-500">Última actividad</p>
          {dbInfo.lastPullTime && <p className="text-xs">Pull: {dbInfo.lastPullTime.toLocaleTimeString("es-PE")}</p>}
          {dbInfo.lastPushTime && <p className="text-xs">Push: {dbInfo.lastPushTime.toLocaleTimeString("es-PE")}</p>}
        </div>
      )}

      <div>
        <div className="mb-2 flex items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold">Registros por tabla</h3>
            <p className="text-xs text-gray-500">
              {dbInfo.tableSizes.filter((t) => t.count > 0).length}/{dbInfo.tableSizes.length} tablas
            </p>
          </div>
          <Badge className="bg-white border border-gray-200">
            <HardDrive className="h-3 w-3 mr-1" />PGlite
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

        <div className="space-y-1.5">
          {filteredItems.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-200 p-6 text-center text-sm text-gray-500">
              No se encontraron tablas.
            </div>
          ) : (
            filteredItems.map((item) => (
              <div
                key={item.table}
                className="flex items-center justify-between rounded-xl border border-gray-200/50 bg-white px-3 py-2.5"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{item.table}</p>
                </div>
                <Badge className={`shrink-0 bg-white border ${item.count === 0 ? "text-gray-400" : "text-gray-700"}`}>
                  {item.count}
                </Badge>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
