import { Link, useNavigate } from "react-router";
import { ArrowLeft, ShoppingCart, AlertTriangle, AlertCircle, CheckCircle } from "lucide-react";
import { formatKilos } from "~/lib/utils";
import { useStockAlerts, type StockAlert } from "~/hooks/use-stock-alerts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

function getAlertConfig(alertType: StockAlert["alertType"]) {
  switch (alertType) {
    case "negative":
      return {
        label: "Negativo",
        className: "bg-red-500 hover:bg-red-600",
        icon: AlertTriangle,
        bgColor: "bg-red-50",
        borderColor: "border-red-100",
      };
    case "critical":
      return {
        label: "Critico",
        className: "bg-orange-500 hover:bg-orange-600",
        icon: AlertTriangle,
        bgColor: "bg-orange-50",
        borderColor: "border-orange-100",
      };
    case "low":
      return {
        label: "Bajo",
        className: "bg-yellow-500 hover:bg-yellow-600",
        icon: AlertCircle,
        bgColor: "bg-yellow-50",
        borderColor: "border-yellow-100",
      };
  }
}

export default function AlertasStockPage() {
  const navigate = useNavigate();
  const { data: alerts, isLoading } = useStockAlerts();

  const negativeCount = alerts?.filter((a) => a.alertType === "negative").length || 0;
  const criticalCount = alerts?.filter((a) => a.alertType === "critical").length || 0;
  const lowCount = alerts?.filter((a) => a.alertType === "low").length || 0;
  const totalAlerts = alerts?.length || 0;

  const handleGoToPurchases = () => {
    navigate("/compras/nueva");
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-orange-100">
        <div className="flex items-center justify-between h-16 px-4">
          <div className="flex items-center gap-3">
            <Link to="/reportes" className="p-2 -ml-2 rounded-xl hover:bg-orange-50">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <h1 className="font-bold text-lg">Alertas de Inventario</h1>
          </div>
          {totalAlerts > 0 && (
            <Button
              onClick={handleGoToPurchases}
              className="bg-orange-500 hover:bg-orange-600"
              size="sm"
            >
              <ShoppingCart className="h-4 w-4 mr-2" />
              Comprar Todo
            </Button>
          )}
        </div>
      </header>

      <main className="p-4 pb-24 space-y-4">
        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-3">
          <Card className="border-red-100 bg-red-50/50">
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold text-red-600">
                {isLoading ? (
                  <span className="inline-block h-8 w-8 bg-red-100 animate-pulse rounded" />
                ) : (
                  negativeCount
                )}
              </p>
              <p className="text-xs text-red-700 font-medium">Negativos</p>
            </CardContent>
          </Card>
          <Card className="border-orange-100 bg-orange-50/50">
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold text-orange-600">
                {isLoading ? (
                  <span className="inline-block h-8 w-8 bg-orange-100 animate-pulse rounded" />
                ) : (
                  criticalCount
                )}
              </p>
              <p className="text-xs text-orange-700 font-medium">Criticos</p>
            </CardContent>
          </Card>
          <Card className="border-yellow-100 bg-yellow-50/50">
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold text-yellow-600">
                {isLoading ? (
                  <span className="inline-block h-8 w-8 bg-yellow-100 animate-pulse rounded" />
                ) : (
                  lowCount
                )}
              </p>
              <p className="text-xs text-yellow-700 font-medium">Bajos</p>
            </CardContent>
          </Card>
        </div>

        {/* Alerts List */}
        <div className="space-y-3">
          <h2 className="font-semibold text-sm text-muted-foreground">
            Productos con alertas ({totalAlerts})
          </h2>

          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <Card key={i} className="border-orange-100">
                <CardContent className="p-4">
                  <div className="h-24 bg-muted animate-pulse rounded" />
                </CardContent>
              </Card>
            ))
          ) : totalAlerts === 0 ? (
            <Card className="border-green-100 bg-green-50/50">
              <CardContent className="p-8 text-center">
                <div className="mx-auto w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mb-3">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
                <h3 className="font-medium text-lg mb-1">Inventario saludable</h3>
                <p className="text-sm text-muted-foreground">
                  Todos los productos tienen stock suficiente. No hay alertas en este momento.
                </p>
              </CardContent>
            </Card>
          ) : (
            alerts?.map((alert) => {
              const config = getAlertConfig(alert.alertType);
              const Icon = config.icon;

              return (
                <Card key={alert.variantId} className={`${config.borderColor} ${config.bgColor}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="font-medium">{alert.productName}</h3>
                        <p className="text-sm text-muted-foreground">{alert.variantName}</p>
                      </div>
                      <Badge className={config.className}>
                        <Icon className="h-3 w-3 mr-1" />
                        {config.label}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-sm mb-3">
                      <div className="bg-white/60 rounded-lg p-2 text-center">
                        <p className="text-xs text-muted-foreground">Actual</p>
                        <p className="font-medium">{formatKilos(alert.currentStock, 2)}</p>
                      </div>
                      <div className="bg-white/60 rounded-lg p-2 text-center">
                        <p className="text-xs text-muted-foreground">Minimo</p>
                        <p className="font-medium">{formatKilos(alert.criticalThreshold, 2)}</p>
                      </div>
                      <div className="bg-white/60 rounded-lg p-2 text-center">
                        <p className="text-xs text-muted-foreground">Sugerido</p>
                        <p className="font-medium text-orange-600">
                          +{formatKilos(alert.suggestedQuantity, 2)}
                        </p>
                      </div>
                    </div>

                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full"
                      onClick={handleGoToPurchases}
                    >
                      <ShoppingCart className="h-4 w-4 mr-2" />
                      Crear Orden de Compra
                    </Button>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>

        {/* Info Card */}
        <Card className="border-blue-100 bg-blue-50/50">
          <CardContent className="p-4 flex gap-3">
            <AlertCircle className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-medium text-sm text-blue-900">Umbrales de stock</h4>
              <p className="text-sm text-blue-700 mt-1">
                Los productos se marcan como "Bajo" cuando el stock es menor o igual a 10 kg,
                y "Critico" cuando es menor o igual a 5 kg. "Negativo" indica que has vendido
                mas de lo que tienes en inventario.
              </p>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
