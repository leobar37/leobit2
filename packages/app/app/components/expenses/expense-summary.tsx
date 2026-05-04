/**
 * Expense Summary Component
 * Shows expense info in lists and detail views
 */

import { Receipt, Calendar, Wallet, Paperclip } from "lucide-react";
import { cn, formatCurrency } from "~/lib/utils";
import { formatDisplayDate } from "~/lib/date-utils";
import type { Expense, ExpenseCategorySummary } from "~/hooks/use-expenses";

const methodLabels: Record<string, string> = {
  efectivo: "Efectivo",
  yape: "Yape",
  plin: "Plin",
  transferencia: "Transferencia",
  tarjeta: "Tarjeta",
  saldo: "Saldo",
};

const colorMap: Record<string, { bg: string; text: string }> = {
  orange: { bg: "bg-orange-100", text: "text-orange-700" },
  blue: { bg: "bg-blue-100", text: "text-blue-700" },
  green: { bg: "bg-green-100", text: "text-green-700" },
  red: { bg: "bg-red-100", text: "text-red-700" },
  purple: { bg: "bg-purple-100", text: "text-purple-700" },
  amber: { bg: "bg-amber-100", text: "text-amber-700" },
  teal: { bg: "bg-teal-100", text: "text-teal-700" },
  gray: { bg: "bg-gray-100", text: "text-gray-700" },
};

interface ExpenseSummaryProps {
  expense: Expense;
  onClick?: () => void;
  showDate?: boolean;
}

export function ExpenseSummary({ expense, onClick, showDate = true }: ExpenseSummaryProps) {
  const category = expense.category;
  const colors = colorMap[category?.color ?? "orange"] ?? colorMap.orange;
  const hasReceipt = !!expense.receiptImageId;

  return (
    <div
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 p-4 rounded-2xl border transition-all",
        onClick && "cursor-pointer hover:shadow-md active:scale-[0.99]",
        "bg-card border-border"
      )}
    >
      {/* Icon */}
      <div className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-xl", colors.bg)}>
        <Receipt className={cn("h-5 w-5", colors.text)} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-semibold text-sm truncate">
            {category?.name ?? "Gasto"}
          </p>
          {hasReceipt && (
            <Paperclip className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          )}
        </div>
        {expense.description && (
          <p className="text-xs text-muted-foreground truncate">
            {expense.description}
          </p>
        )}
        {showDate && (
          <div className="flex items-center gap-1 mt-0.5">
            <Calendar className="h-3 w-3 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">
              {formatDisplayDate(expense.expenseDate)}
            </span>
            <span className="text-xs text-muted-foreground mx-1">·</span>
            <Wallet className="h-3 w-3 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">
              {methodLabels[expense.paymentMethod] ?? expense.paymentMethod}
            </span>
          </div>
        )}
      </div>

      {/* Amount */}
      <div className="text-right shrink-0">
        <p className="font-bold text-sm text-foreground">
          S/ {formatCurrency(expense.amount)}
        </p>
      </div>
    </div>
  );
}
