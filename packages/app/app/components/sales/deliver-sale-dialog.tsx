import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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
import { FormInput } from "@/components/forms";

const deliverSaleSchema = z.object({
  // For now, no additional fields needed for delivery
  // Could add final price adjustment in the future
});

type DeliverSaleFormValues = z.infer<typeof deliverSaleSchema>;

interface DeliverSaleDialogProps {
  isOpen: boolean;
  onClose: () => void;
  saleId: string;
  saleNumber: string;
  onDeliver: () => Promise<void>;
}

export function DeliverSaleDialog({
  isOpen,
  onClose,
  saleId,
  saleNumber,
  onDeliver,
}: DeliverSaleDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    handleSubmit,
    reset,
  } = useForm<DeliverSaleFormValues>({
    resolver: zodResolver(deliverSaleSchema),
  });

  const onSubmit = async () => {
    setIsSubmitting(true);
    try {
      await onDeliver();
      reset();
      onClose();
    } catch {
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
          <DialogTitle>Completar Entrega #{saleNumber}</DialogTitle>
          <DialogDescription>
            Confirma que el pedido ha sido entregado al cliente. Esta accion no se puede deshacer.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-4">
          <div className="rounded-lg bg-orange-50 p-4 border border-orange-200">
            <p className="text-sm text-orange-800">
              El pedido sera marcado como <strong>Entregado</strong> y ya no podra ser modificado.
            </p>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting} variant="default">
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirmar Entrega
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
