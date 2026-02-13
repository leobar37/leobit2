import { useState, useEffect } from "react";
import { Calculator, RotateCcw, DollarSign, Weight, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";

interface CalculatorState {
  totalAmount: string;
  pricePerKg: string;
  kilos: string;
  tara: string;
}

interface ChickenCalculatorProps {
  onAddToCart?: (data: {
    netWeight: number;
    totalAmount: number;
    pricePerKg: number;
  }) => void;
  productPrice?: string;
}

export function ChickenCalculator({ onAddToCart, productPrice }: ChickenCalculatorProps) {
  const [values, setValues] = useState<CalculatorState>({
    totalAmount: "",
    pricePerKg: productPrice || "",
    kilos: "",
    tara: "0",
  });

  const [activeField, setActiveField] = useState<string | null>(null);

  // Calcular automáticamente cuando hay 2 valores
  useEffect(() => {
    const { totalAmount, pricePerKg, kilos, tara } = values;
    const taraNum = parseFloat(tara) || 0;

    const filledFields = [
      totalAmount && "totalAmount",
      pricePerKg && "pricePerKg",
      kilos && "kilos",
    ].filter(Boolean);

    if (filledFields.length === 2) {
      const total = parseFloat(totalAmount) || 0;
      const price = parseFloat(pricePerKg) || 0;
      const kg = parseFloat(kilos) || 0;
      const kgNeto = Math.max(0, kg - taraNum);

      if (!totalAmount && price > 0 && kgNeto > 0) {
        setValues((prev) => ({
          ...prev,
          totalAmount: (price * kgNeto).toFixed(2),
        }));
      } else if (!pricePerKg && total > 0 && kgNeto > 0) {
        setValues((prev) => ({
          ...prev,
          pricePerKg: (total / kgNeto).toFixed(2),
        }));
      } else if (!kilos && total > 0 && price > 0) {
        const kgBruto = total / price + taraNum;
        setValues((prev) => ({ ...prev, kilos: kgBruto.toFixed(3) }));
      }
    }
  }, [values.totalAmount, values.pricePerKg, values.kilos, values.tara]);

  const handleReset = () => {
    setValues({
      totalAmount: "",
      pricePerKg: productPrice || "",
      kilos: "",
      tara: "0",
    });
  };

  const handleChange = (field: keyof CalculatorState, value: string) => {
    // Solo permitir números y punto decimal
    if (value && !/^\d*\.?\d*$/.test(value)) return;

    setValues((prev) => ({ ...prev, [field]: value }));
    setActiveField(field);
  };

  const kgNeto = Math.max(
    0,
    (parseFloat(values.kilos) || 0) - (parseFloat(values.tara) || 0)
  );

  const filledCount = [
    values.totalAmount,
    values.pricePerKg,
    values.kilos,
  ].filter(Boolean).length;

  return (
    <Card className="border-0 shadow-md rounded-2xl">
      <CardContent className="p-4 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Calculator className="h-5 w-5 text-orange-500" />
          <h3 className="font-semibold">Calculadora</h3>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {/* Monto Total */}
          <div className="space-y-1">
            <Label className="text-xs flex items-center gap-1">
              <DollarSign className="w-3 h-3 text-orange-500" />
              Monto Total (S/)
            </Label>
            <Input
              type="text"
              inputMode="decimal"
              value={values.totalAmount}
              onChange={(e) => handleChange("totalAmount", e.target.value)}
              placeholder="0.00"
              className={`rounded-xl ${
                activeField === "totalAmount"
                  ? "ring-2 ring-orange-200 border-orange-500"
                  : ""
              }`}
            />
          </div>

          {/* Precio por Kg */}
          <div className="space-y-1">
            <Label className="text-xs flex items-center gap-1">
              <DollarSign className="w-3 h-3 text-orange-500" />
              Precio/kg (S/)
            </Label>
            <Input
              type="text"
              inputMode="decimal"
              value={values.pricePerKg}
              onChange={(e) => handleChange("pricePerKg", e.target.value)}
              placeholder="0.00"
              className={`rounded-xl ${
                activeField === "pricePerKg"
                  ? "ring-2 ring-orange-200 border-orange-500"
                  : ""
              }`}
            />
          </div>

          {/* Kilos Brutos */}
          <div className="space-y-1">
            <Label className="text-xs flex items-center gap-1">
              <Weight className="w-3 h-3 text-orange-500" />
              Bruto (kg)
            </Label>
            <Input
              type="text"
              inputMode="decimal"
              value={values.kilos}
              onChange={(e) => handleChange("kilos", e.target.value)}
              placeholder="0.000"
              step="0.001"
              className={`rounded-xl ${
                activeField === "kilos"
                  ? "ring-2 ring-orange-200 border-orange-500"
                  : ""
              }`}
            />
          </div>

          {/* Tara */}
          <div className="space-y-1">
            <Label className="text-xs flex items-center gap-1">
              <Package className="w-3 h-3 text-orange-500" />
              Tara (kg)
            </Label>
            <Input
              type="text"
              inputMode="decimal"
              value={values.tara}
              onChange={(e) => handleChange("tara", e.target.value)}
              placeholder="0"
              step="0.001"
              className={`rounded-xl ${
                activeField === "tara"
                  ? "ring-2 ring-orange-200 border-orange-500"
                  : ""
              }`}
            />
          </div>
        </div>

        {/* Resumen de cálculo */}
        {filledCount >= 1 && (
          <div className="bg-gradient-to-r from-orange-50 to-amber-50 rounded-xl p-3 border border-orange-200">
            <div className="grid grid-cols-2 gap-3">
              <div className="text-center">
                <p className="text-xs text-gray-500 uppercase">Neto</p>
                <p className="text-lg font-bold text-orange-600">
                  {kgNeto.toFixed(3)} kg
                </p>
              </div>
              <div className="text-center">
                <p className="text-xs text-gray-500 uppercase">Total</p>
                <p className="text-lg font-bold text-green-600">
                  S/ {values.totalAmount || "0.00"}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Botón reset */}
        <Button
          variant="outline"
          onClick={handleReset}
          className="w-full rounded-xl"
          size="sm"
        >
          <RotateCcw className="w-4 h-4 mr-2" />
          Limpiar
        </Button>

        {/* Indicador */}
        <div className="flex items-center justify-center gap-2 text-xs">
          <span className="text-gray-500">Campos:</span>
          {filledCount >= 2 ? (
            <span className="text-green-600 font-medium flex items-center gap-1">
              <span className="w-2 h-2 bg-green-500 rounded-full"></span>
              Listo
            </span>
          ) : (
            <span className="text-amber-600 font-medium">
              {3 - filledCount} más
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
