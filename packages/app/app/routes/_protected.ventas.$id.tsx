import { useParams, useNavigate } from "react-router";
import {
  ArrowLeft,
  ShoppingCart,
  Calendar,
  User,
  DollarSign,
  Scale,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useSale } from "~/hooks/use-sales";
import { useCustomers } from "~/hooks/use-customers-live";
import { useProducts } from "~/hooks/use-products-live";

export default function SaleDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: sale, isLoading, error } = useSale(id || "");
  const { data: customers } = useCustomers();
  const { data: products } = useProducts();

  const customer = customers?.find((c) => c.id === sale?.clientId);
  const formattedDate = sale
    ? new Date(sale.saleDate).toLocaleDateString("es-PE", {
        day: "2-digit",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-stone-100 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
      </div>
    );
  }

  if (error || !sale) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-stone-100 p-4">
        <div className="max-w-md mx-auto mt-20 text-center">
          <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Venta no encontrada</h2>
          <p className="text-muted-foreground mb-4">
            {error instanceof Error ? error.message : "La venta que buscas no existe"}
          </p>
          <Button onClick={() => navigate("/ventas")}>Volver a ventas</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-stone-100">
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-orange-100">
        <div className="flex items-center h-16 px-4 gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/ventas")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="font-bold text-lg">Detalle de Venta</h1>
        </div>
      </header>

      <main className="p-4 pb-24 space-y-4">
        <Card className="border-0 shadow-md">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-orange-100 rounded-2xl flex items-center justify-center">
                <ShoppingCart className="h-7 w-7 text-orange-600" />
              </div>
              <div className="flex-1">
                <p className="text-muted-foreground text-sm">Venta #{sale.id.slice(-6)}</p>
                <div className="flex items-center gap-2 mt-1">
                  <Badge
                    variant={sale.saleType === "contado" ? "default" : "secondary"}
                    className={
                      sale.saleType === "contado"
                        ? "bg-green-100 text-green-700"
                        : "bg-blue-100 text-blue-700"
                    }
                  >
                    {sale.saleType === "contado" ? "Contado" : "Crédito"}
                  </Badge>
                  <Badge
                    variant={sale.syncStatus === "synced" ? "default" : "outline"}
                  >
                    {sale.syncStatus === "synced" ? "Sincronizado" : "Pendiente"}
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Información General</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 space-y-3">
            <div className="flex items-center gap-3">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span>{formattedDate}</span>
            </div>

            <div className="flex items-center gap-3">
              <User className="h-4 w-4 text-muted-foreground" />
              <span>{customer?.name || "Cliente general"}</span>
            </div>

            {sale.tara && (
              <div className="flex items-center gap-3">
                <Scale className="h-4 w-4 text-muted-foreground" />
                <span>Tara: {Number(sale.tara).toFixed(2)} kg</span>
              </div>
            )}

            {sale.netWeight && (
              <div className="flex items-center gap-3">
                <Scale className="h-4 w-4 text-orange-600" />
                <span className="font-medium">Neto: {Number(sale.netWeight).toFixed(2)} kg</span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Resumen de Pago</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Total</span>
              <span className="font-semibold text-lg">
                S/ {Number(sale.totalAmount).toFixed(2)}
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Pagado</span>
              <span>S/ {Number(sale.amountPaid).toFixed(2)}</span>
            </div>

            {Number(sale.balanceDue) > 0 && (
              <div className="flex justify-between items-center pt-3 border-t">
                <span className="text-red-600 font-medium">Pendiente</span>
                <span className="text-red-600 font-semibold">
                  S/ {Number(sale.balanceDue).toFixed(2)}
                </span>
              </div>
            )}

            {Number(sale.balanceDue) === 0 && (
              <div className="flex justify-between items-center pt-3 border-t">
                <span className="text-green-600 font-medium">Estado</span>
                <Badge className="bg-green-100 text-green-700">Pagado</Badge>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
