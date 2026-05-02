import { CustomerSelect } from "~/components/customers/customer-select";
import { useUpdateSale } from "~/hooks/use-sales";
import { useSaleCalculations } from "~/hooks/use-sale-calculations";
import { useToast } from "~/hooks/use-toast";
import { useNewSaleContext } from "../new-sale-context";

export function CustomerSection() {
  const { saleId, visitaId, sale, items } = useNewSaleContext();
  const updateSale = useUpdateSale();
  const { toast } = useToast();

  const calculations = useSaleCalculations(sale, items);

  const isFromVisita = !!visitaId;

  const handleSelectCustomer = async (
    customer: { id: string; name: string; phone?: string | null } | null,
  ) => {
    if (!saleId || !updateSale) return;

    try {
      await updateSale.mutateAsync({
        id: saleId,
        input: {
          customerId: customer?.id ?? undefined,
        },
      });
    } catch (error) {
      toast.error("Error al seleccionar cliente", {
        description: "No se pudo actualizar el cliente de la venta",
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
  );
}
