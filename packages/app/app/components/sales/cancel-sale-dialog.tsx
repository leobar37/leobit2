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
