import { Navigate, useNavigate } from "react-router";
import { ArrowLeft } from "lucide-react";
import { CalculatorContent } from "~/components/sales/new-sale";
import { useNewSaleContext } from "~/components/sales/new-sale-context";
import { getSaleEditorPath } from "~/lib/sales/navigation";

export default function SaleEditorCalculatorPage() {
  const navigate = useNavigate();
  const { saleId } = useNewSaleContext();

  if (!saleId) {
    return <Navigate to="/ventas" replace />;
  }

  const returnPath = getSaleEditorPath(saleId);

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <header className="sticky top-0 z-50 border-b border-orange-100 bg-white/80 backdrop-blur-xl">
        <div className="flex h-16 items-center px-3 sm:px-4">
          <button
            onClick={() => navigate(returnPath)}
            className="rounded-xl p-2 -ml-2 hover:bg-orange-50"
            aria-label="Volver"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="ml-1 text-lg font-bold">Calculadora</h1>
        </div>
      </header>

      <div className="flex flex-1 flex-col overflow-hidden">
        <CalculatorContent returnPath={returnPath} />
      </div>
    </div>
  );
}
