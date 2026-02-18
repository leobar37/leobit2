import { Link, useNavigate } from "react-router";
import { Search, Wallet, ArrowLeft, User, AlertCircle } from "lucide-react";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAccountsReceivable } from "~/hooks/use-accounts-receivable";
import { useSetLayout } from "~/components/layout/app-layout";
import { formatCurrency, formatDate } from "~/lib/formatting";
import { getDebtLevel } from "~/lib/debt";
import type { AccountsReceivableItem } from "~/hooks/use-accounts-receivable";

function DebtorCard({ account }: { account: AccountsReceivableItem }) {
  const navigate = useNavigate();
  const debtLevel = getDebtLevel(account.totalDebt);

  return (
    <Card
      className="border-0 shadow-md rounded-2xl cursor-pointer hover:shadow-lg transition-shadow active:scale-[0.98]"
      onClick={() => navigate(`/cobros/nuevo?clienteId=${account.customer.id}`)}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <User className="h-5 w-5 text-red-600" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold truncate">{account.customer.name}</h3>
                <p className="text-sm text-muted-foreground">
                  {account.customer.phone || "Sin teléfono"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 mt-2">
              <span className={`text-xs px-2 py-0.5 rounded-full ${debtLevel.color}`}>
                {debtLevel.label}
              </span>
              {account.lastSaleDate && (
                <span className="text-xs text-muted-foreground">
                  Última: {formatDate(account.lastSaleDate)}
                </span>
              )}
            </div>
          </div>

          <div className="text-right ml-3">
            <p className="text-xl font-bold text-red-600">
              {formatCurrency(account.totalDebt)}
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
      </CardContent>
    </Card>
  );
}

export default function CobrosPage() {
  useSetLayout({ title: "Cobros", showBackButton: true, backHref: "/dashboard" });

  const [search, setSearch] = useState("");
  const { data: accounts, isLoading } = useAccountsReceivable({
    search: search || undefined,
    minBalance: 0.01,
  });

  const debtors = accounts?.filter((account) => account.totalDebt > 0) || [];

  const totalDebt = debtors.reduce((sum, d) => sum + d.totalDebt, 0);

  return (
    <div className="space-y-4">
      <Card className="border-0 shadow-md rounded-2xl bg-gradient-to-br from-red-500 to-red-600 text-white">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm opacity-90">Total por cobrar</p>
              <p className="text-3xl font-bold">{formatCurrency(totalDebt)}</p>
            </div>
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <Wallet className="h-6 w-6" />
            </div>
          </div>
          <p className="text-sm mt-2 opacity-90">
            {debtors.length} {debtors.length === 1 ? "cliente" : "clientes"} con deuda
          </p>
        </CardContent>
      </Card>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar cliente..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10 rounded-xl"
        />
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">
          Cargando deudores...
        </div>
      ) : debtors.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="h-10 w-10 text-green-600" />
          </div>
          <h3 className="text-lg font-semibold text-green-700">
            ¡Todas las cuentas al día!
          </h3>
          <p className="text-muted-foreground mt-1">
            No hay deudas pendientes
          </p>
          <Button variant="outline" className="mt-4 rounded-xl" asChild>
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
        </div>
      )}
    </div>
  );
}
