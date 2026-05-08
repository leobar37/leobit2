import { CustomerSelect } from "~/components/customers/customer-select";
import { useUpdateSale } from "~/hooks/use-sales";
import { useSaleCalculations } from "~/hooks/use-sale-calculations";
import { useToast } from "~/hooks/use-toast";
import { useConfirmDialog } from "~/hooks/use-confirm-dialog";
import { useNewSaleContext } from "../new-sale-context";

export function CustomerSection() {
  const { saleId, visitaId, sale, items, paymentForm, updatePaymentForm } = useNewSaleContext();
  const updateSale = useUpdateSale();
  const { toast } = useToast();
  const { confirm, ConfirmDialog } = useConfirmDialog();

  const calculations = useSaleCalculations(sale, items);

  const isFromVisita = !!visitaId;

  const handleSelectCustomer = async (
    customer: { id: string; name: string; phone?: string | null } | null,
  ) => {
    if (!saleId || !updateSale) return;

    const isClearing = customer === null;
    // Only show reset confirmation if the user currently sees a credit payment mode
    const needsPaymentReset =
      isClearing &&
      (paymentForm.paymentMode === "a_cuenta" || paymentForm.paymentMode === "debe_todo");

    if (needsPaymentReset) {
      const confirmed = await confirm({
        title: "Quitar cliente",
        description: "Al quitar el cliente se reiniciará el pago a 'Pago Total'. ¿Continuar?",
        confirmText: "Sí, quitar",
        cancelText: "Cancelar",
        variant: "destructive",
      });
      if (!confirmed) return;
    }

    try {
      const input: Parameters<typeof updateSale.mutateAsync>[0]["input"] = {
        customerId: customer?.id ?? null,
      };

      if (needsPaymentReset) {
        input.saleType = "contado";
        input.paymentMode = "pago_total";
        input.amountPaid = calculations.totalAmount;
      }

      await updateSale.mutateAsync({
        id: saleId,
        input,
      });

      if (needsPaymentReset) {
        updatePaymentForm({
          paymentMode: "pago_total",
          amountPaid: "",
          paymentMethod: null,
          referenceNumber: "",
          proofImageId: null,
        });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      toast.error("Error al actualizar cliente", {
        description: message || "No se pudo actualizar el cliente de la venta",
      });
    }
  };

  const customerId = sale?.customerId ?? null;
  const customer = sale?.customer
    ? {
        id: sale.customer.id,
        name: sale.customer.name,
        phone: sale.customer.phone,
      }
    : null;

  return (
    <>
      <CustomerSelect
        value={customerId}
        selectedCustomer={customer}
        onChange={handleSelectCustomer}
        disabled={isFromVisita}
        placeholder={isFromVisita ? "Cliente de la visita" : "Seleccionar cliente"}
        helperText={
          calculations.requiresCustomer
            ? "Requerido para venta a crédito"
            : isFromVisita
              ? "El cliente no se puede cambiar en ventas de visita"
              : undefined
        }
      />
      <ConfirmDialog />
    </>
  );
}
