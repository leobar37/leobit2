import { useState } from "react";
import { Link } from "react-router";
import {
  ArrowLeft,
  Calculator,
  TrendingUp,
  ShoppingCart,
  DollarSign,
  CreditCard,
  Save,
  CheckCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTodayStats } from "~/hooks/use-sales";
import { useCreateClosing, useClosingTodayStats } from "~/hooks/use-closings";
import { useSales } from "~/hooks/use-sales";

export default function CierreDiaPage() {
  const { data: todayStats, isLoading: statsLoading } = useTodayStats();
  const { data: sales } = useSales();
  const createClosing = useCreateClosing();
  const [showSuccess, setShowSuccess] = useState(false);

  const todaySales =
    sales?.filter((sale) => {
      const saleDate = new Date(sale.saleDate);
      const today = new Date();
      return (
        saleDate.getDate() === today.getDate() &&
        saleDate.getMonth() === today.getMonth() &&
        saleDate.getFullYear() === today.getFullYear()
      );
    }) || [];

  const totalKilos = todaySales.reduce((sum, sale) => {
    const neto = parseFloat(sale.netWeight || "0");
    return sum + neto;
  }, 0);

  const handleGenerarCierre = async () => {
    if (!todayStats) return;

    try {
      await createClosing.mutateAsync({
        closingDate: new Date().toISOString().split("T")[0],
        totalSales: todayStats.count,
        totalAmount: todayStats.total,
        cashAmount: todayStats.total,
        creditAmount: 0,
        totalKilos: totalKilos,
      });
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (error) {
      console.error("Error creating closing:", error);
      alert("Error al generar el cierre");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-stone-100">
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-orange-100">
        <div className="flex items-center gap-3 h-16 px-4">
          <Link to="/dashboard" className="p-2 -ml-2 rounded-xl hover:bg-orange-50">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="font-bold text-lg">Cierre del Día</h1>
        </div>
      </header>

      <main className="p-4 pb-32 space-y-4">
        {showSuccess && (
          <div className="bg-green-500 text-white p-4 rounded-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
            <CheckCircle className="h-5 w-5" />
            <span className="font-medium">Cierre generado exitosamente</span>
          </div>
        )}

        <Card className="border-0 shadow-md rounded-2xl bg-gradient-to-br from-orange-500 to-orange-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <Calculator className="h-6 w-6" />
              </div>
              <div>
                <p className="text-orange-100 text-sm">Total del Día</p>
                <p className="text-3xl font-bold">
                  S/ {todayStats ? parseFloat(todayStats.total).toFixed(2) : "0.00"}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white/10 rounded-xl p-3">
                <p className="text-orange-100 text-xs">Ventas</p>
                <p className="text-xl font-semibold">{todayStats?.count || 0}</p>
              </div>
              <div className="bg-white/10 rounded-xl p-3">
                <p className="text-orange-100 text-xs">Kilos</p>
                <p className="text-xl font-semibold">{totalKilos.toFixed(2)} kg</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md rounded-2xl">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-orange-500" />
              Resumen de Ventas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <DollarSign className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="font-medium">Ventas al Contado</p>
                  <p className="text-sm text-muted-foreground">
                    {todaySales.filter((s) => s.saleType === "contado").length}{" "}
                    ventas
                  </p>
                </div>
              </div>
              <p className="font-bold text-lg">
                S/{" "}
                {todaySales
                  .filter((s) => s.saleType === "contado")
                  .reduce((sum, s) => sum + parseFloat(s.totalAmount), 0)
                  .toFixed(2)}
              </p>
            </div>

            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                  <CreditCard className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <p className="font-medium">Ventas a Crédito</p>
                  <p className="text-sm text-muted-foreground">
                    {todaySales.filter((s) => s.saleType === "credito").length}{" "}
                    ventas
                  </p>
                </div>
              </div>
              <p className="font-bold text-lg">
                S/{" "}
                {todaySales
                  .filter((s) => s.saleType === "credito")
                  .reduce((sum, s) => sum + parseFloat(s.totalAmount), 0)
                  .toFixed(2)}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md rounded-2xl">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-orange-500" />
              Detalle de Ventas
            </CardTitle>
          </CardHeader>
          <CardContent>
            {todaySales.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">
                No hay ventas hoy
              </p>
            ) : (
              <div className="space-y-2">
                {todaySales.slice(0, 5).map((sale) => (
                  <div
                    key={sale.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-xl"
                  >
                    <div>
                      <p className="font-medium">
                        {sale.saleType === "contado" ? "Contado" : "Crédito"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(sale.saleDate).toLocaleTimeString("es-PE", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                    <p className="font-semibold">
                      S/ {parseFloat(sale.totalAmount).toFixed(2)}
                    </p>
                  </div>
                ))}
                {todaySales.length > 5 && (
                  <p className="text-center text-sm text-muted-foreground">
                    Y {todaySales.length - 5} ventas más...
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-orange-100">
        <Button
          onClick={handleGenerarCierre}
          disabled={createClosing.isPending || !todayStats || todaySales.length === 0}
          className="w-full h-14 rounded-xl bg-orange-500 hover:bg-orange-600 text-lg font-semibold"
        >
          <Save className="h-5 w-5 mr-2" />
          {createClosing.isPending ? "Guardando..." : "Generar Cierre del Día"}
        </Button>
      </div>
    </div>
  );
}
