import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
} from "@/components/ui/drawer";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
    (selectedReason === "Otro" && !customReason);

  return (
    <Drawer open={isOpen} onOpenChange={onOpenChange}>
      <DrawerContent className="px-4 pb-4">
        <DrawerHeader>
          <DrawerTitle>¿Por qué no compró?</DrawerTitle>
          <DrawerDescription>
            Selecciona el motivo por el cual{" "}
            <span className="font-semibold">
              {visita?.customer?.name}
            </span>{" "}
            no realizó la compra
          </DrawerDescription>
        </DrawerHeader>

        <div className="space-y-4 py-4">
          <Select
            value={selectedReason}
            onValueChange={onReasonChange}
          >
            <SelectTrigger>
              <SelectValue placeholder="Seleccionar motivo" />
            </SelectTrigger>
            <SelectContent>
              {motivoOptions.map((motivo) => (
                <SelectItem key={motivo} value={motivo}>
                  {motivo}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {selectedReason === "Otro" && (
            <Input
              placeholder="Especificar motivo..."
              value={customReason}
              onChange={(e) => onCustomReasonChange(e.target.value)}
            />
          )}
        </div>

        <DrawerFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={onConfirm}
            disabled={isConfirmDisabled}
            className="bg-red-600 hover:bg-red-700"
          >
            {isUpdating && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Confirmar
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
