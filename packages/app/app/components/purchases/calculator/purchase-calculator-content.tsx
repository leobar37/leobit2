import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import {
  Plus,
  Calculator as CalculatorIcon,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useProducts } from "~/hooks/use-products";
import { useVariantsByProduct } from "~/hooks/use-product-variants";
import { useSmartCalculator } from "~/hooks/use-smart-calculator";
import { CalculatorInput } from "~/components/calculator/calculator-input";
import { formatCurrency, formatKilos, cn } from "~/lib/utils";
import type { Product } from "~/lib/db/schema";
import type { ProductVariant } from "~/hooks/use-product-variants";
import { usePurchaseForm } from "../purchase-form-context";
import { usePurchaseEdit } from "../purchase-edit-context";
import { useUpdatePurchaseItem, useAddPurchaseItem } from "~/hooks/use-purchases";
import { Loader2 } from "lucide-react";
import { Skeleton } from "~/components/ui/skeleton";

interface PurchaseCalculatorContentProps {
  onAddedToCart?: () => void;
  returnPath?: string;
}

export function PurchaseCalculatorContent({ onAddedToCart, returnPath }: PurchaseCalculatorContentProps) {
  const navigate = useNavigate();

  const isEditMode = !!returnPath;

  const editContext = usePurchaseEdit();
  const { addItem: addItemToForm } = usePurchaseForm();
  const updateItemMutation = useUpdatePurchaseItem();
  const addItemMutation = useAddPurchaseItem();

  const editingItem = editContext.editingItemId 
    ? editContext.items.find(i => i.id === editContext.editingItemId) ?? null
    : null;

  const editValues = isEditMode && editContext ? {
    purchaseId: editContext.purchaseId,
    editingItem,
    setEditingItemId: editContext.setEditingItemId,
    addItem: editContext.addItem,
  } : null;

  const addItem = editValues ? editValues.addItem : addItemToForm;

  const [selectedProductId, setSelectedProductId] = useState<string | null>(
    editValues?.editingItem?.productId ?? null
  );
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(editValues?.editingItem?.variantId ?? null
  );

  const {
    data: products = [],
    isLoading: isProductsLoading,
    isFetching: isProductsFetching,
  } = useProducts();
  const selectedProduct = products.find(p => p.id === selectedProductId);

  const {
    data: variants = [],
    isLoading: isVariantsLoading,
    isFetching: isVariantsFetching,
  } = useVariantsByProduct(selectedProductId || "", {
    isActive: true
  });
  const selectedVariant = variants.find(v => v.id === selectedVariantId);

  // Compute initial values for edit mode
  const editingInitialValues = isEditMode && editValues?.editingItem ? {
    quantity: editValues.editingItem.quantity,
    unitPrice: editValues.editingItem.unitCost,
    subtotal: editValues.editingItem.totalCost,
  } : undefined;

  const {
    form,
    isValid,
    isKgProduct,
    values,
    toggleAutoCalculateField,
    isFieldAutoCalculated,
    setFieldValue,
    calculation,
    handleClear,
  } = useSmartCalculator({
    product: selectedProduct,
    variant: selectedVariant,
    autoFillPrice: false,
    initialValues: editingInitialValues,
  });

  // Populate calculator values when editing and product loads
  useEffect(() => {
    if (!isEditMode || !editValues?.editingItem || !selectedProduct) return;

    // Check if form already has values to avoid overwriting
    const currentQuantity = form.getValues("quantity");
    if (currentQuantity && currentQuantity !== "0") return;

    // Set the calculator values from editingItem
    setFieldValue("quantity", editValues.editingItem.quantity);
    setFieldValue("unitPrice", editValues.editingItem.unitCost);
    setFieldValue("subtotal", editValues.editingItem.totalCost);
  }, [isEditMode, editValues, selectedProduct, form, setFieldValue]);

  const handleSave = async () => {
    if (!selectedVariant || !calculation.isValid) return;

    try {
      if (isEditMode && editValues?.editingItem) {
        // Update existing item
        await updateItemMutation.mutateAsync({
          purchaseId: editValues.purchaseId,
          itemId: editValues.editingItem.id,
          data: {
            quantity: calculation.quantity,
            unitCost: calculation.unitPrice,
            totalCost: calculation.subtotal,
          },
        });
        editValues.setEditingItemId(null);
        navigate(returnPath!);
      } else {
        // Add new item
        addItem({
          id: crypto.randomUUID(),
          productId: selectedProduct!.id,
          variantId: selectedVariant.id,
          productName: selectedProduct!.name,
          variantName: selectedVariant.name,
          quantity: calculation.quantity.toString(),
          unitCost: calculation.unitPrice.toString(),
          totalCost: calculation.subtotal.toString(),
        });

        if (isEditMode) {
          navigate(returnPath!);
        } else {
          setSelectedProductId(null);
          setSelectedVariantId(null);
          handleClear();
          if (onAddedToCart) {
            onAddedToCart();
          }
        }
      }
    } catch (error) {
      console.error("[PurchaseCalculatorContent] Error saving item:", error);
    }
  };

  const handleCancel = () => {
    if (isEditMode && editValues) {
      editValues.setEditingItemId(null);
      navigate(returnPath!);
    } else {
      setSelectedProductId(null);
      setSelectedVariantId(null);
      handleClear();
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 space-y-4 overflow-y-auto flex-1">
        {/* Product Selection */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Producto</label>
          {isProductsLoading ? (
            <div className="grid grid-cols-2 gap-2">
              {Array.from({ length: 4 }).map((_, index) => (
                <div
                  key={index}
                  className="shell-card rounded-2xl p-3 space-y-2"
                >
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-5 w-16 rounded-full" />
                </div>
              ))}
            </div>
          ) : products.filter(p => p.isActive).length === 0 ? (
            <Card className="shell-card rounded-3xl border-0">
              <CardContent className="p-4 text-sm text-muted-foreground">
                No hay productos activos.
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-2">
                {products.filter(p => p.isActive).map((product) => (
                  <button
                    key={product.id}
                    onClick={() => {
                      setSelectedProductId(product.id);
                      setSelectedVariantId(null);
                      handleClear();
                    }}
                    className={cn(
                      "rounded-2xl border p-3 text-left transition-colors",
                      selectedProductId === product.id
                        ? "shell-card-muted border-orange-300 bg-orange-50/90"
                        : "border-white/70 bg-white/60 hover:bg-white/82"
                    )}
                  >
                    <p className="font-medium text-sm">{product.name}</p>
                    <Badge variant="secondary" className="mt-1">
                      {product.unit === "kg" ? "Por kilo" : "Por unidad"}
                    </Badge>
                  </button>
                ))}
              </div>
              {isProductsFetching && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Actualizando productos...
                </div>
              )}
            </>
          )}
        </div>

        {/* Variant Selection */}
        {selectedProduct && (
          <div className="space-y-2">
            <label className="text-sm font-medium">Presentación</label>
            {isVariantsLoading ? (
              <div className="grid grid-cols-2 gap-2">
                {Array.from({ length: 2 }).map((_, index) => (
                  <div
                    key={index}
                    className="shell-card rounded-2xl p-3 space-y-2"
                  >
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-4 w-14" />
                  </div>
                ))}
              </div>
            ) : variants.length === 0 ? (
              <Card className="shell-card rounded-3xl border-0">
                <CardContent className="p-4 text-sm text-muted-foreground">
                  Este producto no tiene presentaciones activas.
                </CardContent>
              </Card>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-2">
                  {variants.map((variant) => (
                    <button
                      key={variant.id}
                      onClick={() => {
                        setSelectedVariantId(variant.id);
                        handleClear();
                      }}
                      className={cn(
                        "rounded-2xl border p-3 text-left transition-colors",
                        selectedVariantId === variant.id
                          ? "shell-card-muted border-orange-300 bg-orange-50/90"
                          : "border-white/70 bg-white/60 hover:bg-white/82"
                      )}
                    >
                      <p className="font-medium text-sm">{variant.name}</p>
                      <p className="text-sm text-muted-foreground">
                        Costo: S/ {formatCurrency(parseFloat(variant.price || "0"))}
                      </p>
                    </button>
                  ))}
                </div>
                {isVariantsFetching && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Actualizando presentaciones...
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Calculator Form */}
        {selectedVariant && (
          <div className="space-y-4 border-t pt-4 shell-divider">
            <div className="flex items-center gap-2">
              <CalculatorIcon className="h-5 w-5 text-orange-600" />
              <span className="font-medium">Calculadora de Costo</span>
            </div>

            {isKgProduct ? (
              // KG Product Calculator
              <div className="space-y-3">
                <CalculatorInput
                  name="tara"
                  label="Tara (kg)"
                  value={values.tara}
                  placeholder="0.000"
                  onChange={(value) => setFieldValue("tara", value)}
                  fieldType="quantity"
                  isAutoCalculateTarget={false}
                  onToggleAutoCalculate={() => {}}
                  decimals={3}
                />
                <CalculatorInput
                  name="kilos"
                  label="Kilos netos"
                  value={values.quantity}
                  placeholder="0.000"
                  onChange={(value) => setFieldValue("kilos", value)}
                  fieldType="quantity"
                  isAutoCalculateTarget={isFieldAutoCalculated("quantity")}
                  onToggleAutoCalculate={() => toggleAutoCalculateField("quantity")}
                  decimals={3}
                />
                <CalculatorInput
                  name="pricePerKg"
                  label="Precio por kg (S/)"
                  value={values.price}
                  placeholder={selectedVariant?.price || "0.00"}
                  onChange={(value) => setFieldValue("pricePerKg", value)}
                  fieldType="price"
                  isAutoCalculateTarget={isFieldAutoCalculated("price")}
                  onToggleAutoCalculate={() => toggleAutoCalculateField("price")}
                  decimals={2}
                  helperText={
                    selectedVariant?.price
                      ? `Precio base: S/ ${selectedVariant.price}`
                      : undefined
                  }
                  helperValue={selectedVariant?.price}
                  onApplyHelperValue={(value) => setFieldValue("pricePerKg", value)}
                />
                <CalculatorInput
                  name="totalAmount"
                  label="Total (S/)"
                  value={values.total}
                  placeholder="0.00"
                  onChange={(value) => setFieldValue("totalAmount", value)}
                  fieldType="total"
                  isAutoCalculateTarget={isFieldAutoCalculated("total")}
                  onToggleAutoCalculate={() => toggleAutoCalculateField("total")}
                  decimals={2}
                />
              </div>
            ) : (
              // Unit Product Calculator
              <div className="space-y-3">
                <CalculatorInput
                  name="packs"
                  label="Packs"
                  value={values.quantity}
                  placeholder="0"
                  onChange={(value) => setFieldValue("packs", value)}
                  fieldType="quantity"
                  isAutoCalculateTarget={isFieldAutoCalculated("quantity")}
                  onToggleAutoCalculate={() => toggleAutoCalculateField("quantity")}
                  decimals={0}
                />
                <CalculatorInput
                  name="pricePerPack"
                  label="Precio por pack (S/)"
                  value={values.price}
                  placeholder={selectedVariant?.price || "0.00"}
                  onChange={(value) => setFieldValue("pricePerPack", value)}
                  fieldType="price"
                  isAutoCalculateTarget={isFieldAutoCalculated("price")}
                  onToggleAutoCalculate={() => toggleAutoCalculateField("price")}
                  decimals={2}
                  helperText={
                    selectedVariant?.price
                      ? `Precio base: S/ ${selectedVariant.price}`
                      : undefined
                  }
                  helperValue={selectedVariant?.price}
                  onApplyHelperValue={(value) => setFieldValue("pricePerPack", value)}
                />
                <CalculatorInput
                  name="totalAmount"
                  label="Total (S/)"
                  value={values.total}
                  placeholder="0.00"
                  onChange={(value) => setFieldValue("totalAmount", value)}
                  fieldType="total"
                  isAutoCalculateTarget={isFieldAutoCalculated("total")}
                  onToggleAutoCalculate={() => toggleAutoCalculateField("total")}
                  decimals={2}
                />
              </div>
            )}

            {/* Calculation Summary */}
            {calculation.isValid && (
              <div className="shell-card-muted space-y-2 rounded-2xl p-4">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">
                    Cantidad:
                  </span>
                  <span className="font-medium">
                    {isKgProduct
                      ? `${formatKilos(calculation.quantity)} kg`
                      : `${Math.round(calculation.quantity)} unidades`}
                  </span>
                </div>
                {isKgProduct && (
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">
                      Precio unitario:
                    </span>
                    <span className="font-medium">
                      S/ {formatCurrency(calculation.unitPrice)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between border-t border-orange-200/70 pt-2">
                  <span className="font-medium">Subtotal:</span>
                  <span className="font-bold text-lg">
                    S/ {formatCurrency(calculation.subtotal)}
                  </span>
                </div>
              </div>
            )}

            {/* Config indicator */}
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-500">
                Calculando:{" "}
                <span className="font-medium text-orange-600">
                  {isKgProduct
                    ? isFieldAutoCalculated("quantity")
                      ? "kilos"
                      : isFieldAutoCalculated("price")
                        ? "precio/kg"
                        : "total"
                    : isFieldAutoCalculated("quantity")
                      ? "packs"
                      : isFieldAutoCalculated("price")
                        ? "precio/pack"
                        : "total"}
                </span>
              </span>
              <button
                type="button"
                onClick={handleClear}
                className="text-xs text-gray-500 hover:text-gray-700 underline"
              >
                Limpiar
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      {selectedVariant && (
        <div className="space-y-2 border-t px-4 py-4 shell-surface shell-divider">
          <Button
            onClick={handleSave}
            disabled={!isValid}
            className="h-12 w-full rounded-2xl bg-orange-500 shadow-[0_14px_28px_rgba(249,115,22,0.2)] hover:bg-orange-600 disabled:bg-orange-300"
          >
            <Plus className="h-4 w-4 mr-1" />
            {isEditMode ? "Guardar Cambios" : "Agregar al carrito"} · S/ {formatCurrency(calculation.subtotal)}
          </Button>
          <Button
            variant="outline"
            onClick={handleCancel}
            className="h-12 w-full rounded-2xl border-white/70 bg-white/76 shadow-sm hover:bg-white"
          >
            {isEditMode ? "Cancelar" : "Limpiar"}
          </Button>
        </div>
      )}
    </div>
  );
}
