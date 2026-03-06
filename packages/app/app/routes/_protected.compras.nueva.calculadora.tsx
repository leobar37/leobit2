import { useNavigate } from "react-router";
import { ArrowLeft } from "lucide-react";
import { PurchaseCalculatorContent } from "~/components/purchases/calculator";

export default function ComprasCalculadoraPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-stone-100 flex flex-col">
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-orange-100">
        <div className="flex items-center h-16 px-3 sm:px-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 -ml-2 rounded-xl hover:bg-orange-50"
            aria-label="Volver"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="font-bold text-lg ml-1">Calculadora</h1>
        </div>
      </header>

      <div className="flex-1 p-4 overflow-y-auto">
        <PurchaseCalculatorContent onAddedToCart={() => navigate(-1)} />
      </div>
    </div>
  );
}
