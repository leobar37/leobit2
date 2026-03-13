import {
  CalendarDays,
  ChevronRight,
  ShoppingCart,
  Trash2,
  User,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn, formatCurrency } from "~/lib/utils";
import { useDeleteSale } from "~/hooks/use-sales";
import { useConfirmDialog } from "~/hooks/use-confirm-dialog";
import type { Sale } from "~/lib/db/schemas/sale";

interface SaleCardProps {
  sale: Sale;
  onClick?: () => void;
}

const syncStatusLabel: Record<Sale["syncStatus"], string> = {
  pending: "Pendiente",
  synced: "Sincronizado",
  error: "Error",
};

const saleStatusLabel: Record<Sale["status"], string> = {
  draft: "Borrador",
  confirmed: "Confirmada",
  active: "Activa",
  delivered: "Entregada",
  cancelled: "Cancelada",
};

function formatSaleDate(value: Date | string | null | undefined) {
  if (!value) {
    return "Sin fecha";
  }

  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Sin fecha";
  }

  return date.toLocaleString("es-PE", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function SaleCard({ sale, onClick }: SaleCardProps) {
  const customerName = sale.customer?.name || "Cliente general";
  const isCredit = sale.saleType === "credito";
  const isDraft = sale.status === "draft";
  const hasBalanceDue = Number(sale.balanceDue || 0) > 0;
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
        await deleteSale.mutateAsync(sale.id);
      } catch (error) {
        console.error("Error deleting sale:", error);
      }
    }
  };

  return (
    <>
      <div
        onClick={onClick}
        className="cursor-pointer"
      >
        <Card className="w-full rounded-[26px] border border-stone-200/80 bg-white/80 shadow-[0_2px_10px_rgba(15,23,42,0.03)] transition-colors hover:border-stone-300/90">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-[18px] bg-orange-50 ring-1 ring-orange-100/80">
                <ShoppingCart className="h-5 w-5 text-orange-600" />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-[1.05rem] font-semibold leading-tight text-foreground sm:text-lg">
                      {customerName}
                    </p>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                      Venta #{sale.id.slice(-6)}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {isDraft && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-full text-red-500 ring-1 ring-red-100/80 transition-colors hover:bg-red-50 hover:text-red-600"
                        onClick={handleDelete}
                        disabled={deleteSale.isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}

                    <div className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground ring-1 ring-stone-200/90">
                      <ChevronRight className="h-4 w-4 flex-shrink-0" />
                    </div>
                  </div>
                </div>

                <div className="mt-3 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-2xl font-bold leading-none tracking-[-0.03em] text-foreground">
                      S/ {formatCurrency(sale.totalAmount)}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {isCredit ? "Crédito" : "Contado"}
                    </p>
                  </div>

                  <div className="flex flex-wrap justify-end gap-2">
                    <Badge
                      variant="outline"
                      className={cn(
                        "rounded-full border-0 px-3 py-1 text-xs font-semibold",
                        isDraft
                          ? "bg-amber-100 text-amber-700"
                          : "bg-green-100 text-green-700"
                      )}
                    >
                      {saleStatusLabel[sale.status]}
                    </Badge>

                    <Badge
                      variant="outline"
                      className={cn(
                        "rounded-full border-0 px-3 py-1 text-xs font-semibold",
                        sale.syncStatus === "error"
                          ? "bg-red-100 text-red-700"
                          : sale.syncStatus === "pending"
                            ? "bg-blue-100 text-blue-700"
                            : "bg-slate-100 text-slate-700"
                      )}
                    >
                      {syncStatusLabel[sale.syncStatus]}
                    </Badge>

                    {hasBalanceDue && (
                      <Badge
                        variant="outline"
                        className="rounded-full border-0 bg-orange-100 px-3 py-1 text-xs font-semibold text-orange-700"
                      >
                        Debe S/ {formatCurrency(sale.balanceDue)}
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="mt-3 grid gap-2 border-t border-stone-200/80 pt-3 text-sm text-muted-foreground sm:grid-cols-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-stone-100 text-stone-500">
                      <User className="h-4 w-4" />
                    </div>
                    <span className="truncate">{customerName}</span>
                  </div>

                  <div className="flex min-w-0 items-center gap-2 sm:justify-end">
                    <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-stone-100 text-stone-500">
                      <CalendarDays className="h-4 w-4" />
                    </div>
                    <span className="truncate">{formatSaleDate(sale.saleDate)}</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <ConfirmDialog />
    </>
  );
}
