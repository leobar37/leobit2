import { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router";
import { formatCurrency } from "~/lib/utils";
import { ArrowLeft, Calculator, Loader2, Plus, ShoppingCart } from "lucide-react";
import {
  CartSection,
  CustomerSection,
  PaymentModeSection,
  SaleSummaryCard,
  SubmitSaleButton,
} from "~/components/sales/new-sale";
import { useNewSaleContext } from "~/components/sales/new-sale-context";
import { useSaleCalculations } from "~/hooks/use-sale-calculations";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useSale, useSaleItems } from "~/hooks/use-sales-db";
import { getSaleCalculatorPath } from "~/lib/sales/navigation";
import { saleCollection } from "~/lib/db/collections/sale.collection";

const isSaleEditorDebugEnabled = import.meta.env.DEV;

function debugSaleEditor(message: string, payload?: unknown) {
  if (!isSaleEditorDebugEnabled) return;

  if (payload === undefined) {
    console.log(`[SaleEditorDebug] ${message}`);
    return;
  }

  console.log(`[SaleEditorDebug] ${message}`, payload);
}

function HeaderTotal() {
  const { saleId } = useNewSaleContext();
  const { data: sales } = useSale(saleId);
  const { data: items = [] } = useSaleItems(saleId);

  const sale = sales?.[0] || null;
  const calculations = useSaleCalculations(sale, items);

  if (items.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-2 rounded-full bg-orange-500 px-3 py-1.5 text-white">
      <ShoppingCart className="h-4 w-4" />
      <span className="text-sm font-semibold">S/ {formatCurrency(calculations.totalAmount)}</span>
    </div>
  );
}

export default function SaleEditorPage() {
  const navigate = useNavigate();
  const { saleId } = useNewSaleContext();
  const [isLoading, setIsLoading] = useState(true);
  
  // Wait for collection to be ready
  useEffect(() => {
    async function loadSale() {
      console.log("[SaleEditor] Loading sale:", saleId);
      console.log("[SaleEditor] Collection size:", saleCollection.size);
      
      // Force preload if needed
      if (saleCollection.size === 0) {
        await saleCollection.preload?.();
        console.log("[SaleEditor] After preload, size:", saleCollection.size);
      }
      
      setIsLoading(false);
    }
    
    loadSale();
  }, [saleId]);
  
  const { data: sales } = useSale(saleId);
  const sale = sales?.[0] ?? null;

  useEffect(() => {
    debugSaleEditor("Sale editor readiness changed", {
      saleId,
      hasLocalSale: Boolean(sale),
    });
  }, [saleId, sale]);

  if (!saleId) {
    return <Navigate to="/ventas" replace />;
  }

  if (isLoading || !sale) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
          <div>
            <p className="font-semibold text-foreground">Preparando venta...</p>
            <p className="text-sm text-muted-foreground">
              {isLoading ? "Cargando datos..." : "Esperando a que el borrador quede listo en el almacenamiento local."}
            </p>
          </div>
        </div>
      </div>
    );
  }

  const calculatorPath = getSaleCalculatorPath(saleId);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-50 border-b border-orange-100 bg-white/80 backdrop-blur-xl">
        <div className="flex h-16 items-center justify-between px-3 sm:px-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate("/ventas")}
              className="rounded-xl p-2 -ml-2 hover:bg-orange-50"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <h1 className="text-lg font-bold">Editar Venta</h1>
          </div>
          <HeaderTotal />
        </div>
      </header>

      <main className="space-y-4 px-3 py-4 pb-32 sm:px-4">
        <CustomerSection />

        <section
          id="calculator-section"
          className="space-y-3"
          data-testid="calculator-section"
        >
          <Card
            className="cursor-pointer rounded-2xl border-0 bg-card transition-shadow"
            onClick={() => navigate(calculatorPath)}
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-orange-100">
                  <Calculator className="h-6 w-6 text-orange-600" />
                </div>
                <div className="flex-1">
                  <p className="font-medium">Calculadora</p>
                  <p className="text-sm text-muted-foreground">
                    Toca para calcular un producto
                  </p>
                </div>
                <Button
                  className="bg-orange-500 hover:bg-orange-600"
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
        <SaleSummaryCard />
      </main>

      <SubmitSaleButton />
    </div>
  );
}
