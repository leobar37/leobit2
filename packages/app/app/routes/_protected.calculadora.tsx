import { Info } from "lucide-react";
import { ChickenCalculator } from "~/components/calculator/chicken-calculator";
import { Card, CardContent } from "@/components/ui/card";
import { useSetLayout } from "~/components/layout/app-layout";

export default function CalculatorPage() {
  useSetLayout({
    title: "Calculadora",
    showBackButton: true,
    backHref: "/dashboard",
    showBottomNav: false,
  });

  return (
    <div className="space-y-4">
      <ChickenCalculator />

      <Card className="border-0 shadow-md rounded-2xl bg-blue-50 border-blue-100">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">Como funciona?</p>
              <ul className="list-disc list-inside space-y-1 text-blue-700">
                <li>Ingresa 2 valores y la calculadora completa el tercero</li>
                <li>Bruto - Tara = Neto (peso real del pollo)</li>
                <li>Usala para calcular precios antes de vender</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
