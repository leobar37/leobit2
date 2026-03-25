import { useState } from "react";
import { Calendar, ShoppingCart, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { formatDateForInput } from "~/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { useCreateDraftSale } from "~/hooks/use-sales";
import { useBusiness } from "~/hooks/use-business";
import { useNavigate } from "react-router";

interface CreateSaleTypeSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateSaleTypeSheet({ open, onOpenChange }: CreateSaleTypeSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-3xl pb-8">
        <SheetHeader className="text-left">
          <SheetTitle className="text-xl">Nueva venta</SheetTitle>
          <SheetDescription>
            Elige el tipo de venta que quieres crear
          </SheetDescription>
        </SheetHeader>
        <div className="mt-6 space-y-3">
          <VentaDirectaOption onOpenChange={onOpenChange} />
          <ProgramarPedidoOption onOpenChange={onOpenChange} />
        </div>
      </SheetContent>
    </Sheet>
  );
}

function VentaDirectaOption({ onOpenChange }: { onOpenChange: (open: boolean) => void }) {
  const navigate = useNavigate();
  const { data: business, isLoading: businessLoading } = useBusiness();
  const createDraftSale = useCreateDraftSale();
  const [loading, setLoading] = useState(false);

  const handleVentaDirecta = async () => {
    if (!business?.businessUserId) {
      toast.error("Error al crear venta", {
        description: "No se encontró el usuario vendedor",
      });
      return;
    }

    setLoading(true);
    try {
      const sale = await createDraftSale.mutateAsync({ type: "instant_sale" });
      onOpenChange(false);
      navigate(`/ventas/${sale.id}/editar`);
    } catch (err) {
      toast.error("Error al crear venta", {
        description: err instanceof Error ? err.message : "Error desconocido",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleVentaDirecta}
      disabled={loading || businessLoading || createDraftSale.isPending}
      className="flex w-full items-center gap-4 rounded-2xl border border-stone-200/80 bg-white p-4 text-left shadow-sm transition-colors hover:bg-orange-50/50 active:bg-orange-100/50 disabled:opacity-50"
    >
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-orange-100">
        <ShoppingCart className="h-6 w-6 text-orange-600" />
      </div>
      <div className="flex-1">
        <p className="font-semibold text-foreground">Venta directa</p>
        <p className="text-sm text-muted-foreground">
          Venta inmediata al cliente
        </p>
      </div>
      {loading || createDraftSale.isPending ? (
        <Loader2 className="h-5 w-5 animate-spin text-orange-500" />
      ) : (
        <div className="h-5 w-5 rounded-full border-2 border-orange-500" />
      )}
    </button>
  );
}

function ProgramarPedidoOption({ onOpenChange }: { onOpenChange: (open: boolean) => void }) {
  const navigate = useNavigate();
  const { data: business } = useBusiness();
  const createDraftSale = useCreateDraftSale();
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [deliveryDate, setDeliveryDate] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSelectProgramar = () => {
    setDeliveryDate(formatDateForInput(new Date()));
    setShowDatePicker(true);
  };

  const handleConfirmProgramar = async () => {
    if (!deliveryDate) {
      toast.error("Selecciona una fecha de entrega");
      return;
    }

    if (!business?.businessUserId) {
      toast.error("Error al crear venta", {
        description: "No se encontró el usuario vendedor",
      });
      return;
    }

    setLoading(true);
    try {
      const sale = await createDraftSale.mutateAsync({
        type: "pre_order",
        deliveryDate,
      });
      setShowDatePicker(false);
      onOpenChange(false);
      navigate(`/ventas/${sale.id}/editar`);
    } catch (err) {
      toast.error("Error al crear venta", {
        description: err instanceof Error ? err.message : "Error desconocido",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={handleSelectProgramar}
        disabled={createDraftSale.isPending}
        className="flex w-full items-center gap-4 rounded-2xl border border-stone-200/80 bg-white p-4 text-left shadow-sm transition-colors hover:bg-orange-50/50 active:bg-orange-100/50 disabled:opacity-50"
      >
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-100">
          <Calendar className="h-6 w-6 text-blue-600" />
        </div>
        <div className="flex-1">
          <p className="font-semibold text-foreground">Programar pedido</p>
          <p className="text-sm text-muted-foreground">
            Pedido con fecha de entrega futura
          </p>
        </div>
        {createDraftSale.isPending ? (
          <Loader2 className="h-5 w-5 animate-spin text-orange-500" />
        ) : (
          <div className="h-5 w-5 rounded-full border-2 border-blue-500" />
        )}
      </button>

      <Sheet open={showDatePicker} onOpenChange={setShowDatePicker}>
        <SheetContent side="bottom" className="rounded-t-3xl pb-8">
          <SheetHeader className="text-left">
            <SheetTitle>Programar pedido</SheetTitle>
            <SheetDescription>
              Selecciona la fecha de entrega para este pedido
            </SheetDescription>
          </SheetHeader>
          <div className="py-4">
            <DatePicker
              value={deliveryDate}
              onChange={setDeliveryDate}
              label="Fecha de entrega"
              placeholder="Selecciona la fecha de entrega"
              minDate={formatDateForInput(new Date())}
            />
          </div>
          <SheetFooter className="flex-row-reverse gap-2">
            <Button
              onClick={handleConfirmProgramar}
              disabled={loading || createDraftSale.isPending}
            >
              {loading || createDraftSale.isPending ? "Creando..." : "Crear pedido"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowDatePicker(false)}
            >
              Cancelar
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </>
  );
}
