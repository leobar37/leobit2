import { useState, useMemo } from "react";
import { useNavigate } from "react-router";
import { Receipt, Search, Plus, X, Calendar } from "lucide-react";
import { cn, formatCurrency } from "~/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useExpenses } from "~/hooks/use-expenses";
import { useActiveExpenseCategories } from "~/hooks/use-expense-categories";
import { ExpenseSummary } from "@/components/expenses/expense-summary";
import { useSetLayout } from "~/components/layout/app-layout";
import { MobileShell } from "~/components/mobile";
import { getToday, subDays, formatDisplayDate, isSameDay, parseDateString } from "~/lib/date-utils";

export default function GastosPage() {
  useSetLayout({ title: "Gastos" });
  const navigate = useNavigate();

  const [search, setSearch] = useState("");
  const [dateFilter, setDateFilter] = useState<"today" | "week" | "month" | "all">("today");
  const [categoryFilter, setCategoryFilter] = useState<string>("");

  const { data: expenses = [], isLoading } = useExpenses();
  const { data: categories = [] } = useActiveExpenseCategories();

  const filteredExpenses = useMemo(() => {
    let result = [...expenses];

    // Date filter
    if (dateFilter !== "all") {
      const today = parseDateString(getToday());
      result = result.filter((e) => {
        const expenseDate = parseDateString(e.expenseDate);
        if (dateFilter === "today") {
          return isSameDay(expenseDate, today);
        }
        if (dateFilter === "week") {
          const weekAgo = subDays(today, 7);
          return expenseDate >= weekAgo;
        }
        if (dateFilter === "month") {
          const monthAgo = subDays(today, 30);
          return expenseDate >= monthAgo;
        }
        return true;
      });
    }

    // Category filter
    if (categoryFilter) {
      result = result.filter((e) => e.categoryId === categoryFilter);
    }

    // Search
    if (search.trim()) {
      const term = search.trim().toLowerCase();
      result = result.filter((e) => {
        const inCategory = e.category?.name?.toLowerCase().includes(term) ?? false;
        const inDescription = e.description?.toLowerCase().includes(term) ?? false;
        const inAmount = e.amount.toString().includes(term);
        return inCategory || inDescription || inAmount;
      });
    }

    // Sort by date desc
    result.sort((a, b) => new Date(b.expenseDate).getTime() - new Date(a.expenseDate).getTime());

    return result;
  }, [expenses, dateFilter, categoryFilter, search]);

  const totalAmount = useMemo(() => {
    return filteredExpenses.reduce((sum, e) => sum + parseFloat(e.amount || "0"), 0);
  }, [filteredExpenses]);

  const dateFilterLabel = {
    today: "Hoy",
    week: "Esta semana",
    month: "Este mes",
    all: "Todos",
  };

  return (
    <>
      <div className="space-y-4">
        {/* Summary */}
        <div className="shell-card-flat p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {dateFilterLabel[dateFilter]}
            </p>
            <p className="text-2xl font-bold mt-1">S/ {formatCurrency(totalAmount)}</p>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-orange-100">
            <Receipt className="h-6 w-6 text-orange-600" />
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar gasto..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="shell-search-field pl-11 pr-4"
          />
        </div>

        {/* Date Filters */}
        <div className="-mx-3 overflow-x-auto px-3 pb-1 hide-scrollbar sm:-mx-4 sm:px-4">
          <div className="flex min-w-max gap-2">
            {(["today", "week", "month", "all"] as const).map((filter) => (
              <button
                key={filter}
                onClick={() => setDateFilter(filter)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ring-1 ring-transparent",
                  dateFilter === filter
                    ? "bg-orange-100 text-orange-700 dark:bg-orange-500/[0.15] dark:text-orange-300 dark:ring-orange-400/[0.20]"
                    : "bg-stone-100 text-stone-600 hover:bg-stone-200 dark:bg-white/[0.08] dark:text-muted-foreground dark:hover:bg-white/[0.12] dark:hover:text-foreground dark:ring-white/[0.06]"
                )}
              >
                <Calendar className="h-3.5 w-3.5" />
                {dateFilterLabel[filter]}
              </button>
            ))}
          </div>
        </div>

        {/* Category Filters */}
        {categories.length > 0 && (
          <div className="-mx-3 overflow-x-auto px-3 pb-1 hide-scrollbar sm:-mx-4 sm:px-4">
            <div className="flex min-w-max gap-2">
              <button
                onClick={() => setCategoryFilter("")}
                className={cn(
                  "px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ring-1 ring-transparent",
                  !categoryFilter
                    ? "bg-orange-100 text-orange-700 dark:bg-orange-500/[0.15] dark:text-orange-300 dark:ring-orange-400/[0.20]"
                    : "bg-stone-100 text-stone-600 hover:bg-stone-200 dark:bg-white/[0.08] dark:text-muted-foreground dark:hover:bg-white/[0.12] dark:hover:text-foreground dark:ring-white/[0.06]"
                )}
              >
                Todas
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setCategoryFilter(cat.id === categoryFilter ? "" : cat.id)}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ring-1 ring-transparent",
                    categoryFilter === cat.id
                      ? "bg-orange-100 text-orange-700 dark:bg-orange-500/[0.15] dark:text-orange-300 dark:ring-orange-400/[0.20]"
                      : "bg-stone-100 text-stone-600 hover:bg-stone-200 dark:bg-white/[0.08] dark:text-muted-foreground dark:hover:bg-white/[0.12] dark:hover:text-foreground dark:ring-white/[0.06]"
                  )}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Active filters indicator */}
        {(categoryFilter || search) && (
          <div className="flex gap-2">
            {categoryFilter && (
              <button
                type="button"
                onClick={() => setCategoryFilter("")}
                className="flex shrink-0 items-center gap-1 rounded-full bg-orange-50 px-2.5 py-1 text-xs font-medium text-orange-700 ring-1 ring-orange-200/60 dark:bg-orange-500/10 dark:text-orange-300 dark:ring-orange-500/20"
              >
                {categories.find((c) => c.id === categoryFilter)?.name}
                <X className="h-3 w-3" />
              </button>
            )}
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="flex shrink-0 items-center gap-1 rounded-full bg-orange-50 px-2.5 py-1 text-xs font-medium text-orange-700 ring-1 ring-orange-200/60 dark:bg-orange-500/10 dark:text-orange-300 dark:ring-orange-500/20"
              >
                "{search}"
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        )}

        {/* Loading */}
        {isLoading && (
          <div className="text-center py-8">
            <Receipt className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Cargando gastos...</p>
          </div>
        )}

        {/* Empty */}
        {!isLoading && filteredExpenses.length === 0 && (
          <div className="text-center py-8">
            <Receipt className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              {search || categoryFilter || dateFilter !== "all"
                ? "No se encontraron gastos"
                : "No hay gastos registrados"}
            </p>
          </div>
        )}

        {/* List */}
        <div className="space-y-3">
          {filteredExpenses.map((expense) => (
            <ExpenseSummary
              key={expense.id}
              expense={expense}
              onClick={() => navigate(`/gastos/${expense.id}`)}
            />
          ))}
        </div>
      </div>

      <MobileShell.FloatingAction>
        <Button
          size="icon"
          aria-label="Nuevo gasto"
          className="h-14 w-14 rounded-full bg-orange-500 text-white shadow-[0_10px_24px_rgba(249,115,22,0.22)] hover:bg-orange-600"
          onClick={() => navigate("/gastos/nuevo")}
        >
          <Plus className="h-6 w-6" />
        </Button>
      </MobileShell.FloatingAction>
    </>
  );
}
