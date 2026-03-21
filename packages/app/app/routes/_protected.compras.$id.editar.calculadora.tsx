import { Navigate, useNavigate } from "react-router";
import { ArrowLeft } from "lucide-react";
import { PurchaseCalculatorContent } from "~/components/purchases/calculator/purchase-calculator-content";
import { usePurchaseEdit } from "~/components/purchases/purchase-edit-context";
import { getPurchaseEditorPath } from "~/lib/purchases/navigation";

export default function CompraEditorCalculadoraPage() {
  const navigate = useNavigate();
  const { purchaseId, editingItem } = usePurchaseEdit();

  if (!purchaseId) {
    return <Navigate to="/compras" replace />;
  }

  const returnPath = getPurchaseEditorPath(purchaseId);

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
            {editingItem ? "Editar Producto" : "Calculadora"}
          </h1>
        </div>
      </header>

      <div className="flex flex-1 flex-col overflow-hidden">
        <PurchaseCalculatorContent
          key={editingItem?.itemId || "new"}
          returnPath={returnPath}
        />
      </div>
    </div>
  );
}
