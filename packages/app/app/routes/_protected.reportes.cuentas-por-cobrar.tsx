import { Link } from "react-router";
import { ArrowLeft } from "lucide-react";
import { useAtomValue } from "jotai";
import { useAccountsReceivable, useTotalAccountsReceivable } from "~/hooks/use-accounts-receivable";
import { filtersAtom } from "~/atoms/accounts-receivable";
import {
  SummaryCard,
  FilterCard,
  AccountsList,
  SummaryStats,
} from "~/components/reports/accounts-receivable";

export default function CuentasPorCobrarPage() {
  const filters = useAtomValue(filtersAtom);
  const { data: accounts, isLoading } = useAccountsReceivable(filters);
  const { data: totalDebt } = useTotalAccountsReceivable();

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-stone-100">
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-orange-100">
        <div className="flex items-center gap-3 h-16 px-4">
          <Link to="/dashboard" className="p-2 -ml-2 rounded-xl hover:bg-orange-50">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="font-bold text-lg">Cuentas por Cobrar</h1>
        </div>
      </header>

      <main className="p-4 pb-24 space-y-4">
        <SummaryCard totalDebt={totalDebt} accounts={accounts} />
        <FilterCard />
        <AccountsList accounts={accounts} isLoading={isLoading} />
        <SummaryStats accounts={accounts} />
      </main>
    </div>
  );
}
