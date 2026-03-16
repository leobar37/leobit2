import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
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
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Confirmar compra</DialogTitle>
          <DialogDescription>
            ¿El cliente{" "}
            <span className="font-semibold">
              {visita?.customer?.name}
            </span>{" "}
            realizó una compra?
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={onConfirm}
            disabled={isUpdating}
            className="bg-green-600 hover:bg-green-700"
          >
            {isUpdating && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Sí, compró
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
