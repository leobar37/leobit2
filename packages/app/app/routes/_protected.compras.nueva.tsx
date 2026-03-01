import { useState } from "react";
import { ShoppingCart, Plus, Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FormInput } from "@/components/forms/form-input";
import { useSetLayout } from "~/components/layout/app-layout";
import { SupplierSelector } from "~/components/purchases/supplier-selector";
import { SupplierQuickForm } from "~/components/purchases/supplier-quick-form";
import { PurchaseFormProvider, usePurchaseForm } from "~/components/purchases/purchase-form-context";
import { PurchaseItemCard } from "~/components/purchases/purchase-item-card";
import type { Supplier } from "~/hooks/use-suppliers";

useSetLayout({
  title: "Nueva Compra",
  showBackButton: true,
  backHref: "/compras",
});

function PurchaseFormInner() {
  const { 
    fields, 
    append, 
    supplier, 
    setSupplier, 
    onSubmit, 
    isPending, 
    isFormValid, 
    totalAmount,
    form 
  } = usePurchaseForm();
  
  const [isQuickFormOpen, setIsQuickFormOpen] = useState(false);
  
  const handleSupplierSelect = (newSupplier: Supplier | null) => {
    setSupplier(newSupplier);
  };
  
  const handleQuickFormSuccess = (newSupplier: Supplier) => {
    setSupplier(newSupplier);
  };
  
  const hasError = !!form.formState.errors.root;
  const errorMessage = form.formState.errors.root?.message;
  
  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 bg-orange-100 rounded-2xl flex items-center justify-center">
          <ShoppingCart className="h-8 w-8 text-orange-600" />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">
            Registra una nueva compra de productos
          </p>
        </div>
      </div>
      
      {/* Supplier */}
      <div className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
            Proveedor *
          </label>
          <SupplierSelector
            selectedSupplier={supplier}
            onSelectSupplier={handleSupplierSelect}
            onCreateNew={() => setIsQuickFormOpen(true)}
          />
        </div>
        
        <FormInput
          name="purchaseDate"
          label="Fecha de compra"
          type="date"
          required
        />
      </div>
      
      {/* Products */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium">Productos *</label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => append({ 
              productId: "", 
              variantId: undefined, 
              unitId: undefined, 
              packs: undefined, 
              quantity: 0, 
              unitCost: 0 
            })}
            className="rounded-xl"
          >
            <Plus className="h-4 w-4 mr-1" />
            Agregar
          </Button>
        </div>
        
        <div className="space-y-3">
          {fields.map((field, index) => (
            <PurchaseItemCard key={field.id} index={index} />
          ))}
        </div>
        
        {fields.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">
            Agrega al menos un producto
          </p>
        )}
        
        {form.formState.errors.items?.root && (
          <p className="text-sm text-destructive">
            {form.formState.errors.items.root.message}
          </p>
        )}
      </div>
      
      {/* Notes */}
      <div className="space-y-2">
        <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
          Notas
        </label>
        <textarea
          {...form.register("notes")}
          rows={3}
          placeholder="Información adicional sobre la compra"
          className="w-full rounded-xl border border-input bg-transparent px-3 py-2 text-sm"
        />
      </div>
      
      {/* Total & Submit */}
      <div className="space-y-4">
        <div className="flex items-center justify-between p-4 bg-orange-50 rounded-2xl">
          <span className="font-medium">Total:</span>
          <span className="text-xl font-bold">S/ {totalAmount.toFixed(2)}</span>
        </div>
        
        {/* Error Message */}
        {hasError && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl">
            <p className="text-sm text-red-600 text-center">{errorMessage}</p>
          </div>
        )}
        
        <Button
          type="submit"
          className="w-full bg-orange-500 hover:bg-orange-600 rounded-xl"
          disabled={isPending}
        >
          {isPending ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Guardando...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Guardar Compra
            </>
          )}
        </Button>
      </div>
      
      {/* Quick Create Supplier Modal */}
      <SupplierQuickForm
        open={isQuickFormOpen}
        onOpenChange={setIsQuickFormOpen}
        onSuccess={handleQuickFormSuccess}
      />
    </form>
  );
}

export default function NuevaCompraPage() {
  return (
    <PurchaseFormProvider>
      <PurchaseFormInner />
    </PurchaseFormProvider>
  );
}
