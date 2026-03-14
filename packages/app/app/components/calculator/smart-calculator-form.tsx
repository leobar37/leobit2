import { useFormContext, FormProvider } from "react-hook-form";
import { CalculatorInput } from "./calculator-input";
import { useSmartCalculator } from "~/hooks/use-smart-calculator";
import type { CalculatorField } from "~/hooks/use-smart-calculator";
import type { Product } from "~/lib/db/schema";
import type { ProductVariant } from "~/hooks/use-product-variants";
import { formatWeight, formatCurrency } from "~/lib/utils";

interface SmartCalculatorFormProps {
  product: Product | undefined;
  variant: ProductVariant | undefined;
  initialPrice?: string;
  autoFillPrice?: boolean;
  onAddToCart: (data: {
    quantity: number;
    unitPrice: number;
    subtotal: number;
  }) => void;
}

export function SmartCalculatorForm({
  product,
  variant,
  initialPrice,
  autoFillPrice,
  onAddToCart,
}: SmartCalculatorFormProps) {
  const calculator = useSmartCalculator({
    product,
    variant,
    initialPrice,
    autoFillPrice,
  });

  const {
    form,
    values,
    unitType,
    autoCalculateField,
    toggleAutoCalculateField,
    isFieldAutoCalculated,
    setFieldValue,
    calculation,
    handleClear,
  } = calculator;

  const handleAdd = () => {
    if (calculation.isValid) {
      onAddToCart({
        quantity: calculation.quantity,
        unitPrice: calculation.unitPrice,
        subtotal: calculation.subtotal,
      });
      handleClear();
    }
  };

  // Get field labels based on unit type
  const getFieldLabel = (field: CalculatorField): string => {
    switch (unitType) {
      case "kg":
        return field === "price" ? "Precio/kg" : field === "quantity" ? "Kilos" : "Total";
      case "unidad":
        return field === "price" ? "Precio/pack" : field === "quantity" ? "Packs" : "Total";
      default:
        return field === "price" ? "Precio/unidad" : field === "quantity" ? "Unidades" : "Total";
    }
  };

  const getFieldPlaceholder = (field: CalculatorField): string => {
    if (field === "price") return variant?.price || "0.00";
    if (field === "quantity") return unitType === "kg" ? "0.000" : "0";
    return "0.00";
  };

  return (
    <FormProvider {...form}>
      <div className="space-y-4">
        {/* Price Input */}
        <CalculatorInput
          name="price"
          label={getFieldLabel("price")}
          value={values.price}
          placeholder={getFieldPlaceholder("price")}
          onChange={(value) => setFieldValue("price", value)}
          fieldType="price"
          isAutoCalculateTarget={isFieldAutoCalculated("price")}
          onToggleAutoCalculate={() => toggleAutoCalculateField("price")}
          decimals={2}
          helperText={variant?.price ? `Precio base: S/ ${variant.price}` : undefined}
          helperValue={variant?.price}
          onApplyHelperValue={(value) => setFieldValue("price", value)}
        />

        {/* Quantity Input */}
        <CalculatorInput
          name="quantity"
          label={getFieldLabel("quantity")}
          value={values.quantity}
          placeholder={getFieldPlaceholder("quantity")}
          onChange={(value) => setFieldValue("quantity", value)}
          fieldType="quantity"
          isAutoCalculateTarget={isFieldAutoCalculated("quantity")}
          onToggleAutoCalculate={() => toggleAutoCalculateField("quantity")}
          decimals={unitType === "kg" ? 3 : 0}
          helperText={
            unitType === "unidad" && variant?.unitQuantity
              ? `${variant.unitQuantity} unidades por pack`
              : undefined
          }
        />

        {/* Tara for kg products */}
        {unitType === "kg" && (
          <CalculatorInput
            name="tara"
            label="Tara (kg)"
            value={values.tara}
            placeholder="0"
            onChange={(value) => setFieldValue("tara", value)}
            fieldType="quantity"
            isAutoCalculateTarget={false}
            onToggleAutoCalculate={() => {}}
            decimals={3}
          />
        )}

        {/* Total Input */}
        <CalculatorInput
          name="total"
          label={getFieldLabel("total")}
          value={values.total}
          placeholder="0.00"
          onChange={(value) => setFieldValue("total", value)}
          fieldType="total"
          isAutoCalculateTarget={isFieldAutoCalculated("total")}
          onToggleAutoCalculate={() => toggleAutoCalculateField("total")}
          decimals={2}
        />

        {/* Summary */}
        {calculation.isValid && (
          <div className="bg-gradient-to-r from-orange-50 to-amber-50 rounded-xl p-4 border border-orange-200">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">
                {unitType === "kg" ? "Kilos netos:" : "Cantidad:"}
              </span>
              <span className="font-semibold text-orange-700">
                {unitType === "kg"
                  ? `${formatWeight(calculation.quantity)} kg`
                  : `${Math.round(calculation.quantity)} unidades`}
              </span>
            </div>
            <div className="flex justify-between items-center mt-2 pt-2 border-t border-orange-200">
              <span className="text-sm text-gray-600">Total:</span>
              <span className="text-xl font-bold text-orange-600">
                S/ {formatCurrency(calculation.subtotal)}
              </span>
            </div>
          </div>
        )}

        {/* Config indicator */}
        <div className="flex justify-between items-center">
          <span className="text-xs text-gray-500">
            Calculando: <span className="font-medium text-orange-600">{getFieldLabel(autoCalculateField)}</span>
          </span>
          <button
            type="button"
            onClick={handleClear}
            className="text-xs text-gray-500 hover:text-gray-700 underline"
          >
            Limpiar
          </button>
        </div>

        {/* Add button */}
        <button
          type="button"
          onClick={handleAdd}
          disabled={!calculation.isValid}
          className="w-full h-12 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-medium rounded-xl transition-colors"
        >
          Agregar al carrito
        </button>
      </div>
    </FormProvider>
  );
}

export default SmartCalculatorForm;
