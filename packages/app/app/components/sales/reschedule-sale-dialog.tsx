/**
 * Reschedule Sale Dialog
 * Dialog for rescheduling the delivery date of a pre-order sale
 */
import { useState } from "react";
import { Calendar } from "lucide-react";
import { toast } from "sonner";
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
import { useUpdateSale } from "~/hooks/use-sales";

interface RescheduleSaleDialogProps {
  saleId: string;
  currentDeliveryDate?: Date | null;
  trigger?: React.ReactNode;
}

export function RescheduleSaleDialog({
  saleId,
  currentDeliveryDate,
  trigger,
}: RescheduleSaleDialogProps) {
  const [open, setOpen] = useState(false);
  const [newDate, setNewDate] = useState<string>("");
  const updateSale = useUpdateSale();

  const handleOpen = () => {
    // Set initial date to current delivery date or today
    if (currentDeliveryDate) {
      setNewDate(formatDateForInput(currentDeliveryDate));
    } else {
      setNewDate(formatDateForInput(new Date()));
    }
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setNewDate("");
  };

  const handleSubmit = async () => {
    if (!newDate) {
      toast.error("Selecciona una fecha de entrega");
      return;
    }

    try {
      await updateSale.mutateAsync({
        id: saleId,
        input: {
          deliveryDate: newDate,
        },
      });
      toast.success("Fecha de entrega actualizada");
      handleClose();
    } catch (error) {
      toast.error("Error al reprogramar la venta");
      console.error(error);
    }
  };

  return (
    <>
      <div onClick={handleOpen} className="cursor-pointer">
        {trigger}
      </div>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reprogramar entrega</DialogTitle>
            <DialogDescription>
              Selecciona la nueva fecha de entrega para esta venta
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <Label htmlFor="deliveryDate">Fecha de entrega</Label>
            <div className="mt-2">
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  id="deliveryDate"
                  type="date"
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 pl-10 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>
            </div>
            {currentDeliveryDate && (
              <p className="mt-2 text-sm text-muted-foreground">
                Fecha actual: {formatDateDisplay(currentDeliveryDate)}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={updateSale.isPending}>
              {updateSale.isPending ? "Guardando..." : "Guardar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function formatDateForInput(date: Date): string {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDateDisplay(date: Date): string {
  return new Date(date).toLocaleDateString("es-PE", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}
