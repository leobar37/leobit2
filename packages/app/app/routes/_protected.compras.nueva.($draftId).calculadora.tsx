import { useNavigate, useParams, useLocation } from "react-router";
import { ArrowLeft } from "lucide-react";
import { PurchaseCalculatorContent } from "~/components/purchases/calculator";
import { MobileShell } from "~/components/mobile";

interface PreFilledItem {
  variantId: string;
  quantity: string;
}

export default function ComprasCalculadoraPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { draftId } = useParams<{ draftId: string }>();

  const preFilledItems = (location.state?.items as PreFilledItem[] | undefined) || [];

  const handleBack = () => {
    if (draftId) {
      navigate(`/compras/nueva/${draftId}`);
    } else {
      navigate("/compras/nueva");
    }
  };

  return (
    <MobileShell.Root variant="fullscreen" className="fixed inset-0 z-[60] app-shell">
      <MobileShell.Header>
        <div className="flex items-center h-16 px-3 sm:px-4">
          <button
            onClick={handleBack}
            className="shell-toolbar-button p-2 -ml-2 rounded-xl"
            aria-label="Volver"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="font-bold text-lg ml-1">Calculadora</h1>
        </div>
      </MobileShell.Header>

      <MobileShell.Content className="px-0 py-0">
        <PurchaseCalculatorContent 
          onAddedToCart={handleBack} 
          preFilledItems={preFilledItems}
        />
      </MobileShell.Content>
    </MobileShell.Root>
  );
}
