import { useState } from "react";
import { Link } from "react-router";
import { toast } from "sonner";
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
import { Input } from "@/components/ui/input";
import { ToolbarActions } from "~/components/layout/toolbar-actions";
import { useCreateClosing } from "~/hooks/use-closings";
import { useSales } from "~/hooks/use-sales";
import { useBusiness } from "~/hooks/use-business";
import { getToday, parseISODate, subDays, toDateString } from "~/lib/date-utils";

export default function CierreDiaPage() {
  const { data: sales } = useSales();
  const { data: business } = useBusiness();
  const createClosing = useCreateClosing();
  const [showSuccess, setShowSuccess] = useState(false);
  const [selectedDate, setSelectedDate] = useState(getToday());
  const [backdateReason, setBackdateReason] = useState("");

  const isAdmin = business?.role === "ADMIN_NEGOCIO";
  const todayDate = getToday();
  const minBackdateDate = toDateString(subDays(todayDate, 7));
  const isBackdated = selectedDate !== todayDate;
  const isBackdateReasonInvalid = isBackdated && backdateReason.trim().length < 10;

  const selectedSales =
    sales?.filter((sale) => {
      const saleDate = toDateString(parseISODate(sale.saleDate));
      return saleDate === selectedDate;
    }) || [];

  const selectedStats = {
    count: selectedSales.length,
    total: selectedSales
      .reduce((sum, sale) => sum + parseFloat(sale.totalAmount || "0"), 0)
      .toFixed(2),
  };

  const totalKilos = selectedSales.reduce((sum, sale) => {
    const neto = parseFloat(sale.netWeight || "0");
    return sum + neto;
  }, 0);

  const handleGenerarCierre = async () => {
    if (selectedSales.length === 0) {
      toast.error("No hay ventas para la fecha seleccionada");
      return;
    }

    if (isBackdateReasonInvalid) {
      toast.error("Debe indicar un motivo de al menos 10 caracteres");
      return;
    }

    try {
      await createClosing.mutateAsync({
        closingDate: selectedDate,
        totalSales: selectedStats.count,
        totalAmount: parseFloat(selectedStats.total),
        cashAmount: parseFloat(selectedStats.total),
        creditAmount: 0,
        totalKilos: totalKilos,
        backdateReason: isBackdated ? backdateReason.trim() : undefined,
      });
      setShowSuccess(true);
      setBackdateReason("");
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (error) {
      console.error("Error creating closing:", error);
      toast.error("Error al generar el cierre");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-stone-100">
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-orange-100">
        <div className="flex items-center gap-3 h-16 px-3 sm:px-4">
          <Link to="/dashboard" className="p-2 -ml-2 rounded-xl hover:bg-orange-50">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="font-bold text-lg">Cierre del Día</h1>
        </div>
      </header>

      <main className="px-3 py-4 sm:px-4 pb-32 space-y-4">
        {isAdmin && (
          <Card className="border-0 shadow-md rounded-2xl">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Fecha del Cierre</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Input
                type="date"
                value={selectedDate}
                min={minBackdateDate}
                max={todayDate}
                onChange={(event) => setSelectedDate(event.target.value)}
                className="rounded-xl"
              />
              <p className="text-xs text-muted-foreground">
                Se permite retroceder hasta 7 días. Si el cierre es retroactivo, debe incluir motivo.
              </p>
              {isBackdated && (
                <Input
                  value={backdateReason}
                  onChange={(event) => setBackdateReason(event.target.value)}
                  placeholder="Motivo del cierre retroactivo (mínimo 10 caracteres)"
                  className="rounded-xl"
                />
              )}
            </CardContent>
          </Card>
        )}

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
                  S/ {selectedStats.total}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white/10 rounded-xl p-3">
                <p className="text-orange-100 text-xs">Ventas</p>
                <p className="text-xl font-semibold">{selectedStats.count}</p>
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
                    {selectedSales.filter((s) => s.saleType === "contado").length}{" "}
                    ventas
                  </p>
                </div>
              </div>
              <p className="font-bold text-lg">
                S/{" "}
                {selectedSales
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
                    {selectedSales.filter((s) => s.saleType === "credito").length}{" "}
                    ventas
                  </p>
                </div>
              </div>
              <p className="font-bold text-lg">
                S/{" "}
                {selectedSales
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
            {selectedSales.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">
                No hay ventas para la fecha seleccionada
              </p>
            ) : (
              <div className="space-y-2">
                {selectedSales.slice(0, 5).map((sale) => (
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
                {selectedSales.length > 5 && (
                  <p className="text-center text-sm text-muted-foreground">
                    Y {selectedSales.length - 5} ventas más...
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      <ToolbarActions>
        <Button
          onClick={handleGenerarCierre}
          disabled={createClosing.isPending || selectedSales.length === 0 || isBackdateReasonInvalid}
          className="w-full h-14 rounded-xl bg-orange-500 hover:bg-orange-600 text-lg font-semibold disabled:opacity-100 disabled:bg-orange-300 disabled:text-white"
        >
          <Save className="h-5 w-5 mr-2" />
          {createClosing.isPending ? "Guardando..." : "Generar Cierre del Día"}
        </Button>
      </ToolbarActions>
    </div>
  );
}
