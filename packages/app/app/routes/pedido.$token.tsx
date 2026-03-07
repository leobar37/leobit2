import { useParams } from "react-router";
import { Package, Loader2, AlertCircle, Calendar, DollarSign } from "lucide-react";
import { usePublicOrder } from "~/hooks/use-public-order";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "~/lib/utils";

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "-";
  const date = new Date(dateStr);
  return date.toLocaleDateString("es-PE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function PublicOrderPage() {
  const { token } = useParams<{ token: string }>();
  const { data: order, isLoading, error } = usePublicOrder(token || "");

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-stone-100 p-4">
        <Card className="w-full max-w-md border-0 shadow-xl rounded-3xl">
          <CardContent className="p-8 text-center">
            <Loader2 className="h-8 w-8 animate-spin text-orange-500 mx-auto" />
            <p className="mt-4 text-muted-foreground">Cargando pedido...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-stone-100 p-4">
        <Card className="w-full max-w-md border-0 shadow-xl rounded-3xl">
          <CardContent className="p-8 text-center">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <CardTitle className="text-xl mb-2">Pedido no encontrado</CardTitle>
            <CardDescription>
              {error instanceof Error
                ? error.message
                : "Este pedido no existe o el token ha expirado"}
            </CardDescription>
          </CardContent>
        </Card>
      </div>
    );
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "draft":
        return { label: "Borrador", className: "bg-gray-100 text-gray-700 hover:bg-gray-100" };
      case "confirmed":
        return { label: "Confirmado", className: "bg-blue-100 text-blue-700 hover:bg-blue-100" };
      case "in_preparation":
        return { label: "En preparación", className: "bg-orange-100 text-orange-700 hover:bg-orange-100" };
      case "ready":
        return { label: "Listo", className: "bg-green-100 text-green-700 hover:bg-green-100" };
      case "delivered":
        return { label: "Entregado", className: "bg-gray-100 text-gray-700 hover:bg-gray-100" };
      case "cancelled":
        return { label: "Cancelado", className: "bg-red-100 text-red-700 hover:bg-red-100" };
      default:
        return { label: status, className: "bg-gray-100 text-gray-700 hover:bg-gray-100" };
    }
  };

  const status = getStatusLabel(order.status);

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-stone-100 p-4">
      <div className="max-w-2xl mx-auto">
        <Card className="border-0 shadow-xl rounded-3xl overflow-hidden">
          <CardHeader className="text-center pb-4 bg-gradient-to-br from-orange-400 to-orange-600 text-white">
            <div className="mx-auto w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center shadow-lg mb-4">
              <Package className="w-8 h-8 text-white" />
            </div>
            <CardTitle className="text-2xl text-white">Detalle del Pedido</CardTitle>
            <CardDescription className="text-white/80">
              Pedido #{order.id.slice(-8).toUpperCase()}
            </CardDescription>
          </CardHeader>

          <CardContent className="p-6 space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <Badge className={`text-sm px-3 py-1 ${status.className}`}>
                {status.label}
              </Badge>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>{formatDate(order.orderDate)}</span>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="font-semibold text-lg">Productos</h3>
              {order.items.length === 0 ? (
                <p className="text-muted-foreground text-sm">No hay productos en este pedido</p>
              ) : (
                <div className="space-y-2">
                  {order.items.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-3 bg-muted rounded-xl"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{item.productName}</p>
                        <p className="text-sm text-muted-foreground">{item.variantName}</p>
                      </div>
                      <div className="text-right ml-4">
                        <p className="font-medium">
                          {parseFloat(item.orderedQuantity).toFixed(2)} und
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {formatCurrency(parseFloat(item.unitPriceQuoted))} c/u
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {order.items.length > 0 && (
              <div className="flex items-center justify-between pt-4 border-t border-border">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-orange-500" />
                  <span className="font-semibold text-lg">Total</span>
                </div>
                <span className="text-2xl font-bold text-orange-600">
                  {formatCurrency(parseFloat(order.totalAmount))}
                </span>
              </div>
            )}

            {order.deliveryDate && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground pt-2 border-t border-border">
                <Calendar className="h-4 w-4" />
                <span>Fecha de entrega: {formatDate(order.deliveryDate)}</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
