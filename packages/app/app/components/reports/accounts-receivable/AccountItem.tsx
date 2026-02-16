import { memo } from "react";
import { Link } from "react-router";
import { Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate } from "~/lib/formatting";
import { getDebtLevel } from "~/lib/debt";
import type { AccountsReceivableItem } from "~/hooks/use-accounts-receivable";

interface AccountItemProps {
  account: AccountsReceivableItem;
}

export const AccountItem = memo(function AccountItem({ account }: AccountItemProps) {
  const debtLevel = getDebtLevel(account.totalDebt);

  return (
    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <p className="font-medium truncate">{account.customer.name}</p>
          <span className={`text-[10px] px-1.5 py-0.5 rounded ${debtLevel.color}`}>
            {debtLevel.label}
          </span>
        </div>
        <p className="text-sm text-muted-foreground">
          {account.customer.phone || "Sin teléfono"}
        </p>
        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
          <span>Total ventas: {formatCurrency(account.totalSales)}</span>
          <span>•</span>
          <span>Abonos: {formatCurrency(account.totalPayments)}</span>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Última compra: {formatDate(account.lastSaleDate)}
        </p>
      </div>

      <div className="text-right ml-4">
        <p className="text-lg font-bold text-red-600">
          {formatCurrency(account.totalDebt)}
        </p>
        <Link to={`/clientes/${account.customer.id}`}>
          <Button variant="ghost" size="sm" className="h-8 px-2">
            <Eye className="h-4 w-4 mr-1" />
            Ver
          </Button>
        </Link>
      </div>
    </div>
  );
});
