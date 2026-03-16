import { Link, useNavigate } from "react-router";
import { Search, Wallet, User, AlertCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAccountsReceivable } from "~/hooks/use-accounts-receivable";
import { useSetLayout } from "~/components/layout/app-layout";
import { formatCurrency } from "~/lib/utils";
import { formatDate } from "~/lib/formatting";
import { getDebtLevel } from "~/lib/debt";
import { useListSearch } from "~/hooks/use-list-search";
import type { AccountsReceivableItem } from "~/hooks/use-accounts-receivable";

function DebtorCard({ account }: { account: AccountsReceivableItem }) {
  const navigate = useNavigate();
  const debtLevel = getDebtLevel(account.totalDebt);

  return (
    <Card
      className="shell-card-flat w-full rounded-[24px] transition-colors hover:border-stone-300/90 cursor-pointer"
      data-testid={`cliente-deuda-row-${account.customer.id}`}
      onClick={() => navigate(`/cobros/nuevo?clienteId=${account.customer.id}`)}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-[18px] bg-red-100/90 ring-1 ring-red-100">
            <User className="h-6 w-6 text-red-600" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="truncate text-[1.05rem] font-semibold leading-tight text-foreground">
                  {account.customer.name}
                </h3>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {account.customer.phone || "Sin teléfono"}
                </p>
              </div>

              <div className="text-right">
                <p className="text-lg font-bold text-red-600">
                  S/ {formatCurrency(account.totalDebt)}
                </p>
              </div>
            </div>

            <div className="mt-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge
                  variant="outline"
                  className={`rounded-full border-0 px-2.5 py-1 text-[11px] font-semibold leading-none ${debtLevel.color}`}
                >
                  {debtLevel.label}
                </Badge>
                {account.lastSaleDate && (
                  <span className="text-xs text-muted-foreground">
                    Última: {formatDate(account.lastSaleDate)}
                  </span>
                )}
              </div>

              <Button
                size="sm"
                className="h-8 bg-orange-500 hover:bg-orange-600 text-white"
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
        </div>
      </CardContent>
    </Card>
  );
}

export default function CobrosPage() {
  useSetLayout({ title: "Cobros", showBackButton: true, backHref: "/dashboard" });

  const { data: accounts, isLoading } = useAccountsReceivable({
    minBalance: 0.01,
  });

  const debtors = accounts?.filter((account) => account.totalDebt > 0) || [];

  const { filteredItems: filteredDebtors, search, setSearch } = useListSearch({
    items: debtors,
    searchFields: [
      (account) => account.customer.name,
      (account) => account.customer.phone ?? undefined,
    ],
  });

  const totalDebt = debtors.reduce((sum, d) => sum + d.totalDebt, 0);
  const filteredTotalDebt = filteredDebtors.reduce((sum, d) => sum + d.totalDebt, 0);

  return (
    <div className="space-y-4">
      {/* Stats Card - Uses shell-card-flat with red accent */}
      <Card className="shell-card-flat rounded-[24px] border-l-4 border-l-red-500">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total por cobrar</p>
              <p className="text-3xl font-bold text-foreground">
                S/ {formatCurrency(search ? filteredTotalDebt : totalDebt)}
              </p>
            </div>
            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
              <Wallet className="h-5 w-5 text-red-600" />
            </div>
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            {search ? filteredDebtors.length : debtors.length}{" "}
            {debtors.length === 1 ? "cliente" : "clientes"} con deuda
          </p>
        </CardContent>
      </Card>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar cliente..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-12 rounded-[20px] border-stone-200/80 bg-white/75 pl-11 pr-4 shadow-[0_1px_6px_rgba(15,23,42,0.02)] placeholder:text-muted-foreground/80 focus-visible:ring-1 focus-visible:ring-orange-200"
        />
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">
          Cargando deudores...
        </div>
      ) : filteredDebtors.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="h-10 w-10 text-green-600" />
          </div>
          <h3 className="text-lg font-semibold text-green-700">
            ¡Todas las cuentas al día!
          </h3>
          <p className="text-muted-foreground mt-1">
            {search ? "No se encontraron clientes" : "No hay deudas pendientes"}
          </p>
          <Button variant="outline" className="mt-4 rounded-xl" asChild>
            <Link to="/ventas">
              Ir a ventas
            </Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredDebtors.map((account) => (
            <DebtorCard key={account.customer.id} account={account} />
          ))}
        </div>
      )}
    </div>
  );
}
