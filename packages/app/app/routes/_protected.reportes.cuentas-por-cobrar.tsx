import { useState } from "react";
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
  SendReminderModal,
} from "~/components/reports/accounts-receivable";
import { MobileSlot, MobilePage } from "~/components/mobile";
import type { AccountsReceivableItem } from "~/hooks/use-accounts-receivable";

export default function CuentasPorCobrarPage() {
  const filters = useAtomValue(filtersAtom);
  const { data: accounts = [], isLoading } = useAccountsReceivable(filters);
  const { data: totalDebt } = useTotalAccountsReceivable();

  const [selectedAccount, setSelectedAccount] = useState<AccountsReceivableItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleSendReminder = (account: AccountsReceivableItem) => {
    setSelectedAccount(account);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setTimeout(() => setSelectedAccount(null), 300);
  };

  return (
    <>
      <MobileSlot name="header:left" priority={10}>
        <Link
          to="/dashboard"
          className="shell-toolbar-button rounded-2xl p-2 -ml-2 text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-5 w-5 pointer-events-none" />
        </Link>
      </MobileSlot>
      <MobileSlot name="header:center" priority={10}>
        <h1 className="truncate font-bold text-lg tracking-tight">Cuentas por Cobrar</h1>
      </MobileSlot>

      <MobilePage.Root maxWidth="md" className="space-y-4">
        <SummaryCard totalDebt={totalDebt} accounts={accounts} />
        <FilterCard />
        <AccountsList
          accounts={accounts}
          isLoading={isLoading}
          onSendReminder={handleSendReminder}
        />
        <SummaryStats accounts={accounts} />
      </MobilePage.Root>

      <SendReminderModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        account={selectedAccount}
      />
    </>
  );
}
