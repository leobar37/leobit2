import { useMemo, useRef } from "react";
import { useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import { useFinalizeSale } from "~/hooks/use-sales-db";
import { useSaleCalculations } from "~/hooks/use-sale-calculations";
import { formatCurrency, cn } from "~/lib/utils";
import { useNewSaleContext } from "../new-sale-context";
import { useToast } from "~/hooks/use-toast";
import { decimalToNumber } from "@avileo/shared";
import { useQueryClient } from "@tanstack/react-query";
import type { SaleWithItems } from "~/hooks/use-sales";
import { queryKeys } from "~/lib/query-keys";


export function SaleSubmitBar() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { saleId, returnTo, sale, items, paymentForm, resetPaymentForm, hasOptimisticItems } = useNewSaleContext();
  const { toast } = useToast();
  const finalizeSale = useFinalizeSale();
  const isOnline = true;
  const isWaitingRef = useRef(false);

  const calculations = useSaleCalculations(sale, items);

  const isDeliveryMode = sale?.type === "pre_order" && sale?.status === "confirmed";

  const handleSubmit = async () => {
    if (!calculations.canSubmit || !saleId || !sale) return;

    if (!isOnline) {
      toast.error("Necesitas conexión a internet para confirmar la venta.");
      return;
    }

    // Wait for any optimistic items to resolve before finalizing
    if (hasOptimisticItems && !isWaitingRef.current) {
      isWaitingRef.current = true;
      toast.info("Esperando a que se guarden los productos...", {
        duration: 3000,
      });

      try {
        await new Promise<void>((resolve, reject) => {
          const startTime = Date.now();
          const timeout = 10000; // 10 seconds max wait
          const interval = setInterval(() => {
            const currentSale = queryClient.getQueryData<SaleWithItems>(queryKeys.sales.detail(saleId));
            const stillPending = currentSale?.items?.some((i) => i.isOptimistic) ?? false;

            if (!stillPending) {
              clearInterval(interval);
              resolve();
              return;
            }

            if (Date.now() - startTime > timeout) {
              clearInterval(interval);
              reject(new Error("Timeout esperando que se guarden los productos"));
            }
          }, 100);
        });
      } catch (err) {
        toast.error("No se pudieron guardar todos los productos", {
          description: "Intenta de nuevo en unos segundos.",
        });
        isWaitingRef.current = false;
        return;
      } finally {
        isWaitingRef.current = false;
      }
    }

    try {
      if (isDeliveryMode) {
        const deliveryItems = items.map(item => ({
          itemId: item.id,
          deliveredQuantity: parseFloat(item.quantity || item.orderedQuantity || "0"),
          unitPriceFinal: parseFloat(item.unitPrice || item.unitPriceQuoted || "0"),
          subtotal: parseFloat(item.subtotal),
        }));

        await finalizeSale.mutateAsync({
          id: saleId,
          type: sale.type,
          version: sale.version,
          isDeliveryMode: true,
          deliveryItems,
          amountPaid: decimalToNumber(sale.amountPaid),
          paymentMode: sale.paymentMode || undefined,
        });

        toast.success("Pedido entregado exitosamente");
      } else {
        const finalAmountPaid =
          paymentForm.paymentMode === "pago_total"
            ? calculations.totalAmount
            : paymentForm.paymentMode === "debe_todo"
              ? 0
              : decimalToNumber(paymentForm.amountPaid);

        await finalizeSale.mutateAsync({
          id: saleId,
          type: sale.type,
          version: sale.version,
          paymentMode: paymentForm.paymentMode,
          paymentMethod: paymentForm.paymentMethod || undefined,
          amountPaid: finalAmountPaid,
          referenceNumber: paymentForm.referenceNumber || undefined,
          proofImageId: paymentForm.proofImageId || undefined,
        });
        resetPaymentForm();
      }

      navigate(returnTo);
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo completar la venta";
      toast.error(isDeliveryMode ? "Error al confirmar entrega" : "Error al finalizar venta", {
        description: message,
      });
    }
  };

  const buttonText = useMemo(() => {
    if (isWaitingRef.current) return "Esperando...";
    if (finalizeSale.isPending) return "Procesando...";
    if (isDeliveryMode) return "Confirmar Entrega";
    if (sale?.type === "pre_order") return "Confirmar Pedido";
    return "Finalizar Venta";
  }, [finalizeSale.isPending, sale?.type, isDeliveryMode]);

  if (items.length === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-[calc(72px+env(safe-area-inset-bottom))] left-0 right-0 bg-background/86 px-4 py-3 z-50 backdrop-blur-xl">
      <div className="flex items-center justify-between gap-4">
        <div className="flex flex-col">
          <span className="text-xs text-muted-foreground">
            {items.length} {items.length === 1 ? 'producto' : 'productos'}
          </span>
          <span className="text-lg font-bold text-orange-600">
            S/ {formatCurrency(calculations.totalAmount)}
          </span>
        </div>
        <Button
          onClick={handleSubmit}
          disabled={!calculations.canSubmit || finalizeSale.isPending || isWaitingRef.current || !isOnline}
          className={cn(
            "h-11 px-6 rounded-xl text-sm font-semibold shadow-md whitespace-nowrap disabled:opacity-100",
            isDeliveryMode
              ? "bg-indigo-500 hover:bg-indigo-600 disabled:bg-indigo-300"
              : "bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300"
          )}
        >
          {buttonText}
        </Button>
      </div>
    </div>
  );
}
