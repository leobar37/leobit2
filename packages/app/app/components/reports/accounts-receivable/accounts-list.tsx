import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, MessageCircle, User } from "lucide-react";
import type { AccountsReceivableItem } from "~/hooks/use-accounts-receivable";
import { formatCurrency } from "~/lib/utils";

interface AccountsListProps {
  accounts: AccountsReceivableItem[] | undefined;
  isLoading: boolean;
  onSendReminder: (account: AccountsReceivableItem) => void;
}

export function AccountsList({ accounts, isLoading, onSendReminder }: AccountsListProps) {
  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
      </div>
    );
  }

  if (!accounts?.length) {
    return (
      <Card className="border-0 shadow-md rounded-2xl">
        <CardContent className="p-8 text-center">
          <p className="text-gray-500">No hay cuentas por cobrar</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {accounts.map((account) => (
        <Card key={account.customer.id} className="border-0 shadow-md rounded-2xl">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                  <User className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <p className="font-semibold">{account.customer.name}</p>
                  <p className="text-sm text-gray-500">
                    {account.customer.phone || "Sin teléfono"}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-bold text-lg text-red-600">
                  {formatCurrency(account.totalDebt)}
                </p>
              </div>
            </div>
            <div className="mt-3 flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onSendReminder(account)}
                className="text-orange-600 border-orange-200 hover:bg-orange-50"
              >
                <MessageCircle className="h-4 w-4 mr-2" />
                Recordar
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
