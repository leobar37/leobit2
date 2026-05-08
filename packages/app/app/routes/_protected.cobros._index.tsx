import { Link, useNavigate } from "react-router";
import { Search, Wallet, User, AlertCircle, ChevronRight, Phone, CalendarDays, SlidersHorizontal } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { useAccountsReceivable, useTotalAccountsReceivable } from "~/hooks/use-accounts-receivable";
import { useSetLayout } from "~/components/layout/app-layout";
import { useBusinessMode } from "~/hooks/use-business-mode";
import { useCocheraDebts } from "~/hooks/use-cochera-debts";
import { cn, formatCurrency } from "~/lib/utils";
import { formatDate } from "~/lib/formatting";
import { getDebtLevel } from "~/lib/debt";
import type { AccountsReceivableItem } from "~/hooks/use-accounts-receivable";

type DebtFilter = "all" | "high" | "medium" | "low";
type SortBy = "amount-desc" | "amount-asc" | "date-desc" | "date-asc";

const filterOptions: { key: DebtFilter; label: string }[] = [
  { key: "all", label: "Todos" },
  { key: "high", label: "Alto" },
  { key: "medium", label: "Medio" },
  { key: "low", label: "Bajo" },
];

function DebtorCard({ account }: { account: AccountsReceivableItem }) {
  const navigate = useNavigate();
  const debtLevel = getDebtLevel(account.totalDebt);

  return (
    <div
      onClick={() => navigate(`/cobros/nuevo?clienteId=${account.customer.id}`)}
      className="cursor-pointer"
      data-testid={`cliente-deuda-row-${account.customer.id}`}
    >
      <Card className="shell-card-flat w-full rounded-2xl border-0 transition-colors">
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-[1.05rem] font-semibold leading-tight text-foreground sm:text-lg">
                {account.customer.name}
              </p>
              <p className="mt-0.5 text-sm text-muted-foreground">
                {account.customer.phone || "Sin teléfono"}
              </p>
            </div>
            <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-muted-foreground ring-1 ring-stone-200/90 dark:ring-white/10">
              <ChevronRight className="h-3.5 w-3.5 flex-shrink-0" />
            </div>
          </div>

          <div className="mt-3 flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="max-w-full whitespace-nowrap text-[clamp(1.5rem,6vw,1.8rem)] font-bold leading-tight tracking-[-0.035em] text-destructive">
                S/ {formatCurrency(account.totalDebt)}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {account.totalSales} {account.totalSales === 1 ? "venta" : "ventas"} a crédito
              </p>
            </div>

            <div className="flex max-w-[44%] flex-wrap justify-end gap-1.5 self-start">
              <Badge
                variant="outline"
                className={cn(
                  "rounded-full px-2.5 py-1 text-[11px] font-semibold leading-none",
                  debtLevel.color
                )}
              >
                {debtLevel.label}
              </Badge>
            </div>
          </div>

          <div className="mt-3 grid gap-2 border-t shell-divider pt-3 text-sm text-muted-foreground sm:grid-cols-2">
            <div className="shell-card-soft flex min-w-0 items-center gap-2 rounded-xl px-2.5 py-1.5">
              <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-orange-500/10 text-orange-600 ring-1 ring-orange-500/15 dark:text-orange-300">
                <Phone className="h-3.5 w-3.5" />
              </div>
              <span className="truncate font-medium text-foreground/75">
                {account.customer.phone || "Sin teléfono"}
              </span>
            </div>

            <div className="shell-card-soft flex min-w-0 items-center gap-2 rounded-xl px-2.5 py-1.5 sm:justify-end">
              <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-blue-500/10 text-blue-600 ring-1 ring-blue-500/15 dark:text-blue-300">
                <CalendarDays className="h-3.5 w-3.5" />
              </div>
              <span className="truncate font-medium text-foreground/75">
                {account.lastSaleDate
                  ? formatDate(account.lastSaleDate)
                  : "Sin ventas"}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function CocheraDebtCard({
  debt,
}: {
  debt: NonNullable<ReturnType<typeof useCocheraDebts>["data"]>["items"][number];
}) {
  return (
    <Link to={`/cobros/nuevo?cocheraSessionId=${debt.id}`} className="block">
      <Card className="shell-card-flat w-full rounded-2xl border-0 transition-colors">
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-lg font-bold tracking-wide">{debt.plate}</p>
                <Badge variant="outline" className="capitalize">{debt.vehicleType}</Badge>
                <Badge className="rounded-full border border-red-200 bg-red-50 text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">
                  Pendiente
                </Badge>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {debt.responsibleName || "Sin responsable"}
                {debt.responsiblePhone ? ` · ${debt.responsiblePhone}` : ""}
              </p>
              {debt.checkoutAt ? (
                <p className="mt-1 text-xs text-muted-foreground">
                  Salida: {formatDate(new Date(debt.checkoutAt))}
                </p>
              ) : null}
            </div>
            <ChevronRight className="mt-1 h-4 w-4 text-muted-foreground" />
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2 text-sm">
            <div className="rounded-xl bg-muted/60 px-3 py-2">
              <p className="text-xs text-muted-foreground">Total</p>
              <p className="font-semibold">S/ {formatCurrency(debt.totalAmount)}</p>
            </div>
            <div className="rounded-xl bg-emerald-500/10 px-3 py-2 text-emerald-700 dark:text-emerald-300">
              <p className="text-xs opacity-80">Cobrado</p>
              <p className="font-semibold">S/ {formatCurrency(debt.amountPaid)}</p>
            </div>
            <div className="rounded-xl bg-red-500/10 px-3 py-2 text-red-700 dark:text-red-300">
              <p className="text-xs opacity-80">Pendiente</p>
              <p className="font-semibold">S/ {formatCurrency(debt.balanceDue)}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function CocheraCobrosPage() {
  useSetLayout({ title: "Cobros", showBackButton: true, backHref: "/dashboard" });

  const [search, setSearch] = useState("");
  const { data, isLoading } = useCocheraDebts({ search });
  const debts = data?.items ?? [];
  const totalDebt = data?.summary.totalDebt ?? "0";

  return (
    <div className="space-y-4">
      <div className="shell-card-soft border-l-4 border-red-500 py-3 pl-4 pr-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Total por cobrar</p>
            <p className="text-3xl font-bold text-foreground">S/ {formatCurrency(totalDebt)}</p>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-100/90 text-red-600 dark:bg-destructive/15 dark:text-destructive-foreground">
            <Wallet className="h-5 w-5" />
          </div>
        </div>
        <p className="text-sm text-muted-foreground mt-2">
          {debts.length} {debts.length === 1 ? "vehículo" : "vehículos"} con deuda
        </p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar placa, responsable o teléfono..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="shell-search-field pl-10 pr-4"
        />
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">
          Cargando deudas...
        </div>
      ) : debts.length === 0 ? (
        <div className="text-center py-12">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100/90 dark:bg-emerald-500/14">
            <AlertCircle className="h-10 w-10 text-emerald-600 dark:text-emerald-300" />
          </div>
          <h3 className="text-lg font-semibold text-emerald-700 dark:text-emerald-300">
            ¡Todas las cocheras al día!
          </h3>
          <p className="mt-1 text-muted-foreground">
            No hay saldos pendientes de vehículos.
          </p>
          <Button variant="outline" className="mt-4 rounded-xl dark:border-white/10 dark:bg-white/6 dark:hover:bg-white/10" asChild>
            <Link to="/cochera">
              Ver vehículos
            </Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {debts.map((debt) => (
            <CocheraDebtCard key={debt.id} debt={debt} />
          ))}
        </div>
      )}
    </div>
  );
}

function PolleriaCobrosPage() {
  useSetLayout({ title: "Cobros", showBackButton: true, backHref: "/dashboard" });

  const [search, setSearch] = useState("");
  const [debtFilter, setDebtFilter] = useState<DebtFilter>("all");
  const [sortBy, setSortBy] = useState<SortBy>("amount-desc");
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(1);
  const pageSize = 100;
  const offset = (page - 1) * pageSize;

  const { data: rawDebtors = [], total: totalDebtors, isLoading } = useAccountsReceivable({
    search: search || undefined,
    minBalance: 0.01,
    limit: pageSize,
    offset,
  });

  const { data: totalDebt = 0 } = useTotalAccountsReceivable({
    search: search || undefined,
    minBalance: 0.01,
  });

  const debtors = useMemo(() => {
    let filtered = [...rawDebtors];

    if (debtFilter !== "all") {
      filtered = filtered.filter((d) => {
        const level = getDebtLevel(d.totalDebt).label.toLowerCase();
        return level === debtFilter;
      });
    }

    filtered.sort((a, b) => {
      switch (sortBy) {
        case "amount-desc":
          return b.totalDebt - a.totalDebt;
        case "amount-asc":
          return a.totalDebt - b.totalDebt;
        case "date-desc":
          return (b.lastSaleDate?.getTime() ?? 0) - (a.lastSaleDate?.getTime() ?? 0);
        case "date-asc":
          return (a.lastSaleDate?.getTime() ?? 0) - (b.lastSaleDate?.getTime() ?? 0);
        default:
          return 0;
      }
    });

    return filtered;
  }, [rawDebtors, debtFilter, sortBy]);

  const visibleDebtTotal = debtors.reduce((sum, account) => sum + account.totalDebt, 0);
  const displayTotalDebt = totalDebt > 0 ? totalDebt : visibleDebtTotal;

  useEffect(() => {
    setPage(1);
  }, [search, debtFilter, sortBy]);

  return (
    <div className="space-y-4">
      {/* Stats Card */}
      <div className="shell-card-soft border-l-4 border-red-500 py-3 pl-4 pr-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Total por cobrar</p>
            <p className="text-3xl font-bold text-foreground">S/ {formatCurrency(displayTotalDebt)}</p>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-100/90 text-red-600 dark:bg-destructive/15 dark:text-destructive-foreground">
            <Wallet className="h-5 w-5" />
          </div>
        </div>
        <p className="text-sm text-muted-foreground mt-2">
          {debtors.length} {debtors.length === 1 ? "cliente" : "clientes"} con deuda
        </p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar cliente..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="shell-search-field pl-10 pr-4"
        />
      </div>

      {/* Filters toggle */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          className="h-8 gap-1.5 text-muted-foreground hover:text-foreground"
          onClick={() => setShowFilters((v) => !v)}
        >
          <SlidersHorizontal className="h-4 w-4" />
          Filtros
          {debtFilter !== "all" && (
            <span className="ml-1 flex h-4 w-4 items-center justify-center rounded-full bg-orange-500 text-[10px] font-bold text-white">
              1
            </span>
          )}
        </Button>
        {debtFilter !== "all" && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-muted-foreground hover:text-foreground"
            onClick={() => setDebtFilter("all")}
          >
            Limpiar
          </Button>
        )}
      </div>

      {/* Filter panel */}
      {showFilters && (
        <div className="space-y-3 rounded-2xl shell-card-soft p-3">
          <div>
            <p className="mb-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Nivel de deuda
            </p>
            <div className="flex flex-wrap gap-2">
              {filterOptions.map((opt) => (
                <Button
                  key={opt.key}
                  variant={debtFilter === opt.key ? "default" : "outline"}
                  size="sm"
                  className={cn(
                    "h-8 rounded-full text-xs",
                    debtFilter === opt.key
                      ? "bg-orange-500 hover:bg-orange-600 text-white"
                      : "dark:border-white/10 dark:bg-white/6 dark:hover:bg-white/10"
                  )}
                  onClick={() => setDebtFilter(opt.key)}
                >
                  {opt.label}
                </Button>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Ordenar por
            </p>
            <div className="flex flex-wrap gap-2">
              {[
                { key: "amount-desc" as SortBy, label: "Mayor deuda" },
                { key: "amount-asc" as SortBy, label: "Menor deuda" },
                { key: "date-desc" as SortBy, label: "Más reciente" },
                { key: "date-asc" as SortBy, label: "Más antiguo" },
              ].map((opt) => (
                <Button
                  key={opt.key}
                  variant={sortBy === opt.key ? "default" : "outline"}
                  size="sm"
                  className={cn(
                    "h-8 rounded-full text-xs",
                    sortBy === opt.key
                      ? "bg-orange-500 hover:bg-orange-600 text-white"
                      : "dark:border-white/10 dark:bg-white/6 dark:hover:bg-white/10"
                  )}
                  onClick={() => setSortBy(opt.key)}
                >
                  {opt.label}
                </Button>
              ))}
            </div>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">
          Cargando deudores...
        </div>
      ) : debtors.length === 0 ? (
        <div className="text-center py-12">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100/90 dark:bg-emerald-500/14">
            <AlertCircle className="h-10 w-10 text-emerald-600 dark:text-emerald-300" />
          </div>
          <h3 className="text-lg font-semibold text-emerald-700 dark:text-emerald-300">
            ¡Todas las cuentas al día!
          </h3>
          <p className="mt-1 text-muted-foreground">
            No hay deudas pendientes
          </p>
          <Button variant="outline" className="mt-4 rounded-xl dark:border-white/10 dark:bg-white/6 dark:hover:bg-white/10" asChild>
            <Link to="/ventas">
              Ir a ventas
            </Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {debtors.map((account) => (
            <DebtorCard key={account.customer.id} account={account} />
          ))}

          {totalDebtors > pageSize && (
            <PaginationControls
              page={page}
              pageSize={pageSize}
              totalItems={totalDebtors}
              onPageChange={setPage}
            />
          )}
        </div>
      )}
    </div>
  );
}

export default function CobrosPage() {
  const { is } = useBusinessMode();

  if (is.cochera) {
    return <CocheraCobrosPage />;
  }

  return <PolleriaCobrosPage />;
}
