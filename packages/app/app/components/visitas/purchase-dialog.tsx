import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
} from "@/components/ui/drawer";
import type { Visita } from "~/hooks/use-visitas";

interface PurchaseDialogProps {
  visita: Visita | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  isUpdating: boolean;
  onConfirm: () => void;
}

export function PurchaseDialog({
  visita,
  isOpen,
  onOpenChange,
  isUpdating,
  onConfirm,
}: PurchaseDialogProps) {
  return (
    <Drawer open={isOpen} onOpenChange={onOpenChange}>
      <DrawerContent className="px-4 pb-4">
        <DrawerHeader>
          <DrawerTitle>Confirmar compra</DrawerTitle>
          <DrawerDescription>
            ¿El cliente{" "}
            <span className="font-semibold">
              {visita?.customer?.name}
            </span>{" "}
            realizó una compra?
          </DrawerDescription>
        </DrawerHeader>
        <DrawerFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={onConfirm}
            disabled={isUpdating}
            className="bg-orange-500 hover:bg-orange-600"
          >
            {isUpdating && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Sí, bought
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
