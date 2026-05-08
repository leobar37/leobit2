import { Loader2, MessageCircleOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "~/lib/utils";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
} from "@/components/ui/drawer";
import type { Visita } from "~/hooks/use-visitas";

const motivoOptions = [
  "No tenía dinero",
  "No le interesó",
  "Ya compré en otro lugar",
  "Precio muy alto",
  "No había producto",
  "Otro",
];

interface NoPurchaseDialogProps {
  visita: Visita | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  selectedReason: string;
  onReasonChange: (reason: string) => void;
  customReason: string;
  onCustomReasonChange: (reason: string) => void;
  isUpdating: boolean;
  onConfirm: () => void;
}

export function NoPurchaseDialog({
  visita,
  isOpen,
  onOpenChange,
  selectedReason,
  onReasonChange,
  customReason,
  onCustomReasonChange,
  isUpdating,
  onConfirm,
}: NoPurchaseDialogProps) {
  const isConfirmDisabled =
    isUpdating ||
    !selectedReason ||
    (selectedReason === "Otro" && !customReason.trim());

  return (
    <Drawer open={isOpen} onOpenChange={onOpenChange}>
      <DrawerContent className="px-4 pb-4">
        <DrawerHeader className="px-0 text-left">
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-orange-50 text-orange-600 dark:bg-orange-400/10 dark:text-orange-200">
            <MessageCircleOff className="h-5 w-5" />
          </div>
          <DrawerTitle className="text-xl">Registrar no compra</DrawerTitle>
          <DrawerDescription className="text-sm leading-5">
            Guarda el motivo de{" "}
            <span className="font-medium text-foreground">
              {visita?.customer?.name || "este cliente"}
            </span>
            . Te ayudará a entender mejor la ruta sin cerrar la visita como venta.
          </DrawerDescription>
        </DrawerHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Motivo
            </p>
            <div className="grid grid-cols-2 gap-2">
              {motivoOptions.map((motivo) => {
                const isSelected = selectedReason === motivo;
                return (
                  <Button
                    key={motivo}
                    type="button"
                    variant="outline"
                    className={cn(
                      "h-auto min-h-10 justify-start whitespace-normal rounded-xl px-3 py-2 text-left text-xs font-medium",
                      isSelected &&
                        "border-orange-300 bg-orange-50 text-orange-700 hover:bg-orange-50 dark:border-orange-400/30 dark:bg-orange-500/20 dark:text-orange-100 dark:hover:bg-orange-500/25"
                    )}
                    onClick={() => onReasonChange(motivo)}
                  >
                    {motivo}
                  </Button>
                );
              })}
            </div>
          </div>

          {selectedReason === "Otro" && (
            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Detalle
              </p>
              <Input
                placeholder="Escribe el motivo"
                value={customReason}
                onChange={(e) => onCustomReasonChange(e.target.value)}
                className="h-11 rounded-xl"
              />
            </div>
          )}
        </div>

        <DrawerFooter className="flex-col gap-2 px-0 pt-4 sm:flex-col sm:space-x-0">
          <Button
            onClick={onConfirm}
            disabled={isConfirmDisabled}
            className="h-11 rounded-xl bg-orange-500 text-white hover:bg-orange-600 disabled:bg-muted disabled:text-muted-foreground"
          >
            {isUpdating && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Guardar motivo
          </Button>
          <Button
            variant="ghost"
            className="h-10 rounded-xl"
            onClick={() => onOpenChange(false)}
            disabled={isUpdating}
          >
            Volver
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
