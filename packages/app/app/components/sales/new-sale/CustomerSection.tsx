import { CustomerSearch } from "~/components/sales/customer-search";
import { useSaleStore } from "~/stores/sale.store";
import { useCustomerBalance } from "~/hooks/use-customer-balance";
import { formatCurrency } from "~/lib/utils";
import { TrendingUp, AlertCircle } from "lucide-react";
import { getDebtLevel } from "~/lib/debt";

function CustomerDebtBadge({ customerId }: { customerId: string }) {
  const { data: balance } = useCustomerBalance(customerId);

  if (!balance || balance.balanceDue <= 0) return null;

  const debtLevel = getDebtLevel(balance.balanceDue);

  return (
    <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${debtLevel.color}`}>
      <TrendingUp className="h-3 w-3" />
      <span>S/ {formatCurrency(balance.balanceDue)}</span>
    </div>
  );
}

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
      {selectedCustomer && (
        <div className="mt-2 flex justify-end">
          <CustomerDebtBadge customerId={selectedCustomer.id} />
        </div>
      )}
    </section>
  );
}
