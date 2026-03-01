"use client";

import React, { useMemo } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FormInput } from "@/components/forms/form-input";
import { usePurchaseForm } from "./purchase-form-context";
import { useVariantsByProduct } from "~/hooks/use-product-variants";
import { useUnitsByProduct } from "~/hooks/use-product-units";

interface PurchaseItemCardProps {
  index: number;
}

export function PurchaseItemCard({ index }: PurchaseItemCardProps) {
  const { form, remove, products, fields } = usePurchaseForm();
  
  const selectedProductId = form.watch(`items.${index}.productId`);
  const selectedUnitId = form.watch(`items.${index}.unitId`);
  const selectedPacks = form.watch(`items.${index}.packs`);
  
  const { data: variants } = useVariantsByProduct(selectedProductId || "", {
    isActive: true,
  });
  
  const { data: units } = useUnitsByProduct(selectedProductId || "", { 
    isActive: true 
  });
  
  const hasVariants = variants && variants.length > 0;
  const hasUnits = units && units.length > 0;
  
  const selectedUnit = useMemo(() => {
    return units?.find((u) => u.id === selectedUnitId);
  }, [units, selectedUnitId]);
  
  const calculatedQuantity = useMemo(() => {
    if (selectedUnit && selectedPacks) {
      return selectedPacks * parseFloat(selectedUnit.baseUnitQuantity);
    }
    return 0;
  }, [selectedUnit, selectedPacks]);
  
  const quantity = form.watch(`items.${index}.quantity`) || 0;
  const unitCost = form.watch(`items.${index}.unitCost`) || 0;
  const subtotal = quantity * unitCost;
  
  const handleProductChange = (productId: string) => {
    form.setValue(`items.${index}.productId`, productId);
    form.setValue(`items.${index}.variantId`, undefined);
    form.setValue(`items.${index}.unitId`, undefined);
    form.setValue(`items.${index}.packs`, undefined);
    form.setValue(`items.${index}.quantity`, 0);
  };
  
  const handleUnitChange = (unitId: string) => {
    form.setValue(`items.${index}.unitId`, unitId);
    form.setValue(`items.${index}.packs`, undefined);
    form.setValue(`items.${index}.quantity`, 0);
  };
  
  const handlePacksChange = (packs: number) => {
    if (selectedUnit && packs > 0) {
      const finalQuantity = packs * parseFloat(selectedUnit.baseUnitQuantity);
      form.setValue(`items.${index}.quantity`, finalQuantity);
    }
  };
  
  return (
    <Card className="border-0 shadow-md rounded-2xl">
      <CardContent className="p-4 space-y-3">
        {/* Product Selector */}
        <div className="space-y-2">
          <label className="text-xs">Producto</label>
          <select
            value={selectedProductId || ""}
            onChange={(e) => handleProductChange(e.target.value)}
            className="w-full h-10 rounded-xl border border-input bg-transparent px-3 py-2 text-sm"
          >
            <option value="">Seleccionar producto...</option>
            {products?.map((product) => (
              <option key={product.id} value={product.id}>
                {product.name}
              </option>
            ))}
          </select>
          {form.formState.errors.items?.[index]?.productId && (
            <p className="text-sm text-destructive">
              {form.formState.errors.items[index]?.productId?.message}
            </p>
          )}
        </div>
        
        {/* Variant Selector */}
        {hasVariants && (
          <div className="space-y-2">
            <label className="text-xs">Variante</label>
            <select
              {...form.register(`items.${index}.variantId`)}
              className="w-full h-10 rounded-xl border border-input bg-transparent px-3 py-2 text-sm"
            >
              <option value="">Seleccionar variante...</option>
              {variants?.map((variant) => (
                <option key={variant.id} value={variant.id}>
                  {variant.name}
                </option>
              ))}
            </select>
          </div>
        )}
        
        {/* Unit Selector */}
        {hasUnits && (
          <div className="space-y-2">
            <label className="text-xs">Unidad de medida</label>
            <select
              value={selectedUnitId || ""}
              onChange={(e) => handleUnitChange(e.target.value)}
              className="w-full h-10 rounded-xl border border-input bg-transparent px-3 py-2 text-sm"
            >
              <option value="">Sin unidad configurada (cantidad directa)</option>
              {units?.map((unit) => (
                <option key={unit.id} value={unit.id}>
                  {unit.displayName}
                </option>
              ))}
            </select>
          </div>
        )}
        
        {/* Quantity & Cost Inputs */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <label className="text-xs">
              {selectedUnitId ? "Cantidad de packs" : "Cantidad"}
            </label>
            {selectedUnitId ? (
              <>
                <FormInput
                  type="number"
                  min="0.001"
                  step="0.001"
                  error={form.formState.errors.items?.[index]?.packs?.message}
                  {...form.register(`items.${index}.packs`, {
                    valueAsNumber: true,
                    onChange: (e: React.ChangeEvent<HTMLInputElement>) => 
                      handlePacksChange(e.target.valueAsNumber),
                  })}
                  placeholder="Ingresa cantidad de packs"
                />
                {selectedUnit && selectedPacks && calculatedQuantity > 0 ? (
                  <p className="text-xs text-orange-600 font-semibold">
                    {selectedPacks} × {selectedUnit.baseUnitQuantity} = {calculatedQuantity} unidades
                  </p>
                ) : null}
              </>
            ) : (
              <FormInput
                type="number"
                min="0.001"
                step="0.001"
                error={form.formState.errors.items?.[index]?.quantity?.message}
                {...form.register(`items.${index}.quantity`, { valueAsNumber: true })}
                placeholder="Ingresa cantidad"
              />
            )}
          </div>
          
          <FormInput
            label="Costo unitario (S/)"
            type="number"
            min="0"
            step="0.01"
            error={form.formState.errors.items?.[index]?.unitCost?.message}
            {...form.register(`items.${index}.unitCost`, { valueAsNumber: true })}
          />
        </div>
        
        {/* Subtotal & Remove */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">
            Subtotal: S/ {subtotal.toFixed(2)}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => remove(index)}
            className="text-red-500 hover:text-red-600"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
