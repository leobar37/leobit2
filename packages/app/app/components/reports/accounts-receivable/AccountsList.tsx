import { AlertCircle, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AccountItem } from "./AccountItem";
import type { AccountsReceivableItem } from "~/hooks/use-accounts-receivable";

interface AccountsListProps {
  accounts?: AccountsReceivableItem[];
  isLoading: boolean;
}

export function AccountsList({ accounts, isLoading }: AccountsListProps) {
  return (
    <Card className="border-0 shadow-md rounded-2xl">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Users className="h-5 w-5 text-orange-500" />
          Clientes con Deuda
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Cargando...</div>
        ) : accounts?.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="h-8 w-8 text-green-600" />
            </div>
            <p className="text-lg font-medium">¡Excelente!</p>
            <p className="text-muted-foreground">No hay deudas pendientes</p>
          </div>
        ) : (
          <div className="space-y-3">
            {accounts?.map((account) => (
              <AccountItem key={account.customer.id} account={account} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
