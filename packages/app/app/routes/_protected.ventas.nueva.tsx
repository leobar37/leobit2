import { Link } from "react-router";
import { ArrowLeft } from "lucide-react";
import {
  CalculatorSection,
  CartSection,
  CustomerSection,
  NewSaleProvider,
  PaymentModeSection,
  SaleSummaryCard,
  SubmitSaleButton,
} from "~/components/sales/new-sale";

export default function NewSalePage() {
  return (
    <NewSaleProvider>
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-stone-100">
        <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-orange-100">
          <div className="flex items-center gap-3 h-16 px-3 sm:px-4">
            <Link to="/dashboard" className="p-2 -ml-2 rounded-xl hover:bg-orange-50">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <h1 className="font-bold text-lg">Nueva Venta</h1>
          </div>
        </header>

        <main className="px-3 py-4 sm:px-4 pb-32 space-y-4">
          <CustomerSection />
          <PaymentModeSection />
          <CalculatorSection />
          <CartSection />
          <SaleSummaryCard />
        </main>

        <SubmitSaleButton />
      </div>
    </NewSaleProvider>
  );
}
