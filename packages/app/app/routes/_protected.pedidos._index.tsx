import { Link, useNavigate } from "react-router";
import { ClipboardList, Plus, Loader2 } from "lucide-react";
import { useAtomValue } from "jotai";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useOrders, useCreateEmptyOrder } from "~/hooks/use-orders";
import { useSetLayout } from "~/components/layout/app-layout";
import { formatCurrency } from "~/lib/utils";
import { searchTermAtom, statusFilterAtom } from "~/atoms/orders";
import { OrderSearchInput } from "~/components/orders/order-search-input";
import { OrderStatusFilters } from "~/components/orders/order-status-filters";

export default function OrdersPage() {
  useSetLayout({ title: "Pedidos" });

  const search = useAtomValue(searchTermAtom);
  const statusFilter = useAtomValue(statusFilterAtom);
  const { data: orders, isLoading } = useOrders();
  const navigate = useNavigate();
  const createOrder = useCreateEmptyOrder();

  const filteredOrders = orders?.filter((order) => {
    // Filter by status
    if (statusFilter && order.status !== statusFilter) {
      return false;
    }
    // Filter by search (client ID since we don't have client name in Order type)
    if (search) {
      return order.clientId?.toLowerCase().includes(search.toLowerCase()) ?? false;
    }
    return true;
  });

  const sortedOrders = filteredOrders?.sort((a, b) => {
    // Sort by delivery date (most recent first), then by created date
    const dateCompare = new Date(b.deliveryDate).getTime() - new Date(a.deliveryDate).getTime();
    if (dateCompare !== 0) return dateCompare;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const handleCreateNew = async () => {
    try {
      const order = await createOrder.mutateAsync();
      navigate(`/pedidos/nuevo/${order.id}`, { state: { order } });
    } catch {
      // Error is handled by the mutation
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-end">
        <Button
          onClick={handleCreateNew}
          disabled={createOrder.isPending}
          className="bg-orange-500 hover:bg-orange-600"
        >
          {createOrder.isPending ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Creando...
            </>
          ) : (
            <>
              <Plus className="h-4 w-4 mr-2" />
              Nuevo
            </>
          )}
        </Button>
      </div>

      {/* Search */}
      <OrderSearchInput />

      {/* Status Filters */}
      <OrderStatusFilters />

      {/* Orders List */}
      {isLoading ? (
        <div className="text-center py-8">
          <ClipboardList className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Cargando pedidos...</p>
        </div>
      ) : sortedOrders?.length === 0 ? (
        <div className="text-center py-8">
          <ClipboardList className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground mb-4">No hay pedidos</p>
          <Button onClick={() => navigate("/pedidos/nuevo")}>Crear primer pedido</Button>
        </div>
      ) : (
        <div className="space-y-3">
          {sortedOrders?.map((order) => (
            <Link
              key={order.id}
              to={`/pedidos/${order.id}`}
              className="block p-4 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow border"
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Badge
                      variant={
                        order.status === "draft"
                          ? "secondary"
                          : order.status === "confirmed"
                          ? "default"
                          : order.status === "delivered"
                          ? "outline"
                          : "destructive"
                      }
                    >
                      {order.status === "draft"
                        ? "Borrador"
                        : order.status === "confirmed"
                        ? "Confirmado"
                        : order.status === "delivered"
                        ? "Entregado"
                        : "Cancelado"}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      #{order.id.slice(0, 8)}
                    </span>
                  </div>
                  <p className="text-sm">Entrega: {order.deliveryDate}</p>
                </div>
                <div className="text-right">
                  <p className="font-medium">S/ {formatCurrency(order.totalAmount)}</p>
                  <p className="text-sm text-muted-foreground capitalize">{order.paymentIntent}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
