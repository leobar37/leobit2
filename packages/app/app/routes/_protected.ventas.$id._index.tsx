import { useState } from "react";
import { Navigate, useParams } from "react-router";
import { AlertCircle, Loader2, ReceiptText, TrendingUp } from "lucide-react";
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
import { MobilePage } from "~/components/mobile";
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
      <>
        <SaleDetailHeader
          canCancel={canCancel}
          onBack={() => goBack("/ventas")}
          sale={sale}
        />

        <MobilePage.Root className="space-y-4">
          <div className="shell-card-soft grid grid-cols-2 gap-1 rounded-2xl p-1">
            <button
              type="button"
              onClick={() => setActiveTab("details")}
              className={cn(
                "flex h-10 items-center justify-center gap-2 rounded-xl text-sm font-semibold transition-colors",
                activeTab === "details"
                  ? "bg-orange-500 text-white shadow-sm"
                  : "text-muted-foreground hover:bg-white/60 hover:text-foreground dark:hover:bg-white/10"
              )}
            >
              <ReceiptText className="h-4 w-4" />
              Detalles
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("analysis")}
              className={cn(
                "flex h-10 items-center justify-center gap-2 rounded-xl text-sm font-semibold transition-colors",
                activeTab === "analysis"
                  ? "bg-orange-500 text-white shadow-sm"
                  : "text-muted-foreground hover:bg-white/60 hover:text-foreground dark:hover:bg-white/10"
              )}
            >
              <TrendingUp className="h-4 w-4" />
              Análisis
            </button>
          </div>

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

          <CancelSaleDialog />
        </MobilePage.Root>
      </>
    </CancelSaleProvider>
  );
}
