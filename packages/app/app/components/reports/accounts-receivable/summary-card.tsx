import type { AccountsReceivableItem } from "~/hooks/use-accounts-receivable";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "~/lib/utils";
import { Users, DollarSign, TrendingUp } from "lucide-react";

interface SummaryCardProps {
  totalDebt: number | undefined;
  accounts: AccountsReceivableItem[] | undefined;
}

export function SummaryCard({ totalDebt, accounts }: SummaryCardProps) {
  const totalAccounts = accounts?.length ?? 0;
  const avgDebt = totalAccounts > 0 ? (totalDebt ?? 0) / totalAccounts : 0;

  return (
    <Card className="border-0 shadow-lg rounded-2xl bg-gradient-to-br from-orange-500 to-orange-600 text-white">
      <CardContent className="p-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-orange-100 text-sm">Total por Cobrar</p>
            <p className="text-2xl font-bold">{formatCurrency(totalDebt ?? 0)}</p>
          </div>
          <div>
            <p className="text-orange-100 text-sm">Clientes Deudores</p>
            <p className="text-2xl font-bold">{totalAccounts}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
