import { DollarSign } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency } from "~/lib/formatting";
import type { AccountsReceivableItem } from "~/hooks/use-accounts-receivable";

interface SummaryCardProps {
  totalDebt?: number;
  accounts?: AccountsReceivableItem[];
}

export function SummaryCard({ totalDebt, accounts }: SummaryCardProps) {
  if (totalDebt === undefined) return null;

  return (
    <Card className="border-0 shadow-md rounded-2xl bg-gradient-to-br from-orange-500 to-orange-600 text-white">
      <CardContent className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
            <DollarSign className="h-6 w-6" />
          </div>
          <div>
            <p className="text-orange-100 text-sm">Total por Cobrar</p>
            <p className="text-3xl font-bold">{formatCurrency(totalDebt)}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white/10 rounded-xl p-3">
            <p className="text-orange-100 text-xs">Clientes con Deuda</p>
            <p className="text-xl font-semibold">{accounts?.length || 0}</p>
          </div>
          <div className="bg-white/10 rounded-xl p-3">
            <p className="text-orange-100 text-xs">Promedio por Cliente</p>
            <p className="text-xl font-semibold">
              {accounts?.length > 0
                ? formatCurrency(totalDebt / accounts.length)
                : "S/ 0.00"}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
