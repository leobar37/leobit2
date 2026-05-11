import { useState } from "react";
import { Calendar, ShoppingCart, Loader2, Check } from "lucide-react";
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
import { useNavigate } from "react-router";
import { cn } from "~/lib/utils";
import { addDays, formatDisplayDate, isSameDay } from "~/lib/date-utils";
import { useBusinessMode } from "~/hooks/use-business-mode";
import { WaterQuickSaleSheet } from "./water-quick-sale-sheet";

interface CreateSaleTypeSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerId?: string;
}

export function CreateSaleTypeSheet({ open, onOpenChange, customerId }: CreateSaleTypeSheetProps) {
  const { mode: businessMode } = useBusinessMode();

  if (businessMode === "agua") {
    return (
      <WaterQuickSaleSheet
        open={open}
        onOpenChange={onOpenChange}
        customerId={customerId}
      />
    );
  }

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
          <VentaDirectaOption onOpenChange={onOpenChange} customerId={customerId} />
          <ProgramarPedidoOption onOpenChange={onOpenChange} customerId={customerId} />
        </div>
      </SheetContent>
    </Sheet>
  );
}

function VentaDirectaOption({ onOpenChange, customerId }: { onOpenChange: (open: boolean) => void; customerId?: string }) {
  const navigate = useNavigate();
  const createDraftSale = useCreateDraftSale();
  const [loading, setLoading] = useState(false);

  const handleVentaDirecta = async () => {
    // Prevent duplicate creation from rapid clicks
    if (createDraftSale.isPending || loading) {
      return;
    }

    setLoading(true);
    try {
      const sale = await createDraftSale.mutateAsync({ type: "instant_sale", customerId });
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
      disabled={loading || createDraftSale.isPending}
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

function ProgramarPedidoOption({ onOpenChange, customerId }: { onOpenChange: (open: boolean) => void; customerId?: string }) {
  const navigate = useNavigate();
  const createDraftSale = useCreateDraftSale();
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [loading, setLoading] = useState(false);

  // Default to tomorrow for pre-orders
  const today = new Date();
  const tomorrow = addDays(today, 1);
  const [deliveryDate, setDeliveryDate] = useState(formatDateForInput(tomorrow));

  const isToday = isSameDay(deliveryDate, today);
  const isTomorrow = isSameDay(deliveryDate, tomorrow);

  const getDateLabel = () => {
    if (isToday) return `Hoy, ${formatDisplayDate(deliveryDate)}`;
    if (isTomorrow) return `Mañana, ${formatDisplayDate(deliveryDate)}`;
    return formatDisplayDate(deliveryDate);
  };

  const handleSelectProgramar = () => {
    // Always reset to tomorrow when opening
    setDeliveryDate(formatDateForInput(addDays(new Date(), 1)));
    setShowDatePicker(true);
  };

  const handleConfirmProgramar = async () => {
    if (createDraftSale.isPending || loading) return;

    setLoading(true);
    try {
      const sale = await createDraftSale.mutateAsync({
        type: "pre_order",
        deliveryDate,
        customerId,
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

  const handleQuickSelect = (days: number) => {
    const date = addDays(new Date(), days);
    setDeliveryDate(formatDateForInput(date));
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

          <div className="py-4 space-y-3">
            {/* Quick shortcuts */}
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => handleQuickSelect(0)}
                className={cn(
                  "flex items-center justify-center gap-2 rounded-xl border-2 px-4 py-3 text-sm font-medium transition-colors",
                  isToday
                    ? "border-orange-500 bg-orange-50 text-orange-700 dark:border-orange-500 dark:bg-orange-500/15 dark:text-orange-300"
                    : "border-border bg-background text-foreground hover:border-orange-300 hover:bg-accent dark:hover:border-orange-500/50"
                )}
              >
                {isToday && <Check className="h-4 w-4" />}
                Hoy
              </button>
              <button
                type="button"
                onClick={() => handleQuickSelect(1)}
                className={cn(
                  "flex items-center justify-center gap-2 rounded-xl border-2 px-4 py-3 text-sm font-medium transition-colors",
                  isTomorrow
                    ? "border-orange-500 bg-orange-50 text-orange-700 dark:border-orange-500 dark:bg-orange-500/15 dark:text-orange-300"
                    : "border-border bg-background text-foreground hover:border-orange-300 hover:bg-accent dark:hover:border-orange-500/50"
                )}
              >
                {isTomorrow && <Check className="h-4 w-4" />}
                Mañana
              </button>
            </div>

            {/* Selected date display */}
            <div className="flex items-center gap-3 rounded-xl border border-border bg-accent/50 px-4 py-3">
              <Calendar className="h-5 w-5 text-orange-500" />
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">
                  {getDateLabel()}
                </p>
                <p className="text-xs text-muted-foreground">
                  Fecha de entrega seleccionada
                </p>
              </div>
            </div>

            {/* DatePicker for custom date */}
            <DatePicker
              value={deliveryDate}
              onChange={setDeliveryDate}
              label="O selecciona otra fecha"
              placeholder="Seleccionar fecha"
              minDate={formatDateForInput(new Date())}
              quickActionLabels={["Hoy", "Mañana"]}
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
