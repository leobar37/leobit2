import { Link, useNavigate } from "react-router";
import { ClipboardList, Search, Plus, Loader2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useOrders, useCreateEmptyDraft } from "~/hooks/use-orders";
import { useSetLayout } from "~/components/layout/app-layout";
import { formatCurrency } from "~/lib/utils";

type OrderStatus = "draft" | "confirmed" | "cancelled" | "delivered" | null;

const statusFilters: { value: OrderStatus; label: string }[] = [
  { value: null, label: "Todos" },
  { value: "draft", label: "Borradores" },
  { value: "confirmed", label: "Confirmados" },
  { value: "delivered", label: "Entregados" },
  { value: "cancelled", label: "Cancelados" },
];

export default function OrdersPage() {
  useSetLayout({ title: "Pedidos" });

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<OrderStatus>(null);
  const { data: orders, isLoading } = useOrders();
  const navigate = useNavigate();
  const createDraft = useCreateEmptyDraft();

  const filteredOrders = orders?.filter((order) => {
    // Filter by status
    if (statusFilter && order.status !== statusFilter) {
      return false;
    }
    // Filter by search (client ID since we don't have client name in Order type)
    if (search) {
      return order.clientId.toLowerCase().includes(search.toLowerCase());
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
      const draft = await createDraft.mutateAsync();
      navigate(`/pedidos/nuevo/${draft.id}`);
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
          disabled={createDraft.isPending}
          className="bg-orange-500 hover:bg-orange-600"
        >
          {createDraft.isPending ? (
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
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por cliente..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Status Filters */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {statusFilters.map((filter) => (
          <Button
            key={filter.label}
            variant={statusFilter === filter.value ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter(filter.value)}
            className={
              statusFilter === filter.value
                ? "bg-orange-500 hover:bg-orange-600"
                : ""
            }
          >
            {filter.label}
          </Button>
        ))}
      </div>

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
