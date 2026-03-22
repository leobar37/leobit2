import { Navigate, useNavigate, useParams } from "react-router";
import { ArrowLeft } from "lucide-react";
import { PurchaseCalculatorContent } from "~/components/purchases/calculator/purchase-calculator-content";
import { usePurchaseForm } from "~/components/purchases/purchase-form-context";
import { getPurchaseEditorPath } from "~/lib/purchases/navigation";

export default function CompraEditorCalculadoraPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { purchaseId } = usePurchaseForm();

  const currentPurchaseId = id || purchaseId;

  if (!currentPurchaseId) {
    return <Navigate to="/compras" replace />;
  }

  const returnPath = getPurchaseEditorPath(currentPurchaseId);

  return (
    <div className="app-shell flex min-h-screen flex-col">
      <header className="sticky top-0 z-50 border-b shell-surface">
        <div className="flex h-16 items-center px-3 sm:px-4">
          <button
            onClick={() => navigate(returnPath)}
            className="shell-toolbar-button rounded-2xl p-2 -ml-2 text-muted-foreground transition-colors hover:text-foreground"
            aria-label="Volver"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="ml-1 text-lg font-bold tracking-tight">
            Calculadora
          </h1>
        </div>
      </header>

      <div className="flex flex-1 flex-col overflow-hidden">
        <PurchaseCalculatorContent
          returnPath={returnPath}
        />
      </div>
    </div>
  );
}
