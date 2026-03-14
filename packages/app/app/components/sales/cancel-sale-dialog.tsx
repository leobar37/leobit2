import { Controller, useFormContext, useWatch } from "react-hook-form";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { FormInput, FormNumberInput } from "@/components/forms";
import {
  useCancelSaleDialog,
  type CancelSaleFormValues,
} from "~/components/sales/cancel-sale-provider";

const refundMethodLabels = {
  efectivo: "Efectivo",
  yape: "Yape",
  plin: "Plin",
  transferencia: "Transferencia",
  saldo: "Saldo",
} as const;

const cancelModeLabels = {
  simple: "Simple - Solo ingresa motivo",
  complete: "Completa - Reversa todo automaticamente",
  custom: "Personalizada - Elige que reversar",
} as const;

export function CancelSaleDialog() {
  const {
    close,
    handleOpenChange,
    isCancelling,
    isOpen,
    paidAmount,
    saleNumber,
    submit,
  } = useCancelSaleDialog();
  const {
    control,
    formState: { errors },
    register,
    setValue,
  } = useFormContext<CancelSaleFormValues>();
  const hasRefund = useWatch({ control, name: "hasRefund" });
  const refundMethod = useWatch({ control, name: "refundMethod" });
  const cancelMode = useWatch({ control, name: "cancelMode" });
  const reverseAbones = useWatch({ control, name: "reverseAbones" });
  const restoreInventory = useWatch({ control, name: "restoreInventory" });

  const showCustomOptions = cancelMode === "custom";
  const showCompleteSummary = cancelMode === "complete";

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cancelar venta #{saleNumber}</DialogTitle>
          <DialogDescription>
            Esta accion no se puede deshacer. El saldo del cliente se ajustara automaticamente.
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-4 py-4" onSubmit={submit}>
          <FormInput
            label="Motivo de cancelacion *"
            placeholder="Ej: Error en el monto, cliente cancelo..."
            error={errors.reason?.message}
            {...register("reason")}
          />

          <div className="space-y-2">
            <Label>Modo de cancelacion</Label>
            <div className="space-y-2">
              {(["simple", "complete", "custom"] as const).map((mode) => (
                <div key={mode} className="flex items-center gap-2">
                  <input
                    id={`cancelMode-${mode}`}
                    type="radio"
                    value={mode}
                    {...register("cancelMode")}
                    className="h-4 w-4"
                  />
                  <Label htmlFor={`cancelMode-${mode}`} className="font-normal cursor-pointer">
                    {cancelModeLabels[mode]}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {showCompleteSummary && paidAmount > 0 && (
            <div className="rounded-md bg-green-50 p-3 text-sm text-green-800 border border-green-200">
              <p className="font-medium">Se realizara:</p>
              <ul className="mt-1 list-disc list-inside">
                <li>Reversar todos los abonos ({paidAmount.toFixed(2)})</li>
                <li>Restaurar inventario utilizado</li>
                <li>Registrar reembolso si aplica</li>
              </ul>
            </div>
          )}

          {showCustomOptions && (
            <div className="space-y-3 border-t pt-4">
              <Label className="font-medium">Opciones de reversión:</Label>
              <div className="flex items-center gap-2">
                <input
                  id="reverseAbones"
                  type="checkbox"
                  className="h-4 w-4"
                  {...register("reverseAbones")}
                />
                <Label htmlFor="reverseAbones" className="font-normal">
                  Reversar abonos (monto: {paidAmount.toFixed(2)})
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <input
                  id="restoreInventory"
                  type="checkbox"
                  className="h-4 w-4"
                  {...register("restoreInventory")}
                />
                <Label htmlFor="restoreInventory" className="font-normal">
                  Restaurar inventario
                </Label>
              </div>
            </div>
          )}

          {paidAmount > 0 && (
            <div className="space-y-3 border-t pt-4">
              <div className="flex items-center gap-2">
                <input
                  id="hasRefund"
                  type="checkbox"
                  className="h-4 w-4"
                  {...register("hasRefund")}
                />
                <Label htmlFor="hasRefund" className="font-medium">
                  La venta tiene pagos - registrar reembolso o saldo
                </Label>
              </div>

              {hasRefund && (
                <>
                  <Controller
                    control={control}
                    name="refundAmount"
                    render={({ field }) => (
                      <FormNumberInput
                        label="Monto del reembolso"
                        error={errors.refundAmount?.message}
                        maxAmount={paidAmount}
                        decimals={2}
                        {...field}
                      />
                    )}
                  />

                  <div>
                    <Label htmlFor="refundMethod">Metodo de reembolso</Label>
                    <div className="mt-2 flex gap-2">
                      {(
                        [
                          "efectivo",
                          "yape",
                          "plin",
                          "transferencia",
                          "saldo",
                        ] as const
                      ).map((method) => (
                        <Button
                          key={method}
                          type="button"
                          variant={refundMethod === method ? "default" : "outline"}
                          size="sm"
                          className="flex-1"
                          onClick={() => setValue("refundMethod", method, { shouldDirty: true })}
                        >
                          {refundMethodLabels[method]}
                        </Button>
                      ))}
                    </div>
                  </div>

                  {(refundMethod === "yape" || refundMethod === "plin") && (
                    <FormInput
                      label="Numero de operacion"
                      placeholder="Ej: 123456789"
                      error={errors.refundReference?.message}
                      {...register("refundReference")}
                    />
                  )}
                </>
              )}
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={close}>
              Cerrar
            </Button>
            <Button type="submit" variant="destructive" disabled={isCancelling}>
              {isCancelling && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirmar cancelacion
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
