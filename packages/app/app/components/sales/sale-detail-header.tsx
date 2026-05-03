import {
  ArrowLeft,
  XCircle,
  Share2,
  Calendar,
  MoreHorizontal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MobileShell, MobileSlot } from "~/components/mobile";
import { useCancelSaleDialog } from "~/components/sales/cancel-sale-provider";
import type { Sale } from "~/hooks/use-sales";
import { SaleShareDrawer } from "./sale-share-drawer";
import { RescheduleSaleDialog } from "./reschedule-sale-dialog";

interface SaleDetailHeaderProps {
  canCancel: boolean;
  onBack: () => void;
  sale?: Sale | null;
  title?: string;
}

export function SaleDetailHeader({ canCancel, onBack, sale, title }: SaleDetailHeaderProps) {
  const { open } = useCancelSaleDialog();

  const canShare = sale?.status === "draft" || sale?.status === "confirmed" || sale?.status === "active" || sale?.status === "delivered";
  const canReschedule = sale?.type === "pre_order" && sale?.status === "draft";

  return (
    <>
      <MobileShell.BackButton>
        <Button
          variant="ghost"
          size="icon"
          className="-ml-2 shrink-0 rounded-xl text-muted-foreground hover:bg-white/60 hover:text-foreground dark:hover:bg-white/10"
          onClick={onBack}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
      </MobileShell.BackButton>

      <MobileSlot name="header:center" priority={10}>
        <h1 className="truncate text-lg font-bold tracking-tight">{title ?? "Detalle de venta"}</h1>
      </MobileSlot>

      <MobileSlot name="header:right" priority={10}>
        <div className="flex shrink-0 items-center gap-1.5">
          {sale && canReschedule && (
            <RescheduleSaleDialog
              saleId={sale.id}
              currentDeliveryDate={sale.deliveryDate}
              trigger={
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-xl text-muted-foreground hover:bg-white/60 hover:text-foreground dark:hover:bg-white/10"
                  title="Reprogramar entrega"
                >
                  <Calendar className="h-4 w-4" />
                </Button>
              }
            />
          )}
          {sale && canShare && (
            <SaleShareDrawer
              saleId={sale.id}
              saleStatus={sale.status}
              allowCustomerEdit={sale.allowCustomerEdit}
              trigger={
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-xl text-muted-foreground hover:bg-white/60 hover:text-foreground dark:hover:bg-white/10"
                  title="Compartir venta"
                >
                  <Share2 className="h-4 w-4" />
                </Button>
              }
            />
          )}
          {canCancel && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-xl text-muted-foreground hover:bg-white/60 hover:text-foreground dark:hover:bg-white/10"
                  title="Más acciones"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-48 rounded-xl border border-border bg-popover p-1.5 shadow-lg backdrop-blur text-popover-foreground"
              >
                <DropdownMenuItem
                  onSelect={(event) => {
                    event.preventDefault();
                    open();
                  }}
                  className="gap-2 rounded-lg text-red-600 focus:bg-red-50 focus:text-red-700 dark:text-red-400 dark:focus:bg-red-500/15 dark:focus:text-red-300"
                >
                  <XCircle className="h-4 w-4" />
                  Cancelar venta
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </MobileSlot>
    </>
  );
}
