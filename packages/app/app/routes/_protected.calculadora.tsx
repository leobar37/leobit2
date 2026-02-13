import { Link } from "react-router";
import { ArrowLeft, Calculator, Info } from "lucide-react";
import { ChickenCalculator } from "~/components/calculator/chicken-calculator";
import { Card, CardContent } from "@/components/ui/card";

export default function CalculatorPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-stone-100">
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-orange-100">
        <div className="flex items-center gap-3 h-16 px-4">
          <Link to="/dashboard" className="p-2 -ml-2 rounded-xl hover:bg-orange-50">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="font-bold text-lg">Calculadora</h1>
        </div>
      </header>

      <main className="p-4 pb-8 space-y-4">
        <ChickenCalculator />

        <Card className="border-0 shadow-md rounded-2xl bg-blue-50 border-blue-100">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">¿Cómo funciona?</p>
                <ul className="list-disc list-inside space-y-1 text-blue-700">
                  <li>Ingresa 2 valores y la calculadora completa el tercero</li>
                  <li>Bruto - Tara = Neto (peso real del pollo)</li>
                  <li>Úsala para calcular precios antes de vender</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
