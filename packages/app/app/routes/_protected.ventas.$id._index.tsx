import { useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router";
import { AlertCircle, Loader2, User, TrendingUp, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSale } from "~/hooks/use-sales";
import { useSaleAnalysis } from "~/hooks/use-sale-analysis";
import { useBusinessSettings } from "~/hooks/use-business-settings";
import { useBusiness } from "~/hooks/use-business";
import { BusinessUserRole } from "@avileo/shared";
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

type TabType = "details" | "analysis";

export default function SaleDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
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
          <Button onClick={() => navigate("/ventas")}>Volver a ventas</Button>
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
        <SaleDetailHeader canCancel={canCancel} onBack={() => navigate("/ventas")} />

        <main className="space-y-4 p-4 pb-24">
          {/* Tabs */}
          <div className="shell-card-flat overflow-hidden rounded-[28px]">
            <div className="flex border-b shell-divider">
              <button
                onClick={() => setActiveTab("details")}
                className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 ${
                  activeTab === "details"
                    ? "border-b-2 border-orange-500 text-orange-600"
                    : "text-muted-foreground"
                }`}
              >
                Detalles
              </button>
              <button
                onClick={() => setActiveTab("analysis")}
                className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 ${
                  activeTab === "analysis"
                    ? "border-b-2 border-orange-500 text-orange-600"
                    : "text-muted-foreground"
                }`}
              >
                <TrendingUp className="h-4 w-4" />
                Análisis
              </button>
            </div>

            <div className="p-4">
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
                    <p className="text-center text-muted-foreground py-8">
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
