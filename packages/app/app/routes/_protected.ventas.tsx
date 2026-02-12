import { Link, useNavigate } from "react-router";
import { ShoppingCart, Search, Plus, TrendingUp } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { SyncStatus } from "~/components/sync/sync-status";
import { useSales, useTodayStats } from "~/hooks/use-sales";
import { SaleCard } from "~/components/sales/sale-card";

export default function SalesPage() {
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
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-stone-100">
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-orange-100">
        <div className="flex items-center justify-between h-16 px-4">
          <h1 className="font-bold text-lg">Ventas</h1>
          <SyncStatus />
        </div>
      </header>

      <main className="p-4 pb-24 space-y-4">
        {todayStats && (
          <Card className="border-0 shadow-md bg-gradient-to-r from-orange-500 to-orange-600 text-white">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-orange-100 text-sm">Ventas de hoy</p>
                  <p className="text-2xl font-bold">S/ {Number(todayStats.total).toFixed(2)}</p>
                </div>
                <div className="text-right">
                  <p className="text-orange-100 text-sm">Cantidad</p>
                  <p className="text-2xl font-bold">{todayStats.count}</p>
                </div>
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                  <TrendingUp className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
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
      </main>

      <Link to="/ventas/nueva" className="fixed bottom-20 right-4 z-50">
        <Button
          size="icon"
          className="h-14 w-14 rounded-full shadow-lg bg-orange-500 hover:bg-orange-600"
        >
          <Plus className="h-6 w-6" />
        </Button>
      </Link>
    </div>
  );
}
