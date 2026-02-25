import { useAtom } from "jotai";
import { CustomerSearch } from "~/components/sales/customer-search";
import { selectedCustomerAtom } from "~/atoms/new-sale";

export function CustomerSection() {
  const [selectedCustomer, setSelectedCustomer] = useAtom(selectedCustomerAtom);

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
