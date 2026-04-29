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
import { cn } from "~/lib/utils";

interface CreateSaleTypeSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateSaleTypeSheet({ open, onOpenChange }: CreateSaleTypeSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="shell-surface rounded-t-3xl border shell-divider pb-8"
      >
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
    // Prevent duplicate creation from rapid clicks
    if (createDraftSale.isPending || loading) {
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
      className={cn(
        "flex w-full items-center gap-4 rounded-2xl border p-4 text-left shadow-sm transition-colors disabled:opacity-50",
        "border-orange-200/80 bg-white/90 hover:border-orange-300 hover:bg-orange-50/80 active:bg-orange-100/70",
        "dark:border-orange-500/25 dark:bg-[#171922] dark:hover:border-orange-500/45 dark:hover:bg-orange-500/10 dark:active:bg-orange-500/15",
      )}
    >
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-orange-500/15 ring-1 ring-orange-500/20">
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
        <div className="h-5 w-5 rounded-full border-2 border-orange-500/90 bg-orange-500/10" />
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
    // Prevent duplicate creation from rapid clicks
    if (createDraftSale.isPending || loading) {
      return;
    }

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
        className={cn(
          "flex w-full items-center gap-4 rounded-2xl border p-4 text-left shadow-sm transition-colors disabled:opacity-50",
          "border-blue-200/80 bg-white/90 hover:border-blue-300 hover:bg-blue-50/80 active:bg-blue-100/70",
          "dark:border-blue-500/25 dark:bg-[#171922] dark:hover:border-blue-500/45 dark:hover:bg-blue-500/10 dark:active:bg-blue-500/15",
        )}
      >
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-500/15 ring-1 ring-blue-500/20">
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
          <div className="h-5 w-5 rounded-full border-2 border-blue-500/90 bg-blue-500/10" />
        )}
      </button>

      <Sheet open={showDatePicker} onOpenChange={setShowDatePicker}>
        <SheetContent
          side="bottom"
          className="shell-surface rounded-t-3xl border shell-divider pb-8"
        >
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
