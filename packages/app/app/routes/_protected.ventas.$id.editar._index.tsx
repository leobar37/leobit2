import { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router";
import { formatCurrency } from "~/lib/utils";
import {
  ArrowLeft,
  Calculator,
  Loader2,
  Plus,
  ShoppingCart,
} from "lucide-react";
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

function HeaderTotal() {
  const { saleId } = useNewSaleContext();
  const { data: sales } = useSale(saleId);
  const { data: items = [] } = useSaleItems(saleId);

  const sale = sales?.[0] ?? null;
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
  const { saleId } = useNewSaleContext();

  const { data: sales, isLoading } = useSale(saleId);
  const { data: items = [] } = useSaleItems(saleId);
  
  const sale = sales?.[0] ?? null;

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
              onClick={() => navigate("/ventas")}
              className="shell-toolbar-button rounded-2xl p-2 -ml-2 text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <h1 className="text-lg font-bold tracking-tight">Editar Venta</h1>
          </div>
          <HeaderTotal />
        </div>
      </header>

      <main className="space-y-4 pb-32">
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
        <SaleSummaryCard />
      </main>

      <SubmitSaleButton />
    </div>
  );
}
