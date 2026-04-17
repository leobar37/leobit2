import { useState } from "react";
import { Navigate, useParams } from "react-router";
import { AlertCircle, Loader2, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSale } from "~/hooks/use-sales";
import { useSaleAnalysis } from "~/hooks/use-sale-analysis";
import { useBusinessSettings } from "~/hooks/use-business-settings";
import { useBusiness } from "~/hooks/use-business";
import { BusinessUserRole } from "@avileo/shared";
import { useReturnUrl } from "~/hooks/use-return-url";
import { CancelSaleDialog } from "~/components/sales/cancel-sale-dialog";
import { CancelSaleProvider } from "~/components/sales/cancel-sale-provider";
import { SaleCancelledCard } from "~/components/sales/sale-cancelled-card";
import { SaleDetailHeader } from "~/components/sales/sale-detail-header";
import { SaleDetailInfoCard } from "~/components/sales/sale-detail-info-card";
import { SaleDetailItemsCard } from "~/components/sales/sale-detail-items-card";
import { SaleDetailPaymentCard } from "~/components/sales/sale-detail-payment-card";
import { SaleDetailSummaryCard } from "~/components/sales/sale-detail-summary-card";
import { SaleAnalysisCustomerHistory } from "~/components/sales/sale-analysis-customer-history";
import { SaleAnalysisProfit } from "~/components/sales/sale-analysis-profit";
import { SaleAnalysisPayment } from "~/components/sales/sale-analysis-payment";
import {
  getSaleEditorPath,
  shouldOpenSaleEditor,
} from "~/lib/sales/navigation";
import { cn } from "~/lib/utils";

type TabType = "details" | "analysis";

export default function SaleDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { goBack } = useReturnUrl();
  const [activeTab, setActiveTab] = useState<TabType>("details");
  const { data: sale, isLoading } = useSale(id || null);
  const { data: analysis, isLoading: analysisLoading } = useSaleAnalysis(id || null);
  const { settings } = useBusinessSettings();
  const { data: business } = useBusiness();
  const items = sale?.items ?? [];

  const isAdmin = business?.role === BusinessUserRole.ADMIN_NEGOCIO;
  const isCancelled = sale?.status === "cancelled";
  const canCancel = Boolean(isAdmin && !isCancelled && sale);
  const hideTara = settings?.calculators?.sales?.hideTara ?? true;

  if (isLoading) {
    return (
      <div className="app-shell flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
      </div>
    );
  }

  if (!sale) {
    return (
      <div className="app-shell min-h-screen p-4">
        <div className="max-w-md mx-auto mt-20 text-center">
          <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Venta no encontrada</h2>
          <p className="text-muted-foreground mb-4">La venta que buscas no existe</p>
          <Button onClick={() => goBack("/ventas")}>Volver a ventas</Button>
        </div>
      </div>
    );
  }

  if (shouldOpenSaleEditor(sale)) {
    return <Navigate to={getSaleEditorPath(sale.id)} replace />;
  }

  return (
    <CancelSaleProvider sale={sale}>
      <div className="min-h-screen app-shell">
        <SaleDetailHeader
          canCancel={canCancel}
          onBack={() => goBack("/ventas")}
          sale={sale}
        />

        <main className="space-y-3 px-3 py-3 pb-24 sm:px-4">
          <div className="shell-card-flat overflow-hidden rounded-[22px]">
            <div className="border-b shell-divider px-3 pt-1">
              <div className="flex">
                <button
                  onClick={() => setActiveTab("details")}
                  className={cn(
                    "relative flex-1 px-3 py-3 text-sm font-medium transition-colors",
                    activeTab === "details"
                      ? "text-foreground after:absolute after:bottom-0 after:left-4 after:right-4 after:h-0.5 after:bg-orange-500"
                      : "text-muted-foreground"
                  )}
                >
                  Detalles
                </button>
                <button
                  onClick={() => setActiveTab("analysis")}
                  className={cn(
                    "relative flex flex-1 items-center justify-center gap-2 px-3 py-3 text-sm font-medium transition-colors",
                    activeTab === "analysis"
                      ? "text-foreground after:absolute after:bottom-0 after:left-4 after:right-4 after:h-0.5 after:bg-orange-500"
                      : "text-muted-foreground"
                  )}
                >
                  <TrendingUp className="h-4 w-4" />
                  Análisis
                </button>
              </div>
            </div>

            <div className="p-3 sm:p-4">
              {activeTab === "details" ? (
                <div className="space-y-4">
                  {isCancelled && <SaleCancelledCard sale={sale} />}
                  <SaleDetailSummaryCard sale={sale} />
                  <SaleDetailInfoCard sale={sale} hideTara={hideTara} />
                  <SaleDetailItemsCard items={items} totalAmount={sale.totalAmount} />
                  <SaleDetailPaymentCard sale={sale} />
                </div>
              ) : (
                <div className="space-y-4">
                  {analysisLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
                    </div>
                  ) : analysis ? (
                    <>
                      {sale.customerId && (
                        <SaleAnalysisCustomerHistory
                          customerHistory={analysis.customerHistory}
                        />
                      )}
                      <SaleAnalysisProfit profitAnalysis={analysis.profitAnalysis} />
                      <SaleAnalysisPayment paymentStatus={analysis.paymentStatus} />
                    </>
                  ) : (
                    <p className="py-8 text-center text-muted-foreground">
                      No hay datos de análisis disponibles
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          <CancelSaleDialog />
        </main>
      </div>
    </CancelSaleProvider>
  );
}
