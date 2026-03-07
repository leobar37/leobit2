import { useEffect } from "react";
import { formatWeight } from "~/lib/utils";
import { useNavigate } from "react-router";
import { ArrowLeft, Package } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useOrderFormContext } from "~/components/orders/order-form-context";

export default function EditOrderCalculadoraPage() {
  const navigate = useNavigate();
  const orderForm = useOrderFormContext();

  const { selectedProduct, selectedVariant, calculator, isKgProduct, editingItemIndex } = orderForm;

  useEffect(() => {
    if (!selectedProduct || !selectedVariant) {
      navigate(-1);
    }
  }, [selectedProduct, selectedVariant, navigate]);

  if (!selectedProduct || !selectedVariant) return null;

  const isEditing = editingItemIndex !== null;

  const handleUpdate = () => {
    orderForm.handleUpdateItem(() => navigate(-1));
  };

  const handleChange = () => {
    orderForm.setShowVariantSelector(true);
    navigate(-1);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-orange-100">
        <div className="flex items-center h-16 px-3 sm:px-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 -ml-2 rounded-xl hover:bg-orange-50"
            aria-label="Volver"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="font-bold text-lg ml-1">{isEditing ? "Editar item" : "Calculadora"}</h1>
        </div>
      </header>

      <main className="px-3 py-4 sm:px-4 pb-32 max-w-lg mx-auto">
        <Card className="border-0 shadow-md">
          <CardContent className="p-4 space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b">
              <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center">
                <Package className="h-5 w-5 text-orange-600" />
              </div>
              <div className="flex-1">
                <p className="font-medium">{selectedProduct.name}</p>
                <p className="text-sm text-muted-foreground">
                  {selectedVariant.name} · S/ {selectedVariant.price} / {selectedProduct.unit}
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleChange}
              >
                Cambiar
              </Button>
            </div>

            {isKgProduct ? (
              <div key={selectedVariant.id} className="space-y-3" data-testid="kg-calculator-section">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-sm" htmlFor="kilos-brutos">Kilos brutos</Label>
                    <Input
                      id="kilos-brutos"
                      type="text"
                      inputMode="decimal"
                      placeholder="0.000"
                      className="rounded-xl"
                      data-testid="kilos-brutos-input"
                      {...calculator.register("kilos")}
                    />
                  </div>
                  <div>
                    <Label className="text-sm" htmlFor="tara">Tara (kg)</Label>
                    <Input
                      id="tara"
                      type="text"
                      inputMode="decimal"
                      placeholder="0"
                      className="rounded-xl"
                      data-testid="tara-input"
                      {...calculator.register("tara")}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between px-3 py-2 bg-orange-50 rounded-xl">
                  <span className="text-sm text-orange-700">Kilos netos:</span>
                  <span className="font-semibold text-orange-700" data-testid="kg-neto-display">
                    {formatWeight(calculator.kgNeto)} kg
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-sm" htmlFor="price-per-kg">Precio por kg</Label>
                    <Input
                      id="price-per-kg"
                      type="text"
                      inputMode="decimal"
                      placeholder="0.00"
                      className="rounded-xl"
                      data-testid="price-per-kg-input"
                      {...calculator.register("pricePerKg")}
                    />
                  </div>
                  <div>
                    <Label className="text-sm" htmlFor="total-amount">Total</Label>
                    <Input
                      id="total-amount"
                      type="text"
                      inputMode="decimal"
                      placeholder="0.00"
                      className="rounded-xl"
                      data-testid="total-amount-input"
                      {...calculator.register("totalAmount")}
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div key={selectedVariant.id} className="space-y-3" data-testid="unit-calculator-section">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-sm" htmlFor="units">Unidades</Label>
                    <Input
                      id="units"
                      type="text"
                      inputMode="decimal"
                      placeholder="0"
                      className="rounded-xl"
                      data-testid="units-input"
                      {...calculator.register("units")}
                    />
                  </div>
                  <div>
                    <Label className="text-sm" htmlFor="unit-total">Total</Label>
                    <Input
                      id="unit-total"
                      type="text"
                      inputMode="decimal"
                      placeholder="0.00"
                      className="rounded-xl"
                      data-testid="unit-total-input"
                      {...calculator.register("totalAmount")}
                    />
                  </div>
                </div>

                {selectedVariant.price && (
                  <div className="flex items-center justify-between px-3 py-2 bg-orange-50 rounded-xl">
                    <span className="text-sm text-orange-700">Precio por unidad:</span>
                    <span className="font-semibold text-orange-700">
                      S/ {selectedVariant.price}
                    </span>
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate(-1)}
                className="flex-1 rounded-xl"
                data-testid="cancel-add-item-button"
              >
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={handleUpdate}
                disabled={!calculator.isValid}
                className="flex-1 rounded-xl bg-orange-500 hover:bg-orange-600"
                data-testid="confirm-add-item-button"
              >
                {isEditing ? "Actualizar" : "Agregar"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
