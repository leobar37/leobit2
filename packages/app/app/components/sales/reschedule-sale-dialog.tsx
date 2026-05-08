/**
 * Reschedule Sale Dialog
 * Dialog for rescheduling the delivery date of a pre-order sale
 */
import { useState } from "react";
import { toast } from "sonner";
import { formatDateForInput } from "~/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { useUpdateSale } from "~/hooks/use-sales";

interface RescheduleSaleDialogProps {
  saleId: string;
  currentDeliveryDate?: string | null;
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

    const selectedDate = new Date(newDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (selectedDate < today) {
      toast.error("La fecha de entrega no puede ser en el pasado");
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
    } catch {
      toast.error("Error al reprogramar la venta");
    }
  };

  return (
    <>
      <div onClick={handleOpen} className="cursor-pointer">
        {trigger}
      </div>
      <Sheet open={open} onOpenChange={handleClose}>
        <SheetContent side="bottom" className="rounded-t-3xl pb-8">
          <SheetHeader className="text-left">
            <SheetTitle>Reprogramar entrega</SheetTitle>
            <SheetDescription>
              Selecciona la nueva fecha de entrega para esta venta
            </SheetDescription>
          </SheetHeader>

          <div className="py-4 space-y-3">
            <DatePicker
              value={newDate}
              onChange={setNewDate}
              label="Fecha de entrega"
              placeholder="Seleccionar fecha"
              minDate={formatDateForInput(new Date())}
              quickActionLabels={["Hoy", "Mañana"]}
            />
            {currentDeliveryDate && (
              <p className="text-sm text-muted-foreground">
                Fecha actual: {formatDateDisplay(currentDeliveryDate)}
              </p>
            )}
          </div>

          <SheetFooter className="flex-row-reverse gap-2">
            <Button onClick={handleSubmit} disabled={updateSale.isPending}>
              {updateSale.isPending ? "Guardando..." : "Guardar"}
            </Button>
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancelar
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </>
  );
}

function formatDateDisplay(date: Date | string): string {
  return new Date(date).toLocaleDateString("es-PE", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}
