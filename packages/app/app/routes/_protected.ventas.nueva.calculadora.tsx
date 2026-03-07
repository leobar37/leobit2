import { useNavigate } from "react-router";
import { ArrowLeft } from "lucide-react";
import { CalculatorContent } from "~/components/sales/new-sale";

export default function CalculadoraPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
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

      <div className="flex-1 flex flex-col overflow-hidden">
        <CalculatorContent onAddedToCart={() => navigate(-1)} />
      </div>
    </div>
  );
}
