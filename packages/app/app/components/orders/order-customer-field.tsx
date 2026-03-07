import { User, UserPlus } from "lucide-react";
import { Label } from "@/components/ui/label";
import { CustomerSearch } from "@/components/sales/customer-search";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "~/lib/utils";
import type { Customer } from "~/lib/db/schema";

interface OrderCustomerFieldProps {
  selectedCustomer: Customer | null;
  onSelectCustomer: (customer: Customer | null) => void;
  isAnonymousCustomer?: boolean;
  onToggleAnonymous?: (isAnonymous: boolean) => void;
}

export function OrderCustomerField({
  selectedCustomer,
  onSelectCustomer,
  isAnonymousCustomer = false,
  onToggleAnonymous,
}: OrderCustomerFieldProps) {
  const hasSelection = selectedCustomer !== null || isAnonymousCustomer;

  return (
    <div className="space-y-3" data-testid="order-customer-field">
      <Label className="flex items-center gap-2">
        <User className="h-4 w-4" />
        Cliente
      </Label>

      {isAnonymousCustomer ? (
        <Card className="border-0 shadow-md rounded-2xl bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                  <UserPlus className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="font-semibold text-blue-900">Cliente anónimo</p>
                  <p className="text-sm text-blue-600">Pedido para cliente nuevo</p>
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onToggleAnonymous?.(false)}
                className="rounded-xl text-blue-600 hover:text-blue-700 hover:bg-blue-100"
              >
                Cambiar
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : selectedCustomer ? (
        <CustomerSearch
          selectedCustomer={selectedCustomer}
          onSelectCustomer={onSelectCustomer}
        />
      ) : (
        <div className="space-y-3">
          <CustomerSearch
            selectedCustomer={null}
            onSelectCustomer={onSelectCustomer}
          />
          <button
            type="button"
            onClick={() => onToggleAnonymous?.(true)}
            className={cn(
              "w-full rounded-2xl border-2 border-dashed transition-colors flex items-center gap-3 p-4",
              "border-blue-200 bg-blue-50/50 hover:bg-blue-50 hover:border-blue-300"
            )}
          >
            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <UserPlus className="h-5 w-5 text-blue-600" />
            </div>
            <div className="text-left">
              <p className="font-medium text-blue-900">Pedido para cliente nuevo</p>
              <p className="text-sm text-blue-600">Sin registrar (recibirá link para completar datos)</p>
            </div>
          </button>
        </div>
      )}
    </div>
  );
}
