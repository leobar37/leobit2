import { useEffect } from "react";
import { cn, formatCurrency } from "~/lib/utils";
import { useNavigate, useLocation, useParams } from "react-router";
import { ShoppingCart, Loader2, Save, Receipt, Calculator, ChevronRight, FileEdit, CircleAlert, CircleCheckBig, CircleDollarSign, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FormInput } from "@/components/forms/form-input";
import { FormDate } from "@/components/forms/form-date";
import { FileUploader } from "@/components/ui/file-uploader";
import { SupplierSelector } from "~/components/purchases/supplier-selector";
import { usePurchaseForm } from "~/components/purchases/purchase-form-context";
import { FormProvider } from "react-hook-form";
import { PurchaseCartSection } from "~/components/purchases/calculator";
import { FormPage } from "~/components/layout/form-page";
import type { Supplier } from "~/hooks/use-suppliers";

function DraftIndicator() {
  const { purchase, isLoading } = usePurchaseForm();

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-gray-100 rounded-lg text-sm text-gray-600">
        <Loader2 className="h-4 w-4 animate-spin" />
        Cargando...
      </div>
    );
  }

  if (!purchase) return null;

  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg">
      <FileEdit className="h-4 w-4 text-blue-600" />
      <span className="text-sm text-blue-700">
        Modo borrador - Los cambios se guardan automáticamente
      </span>
    </div>
  );
}

function PurchaseProgress({
  hasSupplier,
  hasItems,
  hasReceipt,
}: {
  hasSupplier: boolean;
  hasItems: boolean;
  hasReceipt: boolean;
}) {
  const steps = [
    {
      label: "Proveedor",
      done: hasSupplier,
      icon: Truck,
    },
    {
      label: "Productos",
      done: hasItems,
      icon: CircleDollarSign,
    },
    {
      label: "Comprobante",
      done: hasReceipt,
      icon: Receipt,
      optional: true,
    },
  ];

  return (
    <div className="rounded-[24px] border border-orange-200/80 bg-orange-50/75 p-4">
      <p className="text-sm font-semibold text-orange-900">Checklist de la compra</p>
      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
        {steps.map((step) => {
          const Icon = step.done ? CircleCheckBig : step.icon;
          return (
            <div
              key={step.label}
              className={cn(
                "rounded-2xl border px-3 py-3 text-sm",
                step.done
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border-orange-200 bg-white/80 text-muted-foreground"
              )}
            >
              <div className="flex items-center gap-2">
                <Icon className="h-4 w-4" />
                <span className="font-medium">{step.label}</span>
              </div>
              <p className="mt-1 text-xs">
                {step.done ? "Listo" : step.optional ? "Opcional" : "Pendiente"}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PurchaseFormInner() {
  const {
    supplier,
    setSupplier,
    receiptFile,
    receiptPreview,
    handleReceiptSelect,
    handleReceiptClear,
    fileUploadStatus,
    purchaseError,
    onSave,
    cartItemsCount,
    form,
  } = usePurchaseForm();

  const navigate = useNavigate();
  const location = useLocation();
  const { draftId } = useParams<{ draftId: string }>();

  useEffect(() => {
    const stateSupplier = location.state?.supplier as Supplier | undefined;
    if (stateSupplier) {
      setSupplier(stateSupplier);
      window.history.replaceState({}, document.title);
    }
  }, [location.state, setSupplier]);

  const handleSupplierSelect = (newSupplier: Supplier | null) => {
    setSupplier(newSupplier);
  };

  const hasError = !!purchaseError;
  const errorMessage = purchaseError;
  const hasSupplier = !!supplier;
  const hasItems = cartItemsCount > 0;
  const hasReceipt = !!receiptFile || !!receiptPreview;

  return (
    <>
      <FormProvider {...form}>
        <form onSubmit={form.handleSubmit(onSave)} className="space-y-6">
        <DraftIndicator />
        <PurchaseProgress
          hasSupplier={hasSupplier}
          hasItems={hasItems}
          hasReceipt={hasReceipt}
        />

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              Proveedor *
            </label>
            <SupplierSelector
              selectedSupplier={supplier}
              onSelectSupplier={handleSupplierSelect}
            />
            {!hasSupplier && (
              <p className="text-sm text-amber-700">
                Elige o crea un proveedor para poder guardar la compra.
              </p>
            )}
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

        <div className="space-y-4">
          <button
            type="button"
            onClick={() => navigate(draftId ? `/compras/nueva/${draftId}/calculadora` : "/compras/nueva/calculadora")}
            className="w-full flex items-center justify-between p-4 bg-orange-50 border border-orange-200 rounded-2xl hover:bg-orange-100 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center">
                <Calculator className="h-5 w-5 text-white" />
              </div>
              <div className="text-left">
                <p className="font-semibold text-orange-700">Agregar Producto</p>
                <p className="text-xs text-orange-600">
                  {cartItemsCount > 0
                    ? `${cartItemsCount} producto${cartItemsCount > 1 ? "s" : ""} agregado${cartItemsCount > 1 ? "s" : ""}`
                    : "Usa la calculadora para calcular costos"}
                </p>
              </div>
            </div>
            <ChevronRight className="h-5 w-5 text-orange-500" />
          </button>

          <PurchaseCartSection />

          {cartItemsCount === 0 && (
            <div className="rounded-2xl border border-dashed border-orange-200 bg-orange-50/50 px-4 py-4 text-center">
              <p className="text-sm font-medium text-foreground">
                Todavía no agregaste productos
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Usa la calculadora para cargar los items y construir el total de la compra.
              </p>
            </div>
          )}
        </div>

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

        {hasError && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl">
            <div className="flex items-start gap-2 text-red-600">
              <CircleAlert className="mt-0.5 h-4 w-4 flex-shrink-0" />
              <p className="text-sm">{errorMessage}</p>
            </div>
          </div>
        )}
        </form>
      </FormProvider>
    </>
  );
}

export default function NuevaCompraIndexPage() {
  const { onSave, isPending, fileUploadStatus, isFormValid, totalAmount } =
    usePurchaseForm();

  return (
    <FormPage
      title="Nueva Compra"
      backHref="/compras"
      icon={ShoppingCart}
      maxWidth="lg"
      toolbar={
        <>
          <div className="flex items-center justify-between px-1 pb-2">
            <span className="text-sm text-muted-foreground">Total:</span>
            <span className="text-lg font-bold">S/ {formatCurrency(totalAmount)}</span>
          </div>
          <Button
            onClick={onSave}
            disabled={isPending || fileUploadStatus.isUploading || !isFormValid}
            data-testid="save-purchase-button"
            className={cn(
              "w-full h-14 rounded-xl text-lg font-semibold transition-colors",
              isPending || fileUploadStatus.isUploading || !isFormValid
                ? "bg-orange-300 text-white/70 cursor-not-allowed"
                : "bg-orange-500 hover:bg-orange-600 text-white"
            )}
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
        </>
      }
    >
      <PurchaseFormInner />
    </FormPage>
  );
}
