import {
  CalendarDays,
  ChevronRight,
  Trash2,
  User,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatDeliveryCountdown, formatRecentDateTime } from "~/lib/date-utils";
import { cn, formatCurrency } from "~/lib/utils";
import { useDeleteSale } from "~/hooks/use-sales";
import { useConfirmDialog } from "~/hooks/use-confirm-dialog";
import type { Sale } from "~/hooks/use-sales";

interface SaleCardProps {
  sale: Sale;
  onClick?: () => void;
}

const saleStatusLabel: Record<Sale["status"], string> = {
  draft: "Borrador",
  confirmed: "Confirmada",
  active: "Activa",
  delivered: "Entregada",
  cancelled: "Cancelada",
};

const saleTypeLabel: Record<Sale["type"], string> = {
  instant_sale: "Venta",
  pre_order: "Pedido",
};

export function SaleCard({ sale, onClick }: SaleCardProps) {
  const customerName = sale.customer?.name || "Cliente general";
  const isCredit = sale.saleType === "credito";
  const isDraft = sale.status === "draft";
  const hasBalanceDue = Number(sale.balanceDue || 0) > 0;
  const isPreOrder = sale.type === "pre_order";
  const deleteSale = useDeleteSale();
  const { confirm, ConfirmDialog } = useConfirmDialog();

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const confirmed = await confirm({
      title: "Eliminar Venta",
      description: isDraft
        ? "¿Estás seguro de que deseas eliminar esta venta en borrador? Esta acción no se puede deshacer."
        : "¿Estás seguro de que deseas cancelar esta venta? El estado cambiará a cancelada.",
      confirmText: "Eliminar",
      cancelText: "Cancelar",
      variant: "destructive",
    });

    if (confirmed) {
      try {
        await deleteSale.mutateAsync({ id: sale.id, status: sale.status });
      } catch {
        /* mutation onError already shows user feedback */
      }
    }
  };

  return (
    <>
      <div
        onClick={onClick}
        className="cursor-pointer"
      >
        <Card className="shell-card-flat w-full rounded-[24px] transition-colors hover:border-stone-300/90 dark:hover:border-white/15">
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-[1.05rem] font-semibold leading-tight text-foreground sm:text-lg">
                  {customerName}
                </p>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {saleTypeLabel[sale.type]} #{sale.id.slice(-6)}
                </p>
              </div>

              <div className="flex items-center gap-2">
                {isDraft && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 rounded-full text-red-500 ring-1 ring-red-100/80 transition-colors hover:bg-red-50 hover:text-red-600 dark:ring-red-500/20 dark:hover:bg-red-500/10 dark:hover:text-red-300"
                    onClick={handleDelete}
                    disabled={deleteSale.isPending}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}

                <div className="flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground ring-1 ring-stone-200/90 dark:ring-white/10">
                  <ChevronRight className="h-3.5 w-3.5 flex-shrink-0" />
                </div>
              </div>
            </div>

            <div className="mt-3 flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="max-w-full whitespace-nowrap text-[clamp(1.5rem,6vw,1.8rem)] font-bold leading-tight tracking-[-0.035em] text-foreground">
                  S/ {formatCurrency(sale.totalAmount)}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {isCredit ? "Crédito" : "Contado"}
                </p>
              </div>

              <div className="flex max-w-[44%] flex-wrap justify-end gap-1.5 self-start">
                <Badge
                  variant={isDraft ? "warning" : "success"}
                  className={cn(
                    "rounded-full border-0 px-2.5 py-1 text-[11px] font-semibold leading-none shadow-none"
                  )}
                >
                  {saleStatusLabel[sale.status]}
                </Badge>

                {hasBalanceDue && (
                  <Badge
                    variant="warning"
                    className="rounded-full border-0 px-2.5 py-1 text-[11px] font-semibold leading-none shadow-none"
                  >
                    Debe S/ {formatCurrency(sale.balanceDue)}
                  </Badge>
                )}
              </div>
            </div>

            <div className="mt-3 grid gap-2 border-t shell-divider pt-3 text-sm text-muted-foreground sm:grid-cols-2">
              <div className="flex min-w-0 items-center gap-2">
                <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-stone-100 text-stone-500 dark:bg-white/8 dark:text-white/50">
                  <User className="h-3.5 w-3.5" />
                </div>
                <span className="truncate">{customerName}</span>
              </div>

              <div className="flex min-w-0 items-center gap-2 sm:justify-end">
                <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-stone-100 text-stone-500 dark:bg-white/8 dark:text-white/50">
                  <CalendarDays className="h-3.5 w-3.5" />
                </div>
                <span className="truncate">
                  {isPreOrder
                    ? formatDeliveryCountdown(sale.deliveryDate)
                    : formatRecentDateTime(sale.saleDate)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <ConfirmDialog />
    </>
  );
}
