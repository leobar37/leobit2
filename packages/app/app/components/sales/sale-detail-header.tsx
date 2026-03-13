import { ArrowLeft, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCancelSaleDialog } from "~/components/sales/cancel-sale-provider";

interface SaleDetailHeaderProps {
  canCancel: boolean;
  onBack: () => void;
}

export function SaleDetailHeader({ canCancel, onBack }: SaleDetailHeaderProps) {
  const { open } = useCancelSaleDialog();

  return (
    <header className="sticky top-0 z-50 border-b shell-surface">
      <div className="flex h-16 items-center gap-4 px-4">
        <Button variant="ghost" size="icon" className="rounded-2xl" onClick={onBack}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="flex-1 text-lg font-bold">Detalle de Venta</h1>
        {canCancel && (
          <Button variant="destructive" size="sm" className="rounded-2xl" onClick={open}>
            <XCircle className="mr-1 h-4 w-4" />
            Cancelar
          </Button>
        )}
      </div>
    </header>
  );
}
