import { CustomerSearch } from "~/components/sales/customer-search";
import { useSaleStore } from "~/stores/sale.store";

export function CustomerSection() {
  const selectedCustomer = useSaleStore((state) => state.selectedCustomer);
  const setSelectedCustomer = useSaleStore((state) => state.setSelectedCustomer);

  return (
    <section>
      <h2 className="text-sm font-medium text-muted-foreground mb-2">Cliente</h2>
      <CustomerSearch
        selectedCustomer={selectedCustomer}
        onSelectCustomer={setSelectedCustomer}
      />
    </section>
  );
}
