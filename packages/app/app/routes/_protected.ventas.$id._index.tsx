import { Navigate, useNavigate, useParams } from "react-router";
import { AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSale } from "~/hooks/use-sales";
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
import {
  getSaleEditorPath,
  shouldOpenSaleEditor,
} from "~/lib/sales/navigation";

export default function SaleDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: sale, isLoading } = useSale(id || null);
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
          {isCancelled && <SaleCancelledCard sale={sale} />}
          <SaleDetailSummaryCard sale={sale} />
          <SaleDetailInfoCard sale={sale} hideTara={hideTara} />
          <SaleDetailItemsCard items={items} totalAmount={sale.totalAmount} />
          <SaleDetailPaymentCard sale={sale} />
          <CancelSaleDialog />
        </main>
      </div>
    </CancelSaleProvider>
  );
}
