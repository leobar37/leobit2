import { useState } from "react";
import { Navigate, useNavigate } from "react-router";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  CalculatorContent,
  type CalculatorFooterActions,
} from "~/components/sales/new-sale";
import { useNewSaleContext } from "~/components/sales/new-sale-context";
import { MobileShell } from "~/components/mobile";
import { getSaleEditorPath } from "~/lib/sales/navigation";

function SalesCalculatorFooter({
  actions,
}: {
  actions: CalculatorFooterActions;
}) {
  return (
    <div className="pointer-events-auto px-3 pb-3 sm:px-4">
      <div className="mx-auto max-w-lg">
        <div className="shell-surface rounded-[22px] border shell-divider p-2 shadow-[0_12px_28px_rgba(15,23,42,0.08)]">
          <div className="space-y-2">
            <Button
              onClick={actions.onPrimaryAction}
              disabled={actions.isPrimaryDisabled}
              className="h-12 w-full rounded-2xl bg-orange-500 text-white shadow-[0_14px_28px_rgba(249,115,22,0.2)] hover:bg-orange-600 disabled:border disabled:border-white/10 disabled:bg-white/[0.07] disabled:text-white/35 disabled:shadow-none"
            >
              {actions.primaryLabel}
            </Button>
            <Button
              variant="outline"
              onClick={actions.onSecondaryAction}
              className="h-12 w-full rounded-2xl border-white/15 bg-white/[0.04] text-white shadow-sm hover:bg-white/[0.08] hover:text-white"
            >
              {actions.secondaryLabel}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SaleEditorCalculatorPage() {
  const navigate = useNavigate();
  const { saleId, editingItemId, items } = useNewSaleContext();
  const [footerActions, setFooterActions] = useState<CalculatorFooterActions | null>(null);
  
  const editingItem = editingItemId ? items.find((i) => i.id === editingItemId) : null;

  if (!saleId) {
    return <Navigate to="/ventas" replace />;
  }

  const returnPath = getSaleEditorPath(saleId);

  return (
    <MobileShell.Root variant="fullscreen" className="fixed inset-0 z-[60] app-shell">
      <MobileShell.Header>
        <div className="flex h-16 items-center px-3 sm:px-4">
          <button
            onClick={() => navigate(returnPath)}
            className="shell-toolbar-button rounded-2xl p-2 -ml-2 text-muted-foreground transition-colors hover:text-foreground"
            aria-label="Volver"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="ml-1 text-lg font-bold tracking-tight">
            {editingItem ? "Editar Producto" : "Calculadora"}
          </h1>
        </div>
      </MobileShell.Header>

      <MobileShell.Content className="flex flex-1 flex-col overflow-hidden px-0 py-0">
        <CalculatorContent
          key={editingItemId || "new"}
          returnPath={returnPath}
          onActionsChange={setFooterActions}
        />
      </MobileShell.Content>
      <MobileShell.Footer>
        {footerActions ? <SalesCalculatorFooter actions={footerActions} /> : null}
      </MobileShell.Footer>
    </MobileShell.Root>
  );
}
