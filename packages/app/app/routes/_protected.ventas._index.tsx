import { Link, useNavigate } from "react-router";
import { formatCurrency } from "~/lib/utils";
import { ShoppingCart, Search, Plus, TrendingUp } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SyncStatus } from "~/components/sync/sync-status";
import { useSales, useTodayStats } from "~/hooks/use-sales";
import { SaleCard } from "~/components/sales/sale-card";
import { useSetLayout } from "~/components/layout/app-layout";

export default function SalesPage() {
  useSetLayout({ title: "Ventas", actions: <SyncStatus /> });

  const [search, setSearch] = useState("");
  const { data: sales, isLoading, error } = useSales();
  const { data: todayStats } = useTodayStats();
  const navigate = useNavigate();

  const filteredSales = sales?.filter((sale) => {
    const searchLower = search.toLowerCase();
    return (
      sale.id.toLowerCase().includes(searchLower) ||
      (sale.clientId?.toLowerCase().includes(searchLower) ?? false) ||
      sale.saleType.toLowerCase().includes(searchLower)
    );
  });

  const sortedSales = filteredSales?.sort(
    (a, b) => new Date(b.saleDate).getTime() - new Date(a.saleDate).getTime()
  );

  return (
    <>
      <div className="space-y-4">
        {todayStats && (
          <div className="border-l-4 border-orange-500 bg-white py-3 pl-4 pr-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Ventas de hoy</p>
                <p className="text-2xl font-bold text-foreground">S/ {formatCurrency(todayStats.total)}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Cantidad</p>
                <p className="text-2xl font-bold text-foreground">{todayStats.count}</p>
              </div>
              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-orange-600" />
              </div>
            </div>
          </div>
        )}

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar venta..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 rounded-xl"
          />
        </div>

        {isLoading && (
          <div className="text-center py-8">
            <ShoppingCart className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Cargando ventas...</p>
          </div>
        )}

        {error && (
          <div className="text-center py-8">
            <p className="text-red-500">Error al cargar ventas</p>
          </div>
        )}

        {sortedSales?.length === 0 && !isLoading && (
          <div className="text-center py-8">
            <ShoppingCart className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              {search ? "No se encontraron ventas" : "No hay ventas registradas"}
            </p>
          </div>
        )}

        <div className="space-y-3">
          {sortedSales?.map((sale) => (
            <SaleCard
              key={sale.id}
              sale={sale}
              onClick={() => navigate(`/ventas/${sale.id}`)}
            />
          ))}
        </div>
      </div>

      <Link to="/ventas/nueva" className="fixed right-4 bottom-28 z-50">
        <Button
          size="icon"
          className="h-14 w-14 rounded-full bg-orange-500 hover:bg-orange-600"
        >
          <Plus className="h-6 w-6" />
        </Button>
      </Link>
    </>
  );
}
