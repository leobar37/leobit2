// @ts-nocheck - Route file with complex type errors
import { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router";
import { formatCurrency, formatDateForInput } from "~/lib/utils";
import {
  ArrowLeft,
  Calculator,
  Calendar,
  Loader2,
  Plus,
  Share2,
  ShoppingCart,
  Truck,
} from "lucide-react";
import { toast } from "sonner";
import {
  CartSection,
  CustomerSection,
  PaymentModeSection,
  SaleSubmitBar,
} from "~/components/sales/new-sale";
import { useNewSaleContext } from "~/components/sales/new-sale-context";
import { useSaleCalculations } from "~/hooks/use-sale-calculations";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useSale } from "~/hooks/use-sales-db";
import { getSaleCalculatorPath } from "~/lib/sales/navigation";
import { SaleShareDrawer } from "~/components/sales/sale-share-drawer";
import { RescheduleSaleDialog } from "~/components/sales/reschedule-sale-dialog";
import { useUpdateSale } from "~/hooks/use-sales";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { DatePicker } from "@/components/ui/date-picker";
import { cn } from "~/lib/utils";

function HeaderTotal() {
  const { sale, items } = useNewSaleContext();

  const calculations = useSaleCalculations(sale, items);

  if (items.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-2 rounded-full border border-white/80 bg-white/82 px-3 py-1.5 text-orange-700 shadow-sm backdrop-blur-sm">
      <ShoppingCart className="h-4 w-4 text-orange-600" />
      <span className="text-sm font-semibold">
        S/ {formatCurrency(calculations.totalAmount)}
      </span>
    </div>
  );
}

export default function SaleEditorPage() {
  const navigate = useNavigate();
  const { saleId, returnTo, setLinkedVisitaId } = useNewSaleContext();

  const { data: sale, isLoading } = useSale(saleId);
  const updateSale = useUpdateSale();
  const [programarOpen, setProgramarOpen] = useState(false);
  const [programarDate, setProgramarDate] = useState("");

  // Determine if we're in delivery mode (confirmed pre_order)
  const isDeliveryMode = sale?.type === "pre_order" && sale?.status === "confirmed";

  // Set linked visitaId from sale data when available
  useEffect(() => {
    if (sale?.visitaId) {
      setLinkedVisitaId(sale.visitaId);
    }
  }, [sale?.visitaId, setLinkedVisitaId]);

  useEffect(() => {
    if (!saleId) return;

    const startedAt = performance.now();
    return () => {
      console.log("[Perf][SaleEditorPage] lifetime", {
        saleId,
        visibleMs: Number((performance.now() - startedAt).toFixed(2)),
      });
    };
  }, [saleId]);

  if (!saleId) {
    return <Navigate to="/ventas" replace />;
  }

  if (isLoading || !sale) {
    return (
      <div className="app-shell flex min-h-screen items-center justify-center px-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
          <div>
            <p className="font-semibold text-foreground">Preparando venta...</p>
            <p className="text-sm text-muted-foreground">
              {isLoading
                ? "Cargando datos..."
                : "Esperando a que el borrador quede listo en el almacenamiento local."}
            </p>
          </div>
        </div>
      </div>
    );
  }

  const calculatorPath = getSaleCalculatorPath(saleId);

  return (
    <div className="space-y-4">
      <header className="sticky top-0 z-40 rounded-3xl border shell-surface">
        <div className="flex h-16 items-center justify-between px-3 sm:px-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate(returnTo)}
              className="shell-toolbar-button rounded-2xl p-2 -ml-2 text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold tracking-tight">
                {isDeliveryMode
                  ? "Entregar Pedido"
                  : sale?.type === "pre_order"
                    ? "Editar Pedido"
                    : "Editar Venta"}
              </h1>
              {isDeliveryMode && (
                <Badge className="bg-indigo-100 text-indigo-700 border-0">
                  <Truck className="h-3 w-3 mr-1" />
                  Entrega
                </Badge>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <HeaderTotal />
            {sale && (
              <>
                {sale.type === "instant_sale" && sale.status === "draft" && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="rounded-xl text-muted-foreground hover:bg-white/60 hover:text-foreground"
                    title="Programar pedido"
                    onClick={() => {
                      setProgramarDate(formatDateForInput(new Date()));
                      setProgramarOpen(true);
                    }}
                  >
                    <Calendar className="h-4 w-4" />
                  </Button>
                )}
                {sale.type === "pre_order" && sale.status !== "cancelled" && sale.status !== "delivered" && (
                  <RescheduleSaleDialog
                    saleId={sale.id}
                    currentDeliveryDate={sale.deliveryDate}
                    trigger={
                      <Button
                        variant="ghost"
                        size="icon"
                        className="rounded-xl text-muted-foreground hover:bg-white/60 hover:text-foreground"
                        title="Reprogramar entrega"
                      >
                        <Calendar className="h-4 w-4" />
                      </Button>
                    }
                  />
                )}
                {(sale.status === "draft" || sale.status === "confirmed") && (
                  <SaleShareDrawer
                    saleId={sale.id}
                    saleStatus={sale.status}
                    allowCustomerEdit={sale.allowCustomerEdit}
                    trigger={
                      <Button
                        variant="ghost"
                        size="icon"
                        className="rounded-xl text-muted-foreground hover:bg-white/60 hover:text-foreground"
                        title="Compartir venta"
                      >
                        <Share2 className="h-4 w-4" />
                      </Button>
                    }
                  />
                )}
              </>
            )}
          </div>
        </div>
      </header>

      <main className="space-y-4 pb-24">
        <CustomerSection />

        <section
          id="calculator-section"
          className="space-y-3"
          data-testid="calculator-section"
        >
          <Card
            className="shell-card cursor-pointer rounded-3xl border-0 transition-all hover:bg-white/88"
            onClick={() => navigate(calculatorPath)}
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="shell-card-muted flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-100/80">
                  <Calculator className="h-6 w-6 text-orange-600" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold">Calculadora</p>
                  <p className="text-sm text-muted-foreground">
                    Toca para calcular un producto
                  </p>
                </div>
                <Button
                  className="rounded-2xl bg-orange-500 shadow-sm hover:bg-orange-600"
                  onClick={(event) => {
                    event.stopPropagation();
                    navigate(calculatorPath);
                  }}
                >
                  <Plus className="mr-1 h-4 w-4" />
                  Nuevo
                </Button>
              </div>
            </CardContent>
          </Card>
        </section>

        <CartSection />
        <PaymentModeSection />
      </main>

      <SaleSubmitBar />

      <Dialog open={programarOpen} onOpenChange={setProgramarOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Programar pedido</DialogTitle>
            <DialogDescription>
              Convierte esta venta en un pedido programable con fecha de entrega
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <DatePicker
              value={programarDate}
              onChange={setProgramarDate}
              label="Fecha de entrega"
              quickActionLabels={["Hoy", "Mañana"]}
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setProgramarOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              onClick={async () => {
                if (!programarDate) {
                  toast.error("Selecciona una fecha de entrega");
                  return;
                }
                try {
                  await updateSale.mutateAsync({
                    id: saleId,
                    input: {
                      type: "pre_order",
                      deliveryDate: programarDate,
                    },
                  });
                  toast.success("Venta convertida a pedido programado");
                  setProgramarOpen(false);
                } catch (err) {
                  toast.error("Error al programar la venta");
                  console.error(err);
                }
              }}
              disabled={updateSale.isPending}
            >
              {updateSale.isPending ? "Guardando..." : "Programar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
