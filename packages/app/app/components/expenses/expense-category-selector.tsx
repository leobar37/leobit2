/**
 * Expense Category Selector
 * Shows active categories with icons and colors
 */

import { useState } from "react";
import { Receipt, Truck, Package, Snowflake, FileCheck, Utensils, Phone, MoreHorizontal, Search } from "lucide-react";
import { cn } from "~/lib/utils";
import { Input } from "@/components/ui/input";
import type { ExpenseCategory } from "~/hooks/use-expense-categories";

const iconMap: Record<string, React.ReactNode> = {
  truck: <Truck className="h-5 w-5" />,
  package: <Package className="h-5 w-5" />,
  "package-box": <Package className="h-5 w-5" />,
  snowflake: <Snowflake className="h-5 w-5" />,
  "file-check": <FileCheck className="h-5 w-5" />,
  utensils: <Utensils className="h-5 w-5" />,
  phone: <Phone className="h-5 w-5" />,
  "more-horizontal": <MoreHorizontal className="h-5 w-5" />,
  receipt: <Receipt className="h-5 w-5" />,
};

const colorMap: Record<string, { bg: string; text: string; border: string; selectedBg: string }> = {
  orange: { bg: "bg-orange-100", text: "text-orange-700", border: "border-orange-200", selectedBg: "bg-orange-500" },
  blue: { bg: "bg-blue-100", text: "text-blue-700", border: "border-blue-200", selectedBg: "bg-blue-500" },
  green: { bg: "bg-green-100", text: "text-green-700", border: "border-green-200", selectedBg: "bg-green-500" },
  red: { bg: "bg-red-100", text: "text-red-700", border: "border-red-200", selectedBg: "bg-red-500" },
  purple: { bg: "bg-purple-100", text: "text-purple-700", border: "border-purple-200", selectedBg: "bg-purple-500" },
  amber: { bg: "bg-amber-100", text: "text-amber-700", border: "border-amber-200", selectedBg: "bg-amber-500" },
  teal: { bg: "bg-teal-100", text: "text-teal-700", border: "border-teal-200", selectedBg: "bg-teal-500" },
  gray: { bg: "bg-gray-100", text: "text-gray-700", border: "border-gray-200", selectedBg: "bg-gray-500" },
};

interface ExpenseCategorySelectorProps {
  categories: ExpenseCategory[];
  selectedId: string | null;
  onSelect: (categoryId: string) => void;
  disabled?: boolean;
}

export function ExpenseCategorySelector({
  categories,
  selectedId,
  onSelect,
  disabled,
}: ExpenseCategorySelectorProps) {
  const [search, setSearch] = useState("");

  const filtered = categories.filter((cat) =>
    cat.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-3">
      {categories.length > 6 && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar categoría..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="shell-search-field pl-9"
          />
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        {filtered.map((category) => {
          const isSelected = selectedId === category.id;
          const colors = colorMap[category.color] ?? colorMap.orange;
          const icon = iconMap[category.icon] ?? iconMap.receipt;

          return (
            <button
              key={category.id}
              type="button"
              disabled={disabled}
              onClick={() => onSelect(category.id)}
              className={cn(
                "flex flex-col items-center gap-2 rounded-2xl border-2 py-3 px-2 transition-all",
                isSelected
                  ? cn(colors.selectedBg, "border-transparent text-white")
                  : cn("bg-card", colors.border, "text-foreground hover:bg-accent"),
                disabled && "opacity-50 cursor-not-allowed"
              )}
            >
              <div
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-xl",
                  isSelected ? "bg-white/20" : colors.bg
                )}
              >
                <span className={isSelected ? "text-white" : colors.text}>
                  {icon}
                </span>
              </div>
              <span className="text-xs font-medium text-center leading-tight">
                {category.name}
              </span>
            </button>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <p className="text-center text-sm text-muted-foreground py-4">
          No se encontraron categorías
        </p>
      )}
    </div>
  );
}
