import { User } from "lucide-react";
import { Label } from "@/components/ui/label";
import { CustomerSearch } from "@/components/sales/customer-search";
import type { Customer } from "~/lib/db/schema";

interface OrderCustomerFieldProps {
  selectedCustomer: Customer | null;
  onSelectCustomer: (customer: Customer | null) => void;
}

export function OrderCustomerField({
  selectedCustomer,
  onSelectCustomer,
}: OrderCustomerFieldProps) {
  return (
    <div className="space-y-2">
      <Label className="flex items-center gap-2">
        <User className="h-4 w-4" />
        Cliente
      </Label>
      <CustomerSearch
        selectedCustomer={selectedCustomer}
        onSelectCustomer={onSelectCustomer}
      />
    </div>
  );
}
