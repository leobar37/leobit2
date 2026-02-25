import { Link, useNavigate } from "react-router";
import { ClipboardList, Search, Plus } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SyncStatus } from "~/components/sync/sync-status";
import { useOrders } from "~/hooks/use-orders";
import { OrderCard } from "~/components/orders/order-card";
import { useSetLayout } from "~/components/layout/app-layout";

type OrderStatus = "draft" | "confirmed" | "cancelled" | "delivered" | null;

const statusFilters: { value: OrderStatus; label: string }[] = [
  { value: null, label: "Todos" },
  { value: "draft", label: "Borradores" },
  { value: "confirmed", label: "Confirmados" },
  { value: "delivered", label: "Entregados" },
  { value: "cancelled", label: "Cancelados" },
];

export default function OrdersPage() {
  useSetLayout({ title: "Pedidos", actions: <SyncStatus /> });

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<OrderStatus>(null);
  const { data: orders, isLoading, error } = useOrders(statusFilter ? { status: statusFilter } : undefined);
  const navigate = useNavigate();

  const filteredOrders = orders?.filter((order) => {
    const searchLower = search.toLowerCase();
    const clientName = order.client?.name?.toLowerCase() || "";
    return clientName.includes(searchLower);
  });

  const sortedOrders = filteredOrders?.sort((a, b) => {
    // Sort by delivery date (most recent first), then by created date
    const dateCompare = new Date(b.deliveryDate).getTime() - new Date(a.deliveryDate).getTime();
    if (dateCompare !== 0) return dateCompare;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  return (
    <>
      <div className="space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar pedido por cliente..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 rounded-xl"
          />
        </div>

        {/* Status Filters */}
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
          {statusFilters.map((filter) => (
            <Button
              key={filter.label}
              variant={statusFilter === filter.value ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter(filter.value)}
              className="rounded-full whitespace-nowrap"
            >
              {filter.label}
            </Button>
          ))}
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="text-center py-8">
            <ClipboardList className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Cargando pedidos...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="text-center py-8">
            <p className="text-red-500">Error al cargar pedidos</p>
          </div>
        )}

        {/* Empty State */}
        {sortedOrders?.length === 0 && !isLoading && (
          <div className="text-center py-8">
            <ClipboardList className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-2">No hay pedidos</p>
            <p className="text-sm text-muted-foreground">
              {search || statusFilter
                ? "Intenta con otros filtros"
                : "Crea tu primer pedido con el botón +"}
            </p>
          </div>
        )}

        {/* Orders List */}
        <div className="space-y-3">
          {sortedOrders?.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              onClick={() => navigate(`/pedidos/${order.id}`)}
            />
          ))}
        </div>
      </div>

      {/* FAB */}
      <Link
        to="/pedidos/nuevo"
        className="fixed right-4 bottom-20 z-50"
      >
        <Button
          size="icon"
          className="h-14 w-14 rounded-full shadow-lg bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700"
        >
          <Plus className="h-6 w-6" />
        </Button>
      </Link>
    </>
  );
}
