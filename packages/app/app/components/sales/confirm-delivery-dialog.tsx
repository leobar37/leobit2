import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Calendar } from "lucide-react";
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
import { FormInput } from "@/components/forms";

const paymentMethods = [
  { value: "efectivo", label: "Efectivo" },
  { value: "yape", label: "Yape" },
  { value: "plin", label: "Plin" },
  { value: "transferencia", label: "Transferencia" },
  { value: "saldo", label: "Saldo a favor" },
] as const;

type PaymentMethod = (typeof paymentMethods)[number]["value"];

const confirmDeliverySchema = z.object({
  advancePaymentMethod: z.nativeEnum({
    efectivo: "efectivo",
    yape: "yape",
    plin: "plin",
    transferencia: "transferencia",
    saldo: "saldo",
  }, {
    required_error: "Selecciona un método de pago",
  }),
  advanceReferenceNumber: z.string().optional(),
  deliveryDate: z.string().optional(),
});

type ConfirmDeliveryFormValues = z.infer<typeof confirmDeliverySchema>;

interface ConfirmDeliveryDialogProps {
  isOpen: boolean;
  onClose: () => void;
  saleId: string;
  saleNumber: string;
  onConfirm: (options: {
    advancePaymentMethod: PaymentMethod;
    advanceReferenceNumber?: string;
    deliveryDate?: string;
  }) => Promise<void>;
}

export function ConfirmDeliveryDialog({
  isOpen,
  onClose,
  saleId,
  saleNumber,
  onConfirm,
}: ConfirmDeliveryDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
  } = useForm<ConfirmDeliveryFormValues>({
    resolver: zodResolver(confirmDeliverySchema),
    defaultValues: {
      advancePaymentMethod: undefined,
      advanceReferenceNumber: "",
      deliveryDate: "",
    },
  });

  const selectedPaymentMethod = watch("advancePaymentMethod");

  const onSubmit = async (data: ConfirmDeliveryFormValues) => {
    setIsSubmitting(true);
    try {
      await onConfirm({
        advancePaymentMethod: data.advancePaymentMethod,
        advanceReferenceNumber: data.advanceReferenceNumber || undefined,
        deliveryDate: data.deliveryDate || undefined,
      });
      reset();
      onClose();
    } catch (error) {
      console.error("Error confirming delivery:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Confirmar Pedido #{saleNumber}</DialogTitle>
          <DialogDescription>
            Registra el pago anticipado para confirmar el pedido. La fecha de entrega es opcional.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-4">
          {/* Payment Method - Required */}
          <div className="space-y-2">
            <Label htmlFor="advancePaymentMethod">
              Método de pago anticipado <span className="text-red-500">*</span>
            </Label>
            <select
              id="advancePaymentMethod"
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              {...register("advancePaymentMethod")}
            >
              <option value="">Selecciona un método</option>
              {paymentMethods.map((method) => (
                <option key={method.value} value={method.value}>
                  {method.label}
                </option>
              ))}
            </select>
            {errors.advancePaymentMethod && (
              <p className="text-sm text-red-500">
                {errors.advancePaymentMethod.message}
              </p>
            )}
          </div>

          {/* Reference Number - Optional but shown when method selected */}
          {selectedPaymentMethod && selectedPaymentMethod !== "efectivo" && (
            <FormInput
              label="Número de referencia"
              placeholder="Ej: 987654321"
              error={errors.advanceReferenceNumber?.message}
              {...register("advanceReferenceNumber")}
            />
          )}

          {/* Delivery Date - Optional */}
          <div className="space-y-2">
            <Label htmlFor="deliveryDate">
              <Calendar className="inline h-4 w-4 mr-1" />
              Fecha de entrega (opcional)
            </Label>
            <input
              type="date"
              id="deliveryDate"
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              {...register("deliveryDate")}
            />
            <p className="text-xs text-muted-foreground">
              Define cuándo se entregara el pedido. Puedes dejarlo en blanco.
            </p>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirmar Pedido
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
