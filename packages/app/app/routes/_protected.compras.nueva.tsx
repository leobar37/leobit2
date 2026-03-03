import { useState } from "react";
import { ShoppingCart, Loader2, Save, Receipt } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FormInput } from "@/components/forms/form-input";
import { FormDate } from "@/components/forms/form-date";
import { FileUploader } from "@/components/ui/file-uploader";
import { SupplierSelector } from "~/components/purchases/supplier-selector";
import { SupplierQuickForm } from "~/components/purchases/supplier-quick-form";
import { PurchaseFormProvider, usePurchaseForm } from "~/components/purchases/purchase-form-context";
import { PurchaseCalculatorSection, PurchaseCartSection } from "~/components/purchases/calculator";
import { FormPage } from "~/components/layout/form-page";
import type { Supplier } from "~/hooks/use-suppliers";

function PurchaseFormInner() {
  const {
    supplier,
    setSupplier,
    receiptFile,
    receiptPreview,
    handleReceiptSelect,
    handleReceiptClear,
    fileUploadStatus,
    onSubmit,
    isPending,
    isFormValid,
    totalAmount,
    cartItemsCount,
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
    <>
      <form className="space-y-6">
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

          <FormDate
            name="purchaseDate"
            label="Fecha de compra"
            required
          />

          <FormInput
            name="invoiceNumber"
            label="Número de factura"
            placeholder="Opcional"
          />
        </div>

        {/* Calculator & Cart */}
        <div className="space-y-4">
          <PurchaseCalculatorSection />
          <PurchaseCartSection />

          {cartItemsCount === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              Agrega productos usando la calculadora
            </p>
          )}
        </div>

        {/* Receipt Image */}
        <div className="space-y-2">
          <label className="text-sm font-medium flex items-center gap-2">
            <Receipt className="h-4 w-4" />
            Foto del comprobante
          </label>
          <FileUploader
            file={receiptFile}
            previewUrl={receiptPreview}
            status={
              fileUploadStatus.isUploading
                ? "uploading"
                : fileUploadStatus.isPending
                ? "pending"
                : "idle"
            }
            error={fileUploadStatus.isError ? "Error al subir imagen" : null}
            label="Foto del comprobante (opcional)"
            helperText="Toma una foto de la factura o boleta"
            onFileSelect={handleReceiptSelect}
            onClear={handleReceiptClear}
          />
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

        {/* Total */}
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
      </form>

      {/* Quick Create Supplier Modal */}
      <SupplierQuickForm
        open={isQuickFormOpen}
        onOpenChange={setIsQuickFormOpen}
        onSuccess={handleQuickFormSuccess}
      />
    </>
  );
}

export default function NuevaCompraPage() {
  return (
    <PurchaseFormProvider>
      <PurchaseFormContent />
    </PurchaseFormProvider>
  );
}

// Wrapper to access context for toolbar
function PurchaseFormContent() {
  const {
    onSubmit,
    isPending,
    fileUploadStatus,
    isFormValid,
  } = usePurchaseForm();

  return (
    <FormPage
      title="Nueva Compra"
      backHref="/compras"
      icon={ShoppingCart}
      maxWidth="lg"
      toolbar={
        <Button
          onClick={onSubmit}
          disabled={isPending || fileUploadStatus.isUploading || !isFormValid}
          className="w-full h-14 rounded-xl bg-orange-500 hover:bg-orange-600 text-lg font-semibold disabled:opacity-100 disabled:bg-orange-300 disabled:text-white"
        >
          {isPending || fileUploadStatus.isUploading ? (
            <>
              <Loader2 className="h-5 w-5 mr-2 animate-spin" />
              Guardando...
            </>
          ) : (
            <>
              <Save className="h-5 w-5 mr-2" />
              Guardar Compra
            </>
          )}
        </Button>
      }
    >
      <PurchaseFormInner />
    </FormPage>
  );
}
