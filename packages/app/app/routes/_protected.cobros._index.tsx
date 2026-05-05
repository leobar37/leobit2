import { Link, useNavigate } from "react-router";
import { Search, Wallet, User, AlertCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { useAccountsReceivable, useTotalAccountsReceivable } from "~/hooks/use-accounts-receivable";
import { usePayments } from "~/hooks/use-payments";
import { useSetLayout } from "~/components/layout/app-layout";
import { formatCurrency } from "~/lib/utils";
import { formatDate } from "~/lib/formatting";
import { getDebtLevel } from "~/lib/debt";
import type { AccountsReceivableItem } from "~/hooks/use-accounts-receivable";
import {
  MinimalCard,
  MinimalCardContent,
  MinimalCardMedia,
} from "~/components/cards";

function DebtorCard({ account }: { account: AccountsReceivableItem }) {
  const navigate = useNavigate();
  const debtLevel = getDebtLevel(account.totalDebt);

  return (
    <MinimalCard 
      variant="outlined" 
      interactive 
      clickable 
      radius="md"
      data-testid={`cliente-deuda-row-${account.customer.id}`}
      onClick={() => navigate(`/cobros/nuevo?clienteId=${account.customer.id}`)}
    >
      <MinimalCardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <MinimalCardMedia 
                icon={User} 
                iconColor="text-destructive" 
                size="sm" 
              />
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold truncate">{account.customer.name}</h3>
                <p className="text-sm text-muted-foreground">
                  {account.customer.phone || "Sin teléfono"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 mt-2">
              <Badge variant="outline" className={`px-2 py-0.5 text-[11px] ${debtLevel.color}`}>
                {debtLevel.label}
              </Badge>
              {account.lastSaleDate && (
                <span className="text-xs text-muted-foreground">
                  Última: {formatDate(account.lastSaleDate)}
                </span>
              )}
            </div>
          </div>

            <div className="text-right ml-3">
            <p className="text-xl font-bold text-destructive">
              S/ {formatCurrency(account.totalDebt)}
            </p>
            <Button
              size="sm"
              className="mt-2 h-8 bg-orange-500 hover:bg-orange-600 text-white"
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/cobros/nuevo?clienteId=${account.customer.id}`);
              }}
            >
              <Wallet className="h-4 w-4 mr-1" />
              Cobrar
            </Button>
          </div>
        </div>
      </MinimalCardContent>
    </MinimalCard>
  );
}

export default function CobrosPage() {
  useSetLayout({ title: "Cobros", showBackButton: true, backHref: "/dashboard" });

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 100;
  const offset = (page - 1) * pageSize;

  const { data: debtors = [], total: totalDebtors, isLoading } = useAccountsReceivable({
    search: search || undefined,
    minBalance: 0.01,
    limit: pageSize,
    offset,
  });

  const { data: totalDebt = 0 } = useTotalAccountsReceivable({
    search: search || undefined,
    minBalance: 0.01,
  });
  const visibleDebtTotal = debtors.reduce((sum, account) => sum + account.totalDebt, 0);
  const displayTotalDebt = totalDebt > 0 ? totalDebt : visibleDebtTotal;
  const { data: payments = [] } = usePayments();
  const pendingPayments = 0;
  const errorPayments = 0;

  useEffect(() => {
    setPage(1);
  }, [search]);

  return (
    <div className="space-y-4">
      {/* Stats Card - Border lateral rojo */}
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

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar cliente..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="shell-search-field pl-10 pr-4"
        />
      </div>

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
