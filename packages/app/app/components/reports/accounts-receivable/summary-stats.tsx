import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, Users, DollarSign } from "lucide-react";
import type { AccountsReceivableItem } from "~/hooks/use-accounts-receivable";
import { formatCurrency } from "~/lib/utils";

interface SummaryStatsProps {
  accounts: AccountsReceivableItem[] | undefined;
}

export function SummaryStats({ accounts }: SummaryStatsProps) {
  const totalAccounts = accounts?.length ?? 0;
  const totalDebt = accounts?.reduce((sum, acc) => sum + acc.totalDebt, 0) ?? 0;
  const totalSales = accounts?.reduce((sum, acc) => sum + acc.totalSales, 0) ?? 0;
  const totalPayments = accounts?.reduce((sum, acc) => sum + acc.totalPayments, 0) ?? 0;

  return (
    <div className="grid grid-cols-3 gap-3">
      <Card className="border-0 shadow-sm rounded-xl">
        <CardContent className="p-3 text-center">
          <Users className="h-5 w-5 mx-auto text-orange-500 mb-1" />
          <p className="text-lg font-bold">{totalAccounts}</p>
          <p className="text-xs text-gray-500">Clientes</p>
        </CardContent>
      </Card>
      <Card className="border-0 shadow-sm rounded-xl">
        <CardContent className="p-3 text-center">
          <TrendingUp className="h-5 w-5 mx-auto text-green-500 mb-1" />
          <p className="text-lg font-bold">{formatCurrency(totalSales)}</p>
          <p className="text-xs text-gray-500">Ventas</p>
        </CardContent>
      </Card>
      <Card className="border-0 shadow-sm rounded-xl">
        <CardContent className="p-3 text-center">
          <DollarSign className="h-5 w-5 mx-auto text-blue-500 mb-1" />
          <p className="text-lg font-bold">{formatCurrency(totalPayments)}</p>
          <p className="text-xs text-gray-500">Cobros</p>
        </CardContent>
      </Card>
    </div>
  );
}
