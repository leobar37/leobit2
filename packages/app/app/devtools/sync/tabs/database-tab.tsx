import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search, Database, HardDrive, Table2 } from "lucide-react";
import { useListSearch } from "~/hooks/use-list-search";
import type { DatabaseInfo } from "../hooks/use-database-data";

interface DatabaseTabProps {
  dbInfo: DatabaseInfo;
}

const TABLE_LABELS: Record<string, string> = {
  customers: "Clientes",
  products: "Productos",
  product_variants: "Variantes",
  suppliers: "Proveedores",
  sales: "Ventas",
  sale_items: "Items de venta",
  purchases: "Compras",
  purchase_items: "Items de compra",
  abonos: "Abonos",
  distribuciones: "Distribuciones",
  distribucion_items: "Items de distribución",
  tags: "Etiquetas",
  customer_tags: "Etiquetas por cliente",
  customer_groups: "Grupos de clientes",
  customer_group_members: "Miembros de grupos",
  visitas: "Visitas",
  sync_operations: "Operaciones de sync",
  dead_letter_operations: "Dead letter",
};

export function DatabaseTab({ dbInfo }: DatabaseTabProps) {
  const { filteredItems, search, setSearch } = useListSearch({
    items: dbInfo.tableSizes,
    searchFields: [
      (item) => item.table,
      (item) => TABLE_LABELS[item.table] ?? item.table,
    ],
    debounceMs: 150,
  });

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-muted rounded-xl p-3 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-blue-500">
            <Database className="h-4 w-4 text-white" />
          </div>
          <div>
            <p className="text-2xl font-bold">{dbInfo.totalRecords}</p>
            <p className="text-xs text-muted-foreground">Registros totales</p>
          </div>
        </div>
        <div className="bg-muted rounded-xl p-3 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-purple-500">
            <Table2 className="h-4 w-4 text-white" />
          </div>
          <div>
            <p className="text-2xl font-bold">{dbInfo.tableCount}</p>
            <p className="text-xs text-muted-foreground">Tablas con datos</p>
          </div>
        </div>
      </div>

      {(dbInfo.lastPullTime || dbInfo.lastPushTime) && (
        <div className="rounded-xl border border-border/70 bg-muted/40 p-3 space-y-1">
          <p className="text-xs font-medium text-muted-foreground">Última actividad</p>
          {dbInfo.lastPullTime && (
            <p className="text-xs">
              Pull: {dbInfo.lastPullTime.toLocaleTimeString("es-PE")}
            </p>
          )}
          {dbInfo.lastPushTime && (
            <p className="text-xs">
              Push: {dbInfo.lastPushTime.toLocaleTimeString("es-PE")}
            </p>
          )}
        </div>
      )}

      <div>
        <div className="mb-2 flex items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold">Registros por tabla</h3>
            <p className="text-xs text-muted-foreground">
              {dbInfo.tableSizes.filter((t) => t.count > 0).length}/{dbInfo.tableSizes.length} tablas
            </p>
          </div>
          <Badge variant="outline" className="bg-white/80">
            <HardDrive className="h-3 w-3 mr-1" />
            PGlite
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

        <div className="space-y-1.5">
          {filteredItems.length === 0 ? (
            <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
              No se encontraron tablas.
            </div>
          ) : (
            filteredItems.map((item) => (
              <div
                key={item.table}
                className="flex items-center justify-between rounded-xl border border-border/50 bg-background px-3 py-2.5"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">
                    {TABLE_LABELS[item.table] ?? item.table}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">{item.table}</p>
                </div>
                <Badge
                  variant="outline"
                  className={`shrink-0 bg-white/80 ${
                    item.count === 0
                      ? "text-muted-foreground"
                      : "text-foreground"
                  }`}
                >
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
